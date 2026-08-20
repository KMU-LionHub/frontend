import { useState } from "react";
import { signup } from "../api/authApi";
import "./AuthPage.css";

function SignupPage({ onGoLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signup(
        email,
        password,
        nickname
      );

      window.alert(
        "회원가입이 완료되었습니다."
      );
      onGoLogin?.();
    } catch (err) {
      console.error("회원가입 실패:", err);
      setError(
        err.message ||
          "회원가입에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <main
        className="auth-card"
        aria-labelledby="signup-title"
      >
        <header className="auth-card-header">
          <div
            className="auth-logo"
            aria-hidden="true"
          >
            <span />
          </div>

          <h1 id="signup-title">
            회원가입
          </h1>

          <p>Context STT 계정을 생성합니다.</p>
        </header>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="auth-field">
            <label htmlFor="signup-email">
              이메일
            </label>

            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="user@example.com"
              maxLength={100}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">
              비밀번호
            </label>

            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="비밀번호"
              aria-describedby="signup-password-hint"
              minLength={8}
              maxLength={64}
              required
            />

            <p
              id="signup-password-hint"
              className="auth-field-hint"
            >
              8~64자, 영문과 숫자를 포함해주세요.
            </p>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-nickname">
              닉네임
            </label>

            <input
              id="signup-nickname"
              name="nickname"
              type="text"
              autoComplete="nickname"
              value={nickname}
              onChange={(event) =>
                setNickname(event.target.value)
              }
              placeholder="닉네임"
              minLength={2}
              maxLength={20}
              required
            />
          </div>

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-button"
            disabled={loading}
          >
            {loading
              ? "가입 중..."
              : "회원가입"}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch-button"
          onClick={onGoLogin}
        >
          이미 계정이 있으신가요? 로그인
        </button>
      </main>
    </div>
  );
}

export default SignupPage;
