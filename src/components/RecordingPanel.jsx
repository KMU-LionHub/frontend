import {
  Mic,
  Square,
} from "lucide-react";

function RecordingPanel({
  isRecording,
  isProcessing = false,
  canRecord = true,
  disabledReason = "",
  elapsedTime,
  transcript,
  onRecordToggle,
}) {
  return (
    <section className="dashboard-card recording-panel">
      {/* 상단 제목 */}
      <div className="panel-heading-row">
        <div>
          <h2>음성 녹음</h2>

          <p>
            녹음을 마치면 음성을 텍스트로 변환한 뒤
            단어별 결과를 검토할 수 있습니다.
          </p>
        </div>

        <div
          className={
            isRecording
              ? "listening-badge active"
              : "listening-badge"
          }
        >
          <span />

          {isRecording
            ? "AI가 듣고 있어요"
            : isProcessing
              ? "음성 처리 중"
              : !canRecord
                ? "녹음 준비 필요"
            : "녹음 대기"}
        </div>
      </div>

      {/* 녹음 컨트롤 */}
      <div className="recording-control-row">
        <button
          type="button"
          className={
            isRecording
              ? "record-circle active"
              : isProcessing
                ? "record-circle processing"
                : "record-circle"
          }
          onClick={onRecordToggle}
          disabled={
            isProcessing ||
            (
              !isRecording &&
              !canRecord
            )
          }
          aria-label={
            isRecording
              ? "녹음 종료"
              : isProcessing
                ? "녹음 처리 중"
                : !canRecord
                  ? "녹음 준비 필요"
              : "녹음 시작"
          }
        >
          {isRecording ? (
            <Square
              size={24}
              strokeWidth={2}
            />
          ) : (
            <Mic
              size={28}
              strokeWidth={2}
            />
          )}
        </button>

        <div className="recording-time-area">
          <div className="recording-time-line">
            <strong>
              {formatTime(elapsedTime)}
            </strong>

            {isRecording && (
              <span className="rec-badge">
                REC
              </span>
            )}
          </div>

          <p>
            {isRecording
              ? "다시 마이크를 누르면 녹음을 종료합니다."
              : isProcessing
                ? "음성을 처리하고 있습니다. 잠시만 기다려주세요."
                : !canRecord
                  ? disabledReason
                : "마이크 버튼을 눌러 대화를 녹음해주세요."}
          </p>
        </div>
      </div>

      {/* 실시간 자막 */}
      <div className="live-transcript-box">
        {transcript ? (
          transcript
        ) : isRecording ? (
          "녹음 중입니다. 종료하면 자막이 표시됩니다."
        ) : isProcessing ? (
          "녹음된 음성을 텍스트로 변환하고 있습니다."
        ) : !canRecord ? (
          disabledReason
        ) : (
          "녹음을 완료하면 이곳에 변환된 자막이 표시됩니다."
        )}
      </div>

      {/* 오디오 파형 */}
      <div
        aria-hidden="true"
        className={
          isRecording
            ? "waveform active"
            : "waveform"
        }
      >
        {waveHeights.map(
          (height, index) => (
            <span
              key={index}
              style={{
                height: `${height}px`,
                animationDelay: `${
                  index * 0.04
                }s`,
              }}
            />
          )
        )}
      </div>
    </section>
  );
}

function formatTime(seconds = 0) {
  const safeSeconds =
    Number.isFinite(seconds)
      ? Math.max(
          0,
          Math.floor(seconds)
        )
      : 0;

  const minutes = Math.floor(
    safeSeconds / 60
  );

  const remainingSeconds =
    safeSeconds % 60;

  return `00:${String(
    minutes
  ).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

const waveHeights = [
  18,
  30,
  42,
  28,
  50,
  37,
  56,
  32,
  47,
  62,
  38,
  54,
  30,
  44,
  58,
  34,
  49,
  26,
  40,
  52,
  31,
  46,
  24,
  36,
];

export default RecordingPanel;
