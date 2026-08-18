import { useState } from "react";
import { login } from "../api/authApi";

function LoginPage({
  onLoginSuccess,
  onGoSignup,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const data = await login(email, password);

      onLoginSuccess(data.user);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>◉</div>

        <h1 style={styles.title}>
          Context STT
        </h1>

        <p style={styles.description}>
          정보 손실 없는 대화 도우미
        </p>

        <form
          onSubmit={handleSubmit}
          style={styles.form}
        >
          <div>
            <label style={styles.label}>
              이메일
            </label>

            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              style={styles.input}
              required
            />
          </div>

          <div>
            <label style={styles.label}>
              비밀번호
            </label>

            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              style={styles.input}
              required
            />
          </div>

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading
              ? "로그인 중..."
              : "로그인"}
          </button>
        </form>

        <button
          type="button"
          onClick={onGoSignup}
          style={styles.linkButton}
        >
          계정이 없으신가요? 회원가입
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f6fb",
  },

  card: {
    width: "390px",
    padding: "48px 42px",
    background: "#ffffff",
    border: "1px solid #e7e7ef",
    borderRadius: "24px",
    boxShadow:
      "0 20px 60px rgba(30, 25, 80, 0.08)",
  },

  logo: {
    width: "52px",
    height: "52px",
    borderRadius: "16px",
    background: "#6759ed",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontSize: "25px",
    marginBottom: "22px",
  },

  title: {
    margin: 0,
    fontSize: "28px",
  },

  description: {
    marginTop: "8px",
    marginBottom: "34px",
    color: "#8b8c99",
    fontSize: "14px",
  },

  form: {
    display: "grid",
    gap: "20px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "13px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    height: "48px",
    padding: "0 14px",
    border: "1px solid #dedee8",
    borderRadius: "11px",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
  },

  button: {
    height: "50px",
    border: 0,
    borderRadius: "11px",
    background: "#6759ed",
    color: "white",
    fontWeight: "700",
    cursor: "pointer",
  },

  error: {
    padding: "11px 13px",
    borderRadius: "9px",
    background: "#fff0f1",
    color: "#d94b5a",
    fontSize: "12px",
  },

  linkButton: {
    marginTop: "18px",
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#6759ed",
    cursor: "pointer",
    fontSize: "13px",
  },
};

export default LoginPage;