const API_BASE_URL = "http://localhost:8080";

// ========================================
// 오류 메시지 처리
// ========================================

function getErrorMessage(data, defaultMessage) {
  if (
    !Array.isArray(data.errors) ||
    data.errors.length === 0
  ) {
    return data.message || defaultMessage;
  }

  const fieldErrors = {};
  const generalErrors = [];

  data.errors.forEach((error) => {
    if (typeof error !== "string") {
      return;
    }

    const colonIndex = error.indexOf(":");

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

  generalErrors.forEach((error) => {
    messages.push(error);
  });

  if (messages.length > 0) {
    return messages.join("\n");
  }

  return data.message || defaultMessage;
}

// ========================================
// 로그인
// ========================================

export async function login(email, password) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        "로그인에 실패했습니다."
      )
    );
  }

  // JWT 저장
  if (data.token?.accessToken) {
    localStorage.setItem(
      "accessToken",
      data.token.accessToken
    );
  }

  // ★ 사용자 정보도 같이 저장
  if (data.user) {
    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );
  }

  return data;
}

// ========================================
// 회원가입
// ========================================

export async function signup(
  email,
  password,
  nickname
) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/signup`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        email,
        password,
        nickname,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        "회원가입에 실패했습니다."
      )
    );
  }

  return data;
}

// ========================================
// JWT 가져오기
// ========================================

export function getAccessToken() {
  return localStorage.getItem(
    "accessToken"
  );
}

// ========================================
// 저장된 사용자 가져오기
// ========================================

export function getStoredUser() {
  const user =
    localStorage.getItem("user");

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

// ========================================
// 로그아웃
// ========================================

export function logout() {
  localStorage.removeItem(
    "accessToken"
  );

  localStorage.removeItem(
    "user"
  );
}