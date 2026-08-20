import { apiRequest } from "./apiClient";
import {
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  storeAuthSession,
} from "./authStorage";

export async function login(
  email,
  password
) {
  const data = await apiRequest(
    "/api/auth/login",
    {
      auth: false,
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
      defaultErrorMessage:
        "로그인에 실패했습니다.",
      formatError: getAuthErrorMessage,
    }
  );

  const accessToken =
    data.token?.accessToken;

  if (!accessToken || !data.user) {
    throw new Error(
      "로그인 응답에 인증 정보가 없습니다."
    );
  }

  storeAuthSession({
    accessToken,
    user: data.user,
  });

  return data;
}

export async function signup(
  email,
  password,
  nickname
) {
  return apiRequest(
    "/api/auth/signup",
    {
      auth: false,
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        nickname,
      }),
      defaultErrorMessage:
        "회원가입에 실패했습니다.",
      formatError: getAuthErrorMessage,
    }
  );
}

export {
  getAccessToken,
  getStoredUser,
};

export const logout = clearAuthSession;

function getAuthErrorMessage(
  data,
  defaultMessage
) {
  if (
    !Array.isArray(data?.errors) ||
    data.errors.length === 0
  ) {
    return data?.message || defaultMessage;
  }

  const fieldErrors = {};
  const generalErrors = [];

  data.errors.forEach((error) => {
    if (typeof error !== "string") {
      return;
    }

    const colonIndex =
      error.indexOf(":");

    if (colonIndex === -1) {
      generalErrors.push(error);
      return;
    }

    const field = error
      .slice(0, colonIndex)
      .trim();
    const message = error
      .slice(colonIndex + 1)
      .trim();

    if (!fieldErrors[field]) {
      fieldErrors[field] = [];
    }

    fieldErrors[field].push(message);
  });

  const messages = [];

  if (fieldErrors.password) {
    messages.push(
      "비밀번호는 8~64자의 영문과 숫자를 포함해야 합니다."
    );
  }

  if (fieldErrors.email) {
    messages.push(
      "올바른 이메일 형식을 입력해주세요."
    );
  }

  if (fieldErrors.nickname) {
    messages.push(
      fieldErrors.nickname.join(" ")
    );
  }

  Object.entries(fieldErrors).forEach(
    ([field, errors]) => {
      if (
        field === "password" ||
        field === "email" ||
        field === "nickname"
      ) {
        return;
      }

      messages.push(errors.join(" "));
    }
  );

  messages.push(...generalErrors);

  return (
    messages.join("\n") ||
    data?.message ||
    defaultMessage
  );
}
