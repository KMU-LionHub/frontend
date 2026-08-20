import {
  clearAuthSession,
  getAccessToken,
} from "./authStorage";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080"
).replace(/\/+$/, "");

const authExpirationListeners =
  new Set();

export class ApiError extends Error {
  constructor(
    message,
    {
      status = 0,
      data = null,
      retryAfter = null,
      cause,
    } = {}
  ) {
    super(message, { cause });
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.retryAfter = retryAfter;
  }
}

export function subscribeToAuthExpiration(
  listener
) {
  authExpirationListeners.add(listener);

  return () => {
    authExpirationListeners.delete(
      listener
    );
  };
}

export async function apiRequest(
  path,
  {
    auth = true,
    defaultErrorMessage =
      "요청에 실패했습니다.",
    formatError,
    ...options
  } = {}
) {
  const headers = new Headers(
    options.headers || {}
  );

  if (auth) {
    const accessToken =
      getAccessToken();

    if (!accessToken) {
      clearAuthSession();
      notifyAuthExpiration();
      throw new ApiError(
        "로그인이 필요합니다.",
        { status: 401 }
      );
    }

    headers.set(
      "Authorization",
      `Bearer ${accessToken}`
    );
  }

  let response;

  try {
    response = await fetch(
      resolveApiUrl(path),
      {
        ...options,
        headers,
      }
    );
  } catch (cause) {
    throw new ApiError(
      "서버에 연결할 수 없습니다.",
      { cause }
    );
  }

  const data =
    await readResponseBody(response);

  if (response.status === 401 && auth) {
    clearAuthSession();
    notifyAuthExpiration();

    throw new ApiError(
      "로그인이 만료되었습니다. 다시 로그인해주세요.",
      {
        status: response.status,
        data,
      }
    );
  }

  if (!response.ok) {
    const formattedMessage =
      formatError?.(
        data,
        defaultErrorMessage
      );

    throw new ApiError(
      formattedMessage ||
        getErrorMessage(
          data,
          defaultErrorMessage,
          response.status
        ),
      {
        status: response.status,
        data,
        retryAfter:
          response.headers.get(
            "retry-after"
          ),
      }
    );
  }

  return data;
}

function resolveApiUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
}

function notifyAuthExpiration() {
  authExpirationListeners.forEach(
    (listener) => listener()
  );
}

function getErrorMessage(
  data,
  defaultMessage,
  status
) {
  if (data?.message) {
    return data.message;
  }

  if (Array.isArray(data?.errors)) {
    const errors = data.errors.filter(
      (error) =>
        typeof error === "string"
    );

    if (errors.length > 0) {
      return errors.join(", ");
    }
  }

  return (
    defaultMessage ||
    `요청에 실패했습니다. HTTP ${status}`
  );
}

async function readResponseBody(response) {
  if (response.status === 204) {
    return {};
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  const text = await response.text();

  return text
    ? { message: text }
    : {};
}
