import { useState } from "react";
import { signup } from "../api/authApi";

function SignupPage({ onGoLogin }) {
  // =========================
  // 입력값
  // =========================

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [nickname, setNickname] =
    useState("");

  // =========================
  // 상태
  // =========================

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  // =========================
  // 회원가입
  // =========================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 기존 오류 제거
    setError("");

    // 중복 클릭 방지
    setLoading(true);

    try {
      await signup(
        email,
        password,
        nickname
      );

      alert(
        "회원가입이 완료되었습니다."
      );

      // 회원가입 성공하면 로그인 화면으로 이동
      onGoLogin();
    } catch (err) {
      console.error(
        "회원가입 실패:",
        err
      );

      // authApi.js에서 throw한
      // 실제 백엔드 오류 메시지 표시
      setError(
        err.message ||
          "회원가입에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* 로고 */}

        <div style={styles.logo}>
          <div
            style={styles.logoCircle}
          />
        </div>

        {/* 제목 */}

        <h1 style={styles.title}>
          회원가입
        </h1>

        <p style={styles.subtitle}>
          Context STT 계정을 생성합니다.
        </p>

        {/* 회원가입 폼 */}

        <form
          onSubmit={handleSubmit}
          style={styles.form}
        >
          {/* 이메일 */}

          <label style={styles.label}>
            이메일
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="user@example.com"
            style={styles.input}
            required
          />

          {/* 비밀번호 */}

          <label style={styles.label}>
            비밀번호
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            placeholder="비밀번호"
            style={styles.input}
            required
          />

          {/* 닉네임 */}

          <label style={styles.label}>
            닉네임
          </label>

          <input
            type="text"
            value={nickname}
            onChange={(e) =>
              setNickname(
                e.target.value
              )
            }
            placeholder="닉네임"
            style={styles.input}
            required
          />

          {/* =====================
              에러 메시지
          ====================== */}

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {/* 회원가입 버튼 */}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,

              opacity: loading
                ? 0.7
                : 1,

              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "가입 중..."
              : "회원가입"}
          </button>
        </form>

        {/* 로그인 화면 이동 */}

        <button
          type="button"
          onClick={onGoLogin}
          style={styles.loginLink}
        >
          이미 계정이 있으신가요? 로그인
        </button>
      </div>
    </div>
  );
}

// =========================
// 스타일
// =========================

const styles = {
  page: {
    minHeight: "100vh",

    display: "flex",
    justifyContent: "center",
    alignItems: "center",

    background: "#f7f7ff",

    padding: "20px",
  },

  card: {
    width: "100%",
    maxWidth: "420px",

    background: "#ffffff",

    padding: "42px",

    borderRadius: "20px",

    boxShadow:
      "0 20px 60px rgba(0,0,0,0.08)",
  },

  logo: {
    width: "52px",
    height: "52px",

    borderRadius: "14px",

    background: "#6659ed",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    marginBottom: "30px",
  },

  logoCircle: {
    width: "18px",
    height: "18px",

    border: "3px solid white",

    borderRadius: "50%",
  },

  title: {
    textAlign: "center",

    fontSize: "30px",

    marginBottom: "8px",

    color: "#111",
  },

  subtitle: {
    textAlign: "center",

    color: "#92929f",

    marginBottom: "38px",
  },

  form: {
    display: "flex",
    flexDirection: "column",
  },

  label: {
    textAlign: "center",

    fontWeight: "600",

    marginBottom: "10px",

    color: "#20202a",
  },

  input: {
    height: "54px",

    padding: "0 16px",

    border:
      "1px solid #dedee8",

    borderRadius: "12px",

    fontSize: "16px",

    marginBottom: "22px",

    outline: "none",
  },

  // =========================
  // 백엔드 오류 표시
  // =========================

  error: {
    padding: "14px",

    marginBottom: "20px",

    background: "#fff0f0",

    color: "#ff5252",

    borderRadius: "10px",

    textAlign: "center",

    fontSize: "14px",

    // errors 배열에 여러 오류가 있을 경우
    // 줄바꿈해서 보여줌
    whiteSpace: "pre-line",

    lineHeight: "1.6",
  },

  button: {
    height: "54px",

    border: "none",

    borderRadius: "12px",

    background: "#6659ed",

    color: "white",

    fontSize: "17px",

    fontWeight: "700",

    marginTop: "4px",
  },

  loginLink: {
    width: "100%",

    marginTop: "24px",

    border: "none",

    background: "transparent",

    color: "#6659ed",

    cursor: "pointer",

    fontSize: "14px",
  },
};

export default SignupPage;