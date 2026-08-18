const API_BASE_URL = "http://localhost:8080";

// ========================================
// 백엔드 오류 메시지 처리
// ========================================

function getErrorMessage(data, defaultMessage) {
  // errors가 없거나 배열이 아니면
  // 백엔드의 message 사용
  if (
    !Array.isArray(data.errors) ||
    data.errors.length === 0
  ) {
    return data.message || defaultMessage;
  }

  // 필드별 오류를 저장할 객체
  //
  // 예:
  // {
  //   password: [
  //     "비밀번호는 8자 이상 64자 이하여야 합니다.",
  //     "비밀번호는 영문과 숫자를 포함해야 합니다."
  //   ]
  // }
  const fieldErrors = {};

  // 필드가 없는 일반 오류
  const generalErrors = [];

  data.errors.forEach((error) => {
    // 문자열이 아닌 경우
    if (typeof error !== "string") {
      return;
    }

    // "password: 오류 내용"
    // 에서 : 위치 찾기
    const colonIndex = error.indexOf(":");

    // : 가 없는 오류라면
    // 일반 오류로 처리
    if (colonIndex === -1) {
      generalErrors.push(error);
      return;
    }

    // password
    const field = error
      .slice(0, colonIndex)
      .trim();

    // 실제 오류 메시지
    const message = error
      .slice(colonIndex + 1)
      .trim();

    // 해당 필드 배열이 없으면 생성
    if (!fieldErrors[field]) {
      fieldErrors[field] = [];
    }

    fieldErrors[field].push(message);
  });

  const messages = [];

  // ========================================
  // 비밀번호 오류
  // ========================================

  if (fieldErrors.password) {
    /*
      백엔드에서는 예를 들어

      password: 비밀번호는 8자 이상 64자 이하여야 합니다.
      password: 비밀번호는 영문과 숫자를 포함해야 합니다.

      이렇게 두 개를 보내지만

      사용자에게는 하나로 합쳐서 보여준다.
    */

    messages.push(
      "비밀번호는 8~64자의 영문과 숫자를 포함해야 합니다."
    );
  }

  // ========================================
  // 이메일 오류
  // ========================================

  if (fieldErrors.email) {
    messages.push(
      "올바른 이메일 형식을 입력해주세요."
    );
  }

  // ========================================
  // 닉네임 오류
  // ========================================

  if (fieldErrors.nickname) {
    // 닉네임은 백엔드 오류 내용을 그대로 사용
    messages.push(
      fieldErrors.nickname.join(" ")
    );
  }

  // ========================================
  // 예상하지 못한 다른 필드 오류
  // ========================================

  Object.entries(fieldErrors).forEach(
    ([field, errors]) => {
      // 이미 위에서 처리한 필드는 제외
      if (
        field === "password" ||
        field === "email" ||
        field === "nickname"
      ) {
        return;
      }

      messages.push(
        errors.join(" ")
      );
    }
  );

  // ========================================
  // 필드가 없는 일반 오류 추가
  // ========================================

  generalErrors.forEach((error) => {
    messages.push(error);
  });

  // 처리된 오류가 하나라도 있으면
  // 줄바꿈으로 연결
  if (messages.length > 0) {
    return messages.join("\n");
  }

  // 예상하지 못한 응답이면
  // 백엔드 message 사용
  return data.message || defaultMessage;
}

// ========================================
// 로그인
// ========================================

export async function login(
  email,
  password
) {
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

  // ========================================
  // 로그인 실패
  // ========================================

  if (!response.ok) {
    const errorMessage =
      getErrorMessage(
        data,
        "로그인에 실패했습니다."
      );

    throw new Error(errorMessage);
  }

  // ========================================
  // 로그인 성공
  // ========================================

  /*
    백엔드 응답:

    {
      "token": {
        "accessToken": "...",
        "tokenType": "Bearer",
        "expiresInSeconds": 3600
      },

      "user": {
        "id": 1,
        "email": "user@example.com",
        "nickname": "사용자"
      }
    }
  */

  // JWT가 존재하면 브라우저에 저장
  if (data.token?.accessToken) {
    localStorage.setItem(
      "accessToken",
      data.token.accessToken
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

  // ========================================
  // 회원가입 실패
  // ========================================

  if (!response.ok) {
    const errorMessage =
      getErrorMessage(
        data,
        "회원가입에 실패했습니다."
      );

    throw new Error(errorMessage);
  }

  // ========================================
  // 회원가입 성공
  // ========================================

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
// 로그아웃
// ========================================

export function logout() {
  // 브라우저에 저장된 JWT 삭제
  localStorage.removeItem(
    "accessToken"
  );
}