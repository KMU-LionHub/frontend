import { useState } from "react";
import { login } from "../api/authApi";
import "./AuthPage.css";

function LoginPage({
  onLoginSuccess,
  onGoSignup,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await login(email, password);
      onLoginSuccess?.(data.user);
    } catch (err) {
      console.error("로그인 실패:", err);
      setError(
        err.message ||
          "로그인에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <main
        className="auth-card"
        aria-labelledby="login-title"
      >
        <header className="auth-card-header">
          <div
            className="auth-logo"
            aria-hidden="true"
          >
            <span />
          </div>

          <h1 id="login-title">
            Context STT
          </h1>

          <p>정보 손실 없는 대화 도우미</p>
        </header>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="auth-field">
            <label htmlFor="login-email">
              이메일
            </label>

            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="user@example.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              maxLength={100}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">
              비밀번호
            </label>

            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              maxLength={64}
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
              ? "로그인 중..."
              : "로그인"}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch-button"
          onClick={onGoSignup}
        >
          계정이 없으신가요? 회원가입
        </button>
      </main>
    </div>
  );
}

export default LoginPage;
