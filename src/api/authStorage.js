const ACCESS_TOKEN_KEY = "accessToken";
const USER_KEY = "user";

export function getAccessToken() {
  return window.localStorage.getItem(
    ACCESS_TOKEN_KEY
  );
}

export function getStoredUser() {
  const storedUser =
    window.localStorage.getItem(
      USER_KEY
    );

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    window.localStorage.removeItem(
      USER_KEY
    );
    return null;
  }
}

export function storeAuthSession({
  accessToken,
  user,
}) {
  if (accessToken) {
    window.localStorage.setItem(
      ACCESS_TOKEN_KEY,
      accessToken
    );
  }

  if (user) {
    window.localStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );
  }
}

export function clearAuthSession() {
  window.localStorage.removeItem(
    ACCESS_TOKEN_KEY
  );
  window.localStorage.removeItem(
    USER_KEY
  );
}
