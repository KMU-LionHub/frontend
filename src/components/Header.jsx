import { LogOut, User } from "lucide-react";
import {
  RecordingPhase,
} from "../workflow/recordingWorkflow";

function Header({
  workflowStatus =
    RecordingPhase.IDLE,
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

  const workflowLabel =
    getWorkflowLabel(
      workflowStatus
    );

  return (
    <header className="dashboard-header">

      {/* 왼쪽 */}
      <div className="header-title-area">

        <h1>
          정보 손실 없는 대화 도우미
        </h1>

        {workflowLabel && (
          <div className="recording-status">

            <span className="recording-dot" />

            {workflowLabel}

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

function getWorkflowLabel(status) {
  switch (status) {
    case RecordingPhase.REQUESTING_PERMISSION:
      return "마이크 준비 중";
    case RecordingPhase.RECORDING:
      return "녹음 중";
    case RecordingPhase.TRANSCRIBING:
    case RecordingPhase.PREPARING_TRANSCRIPT:
      return "음성 처리 중";
    case RecordingPhase.UPDATING_TRANSCRIPT:
      return "단어 수정 중";
    case RecordingPhase.CONFIRMING_UTTERANCE:
      return "발언 확정 중";
    case RecordingPhase.ANALYZING:
      return "AI 분석 중";
    default:
      return "";
  }
}

export default Header;
