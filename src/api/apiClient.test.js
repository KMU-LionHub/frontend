import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  apiRequest,
  subscribeToAuthExpiration,
} from "./apiClient";
import {
  getAccessToken,
  getStoredUser,
  storeAuthSession,
} from "./authStorage";

describe("apiRequest", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("adds the stored access token", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValue(
        jsonResponse(200, {
          id: 10,
        })
      );

    storeAuthSession({
      accessToken: "access-token",
      user: {
        id: 1,
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/api/example")
    ).resolves.toEqual({ id: 10 });

    const [url, options] =
      fetchMock.mock.calls[0];

    expect(url).toBe(
      "http://localhost:8080/api/example"
    );
    expect(
      options.headers.get(
        "Authorization"
      )
    ).toBe("Bearer access-token");
  });

  it("clears the session and notifies on 401", async () => {
    const onExpiration = vi.fn();
    const unsubscribe =
      subscribeToAuthExpiration(
        onExpiration
      );

    storeAuthSession({
      accessToken: "expired-token",
      user: {
        id: 1,
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(401, {
          message: "Unauthorized",
        })
      )
    );

    await expect(
      apiRequest("/api/protected")
    ).rejects.toMatchObject({
      status: 401,
      message:
        "로그인이 만료되었습니다. 다시 로그인해주세요.",
    });

    expect(getAccessToken()).toBeNull();
    expect(onExpiration).toHaveBeenCalledOnce();

    unsubscribe();
  });

  it("does not attach auth to public requests", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValue(
        jsonResponse(200, {
          ok: true,
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/api/public", {
      auth: false,
    });

    const [, options] =
      fetchMock.mock.calls[0];

    expect(
      options.headers.has(
        "Authorization"
      )
    ).toBe(false);
  });

  it("clears stale user data when the token is missing", async () => {
    const onExpiration = vi.fn();
    const unsubscribe =
      subscribeToAuthExpiration(
        onExpiration
      );
    const fetchMock = vi.fn();

    storeAuthSession({
      user: {
        id: 1,
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/api/protected")
    ).rejects.toMatchObject({
      status: 401,
      message: "로그인이 필요합니다.",
    });

    expect(getStoredUser()).toBeNull();
    expect(onExpiration).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();

    unsubscribe();
  });
});

function jsonResponse(status, body) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type":
          "application/json",
      },
    }
  );
}
