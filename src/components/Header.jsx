import { LogOut, User } from "lucide-react";

function Header({
  isRecording = false,
  isProcessing = false,
  nickname,
  email,
  onLogout,
}) {
  const displayNickname =
    nickname ||
    localStorage.getItem("nickname") ||
    "사용자";

  const displayEmail =
    email ||
    localStorage.getItem("email") ||
    "Context STT";

  return (
    <header className="dashboard-header">

      {/* 왼쪽 */}
      <div className="header-title-area">

        <h1>
          정보 손실 없는 대화 도우미
        </h1>

        {(isRecording ||
          isProcessing) && (
          <div className="recording-status">

            <span className="recording-dot" />

            {isRecording
              ? "녹음 중"
              : "음성 처리 중"}

          </div>
        )}

      </div>

      {/* 오른쪽 사용자 정보 */}
      <div className="header-user-area">

        <div className="header-user-icon">
          <User size={21} />
        </div>

        <div className="header-user-info">

          <strong>
            {displayNickname}
          </strong>

          <span>
            {displayEmail}
          </span>

        </div>

        <button
          type="button"
          className="header-logout-button"
          onClick={onLogout}
          title="로그아웃"
        >
          <LogOut size={17} />
        </button>

      </div>

    </header>
  );
}

export default Header;
