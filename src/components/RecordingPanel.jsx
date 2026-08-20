import {
  Mic,
  Square,
} from "lucide-react";

function RecordingPanel({
  isRecording,
  elapsedTime,
  transcript,
  onRecordToggle,
}) {
  return (
    <section className="dashboard-card recording-panel">
      {/* 상단 제목 */}
      <div className="panel-heading-row">
        <div>
          <h2>실시간 자막 & 오디오 컨트롤</h2>

          <p>
            음성이 인지되면 실시간으로 자막 텍스트와
            파형이 갱신됩니다.
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
              : "record-circle"
          }
          onClick={onRecordToggle}
          aria-label={
            isRecording
              ? "녹음 종료"
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
              ? "다시 마이크를 누르면 녹음이 종료되고 AI 요약 및 분석이 진행됩니다."
              : "마이크 버튼을 눌러 대화를 녹음해주세요."}
          </p>
        </div>
      </div>

      {/* 실시간 자막 */}
      <div className="live-transcript-box">
        {transcript ? (
          transcript
        ) : isRecording ? (
          "음성을 듣고 있습니다..."
        ) : (
          "녹음을 시작하면 이곳에 실시간 자막이 표시됩니다."
        )}
      </div>

      {/* 오디오 파형 */}
      <div
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