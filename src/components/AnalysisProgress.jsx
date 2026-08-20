import { BrainCircuit } from "lucide-react";

function AnalysisProgress({
  progress = 0,
  status = "IDLE",
}) {
  // 혹시 백엔드에서 이상한 값이 와도
  // 0~100 사이로 제한
  const safeProgress = Math.min(
    100,
    Math.max(0, Number(progress) || 0)
  );

  const statusText = getStatusText(status);

  return (
    <section className="dashboard-card analysis-progress-panel">
      {/* 상단 */}
      <div className="panel-heading-row">
        <div>
          <h2>분석 진행 상태</h2>

          <p>
            녹음 처리와 맥락 분석 단계를
            확인할 수 있습니다.
          </p>
        </div>

        <div
          aria-live="polite"
          className={
            status === "COMPLETED"
              ? "analysis-badge completed"
              : "analysis-badge"
          }
        >
          <BrainCircuit
            size={15}
            strokeWidth={2}
          />

          {statusText}
        </div>
      </div>

      {/* 원형 진행률 */}
      <div className="progress-circle-wrapper">
        <div
          className="progress-circle"
          role="progressbar"
          aria-label="녹음 및 분석 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={
            Math.round(safeProgress)
          }
          style={{
            "--progress": `${safeProgress * 3.6}deg`,
          }}
        >
          <div className="progress-circle-inner">
            <strong>
              {Math.round(safeProgress)}%
            </strong>
          </div>
        </div>
      </div>

      {/* 아래 진행률 */}
      <div className="progress-bottom">
        <div className="progress-label-row">
          <span>분석 진행률</span>

          <strong>
            {Math.round(safeProgress)}%
          </strong>
        </div>

        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${safeProgress}%`,
            }}
          />
        </div>

        <p className="analysis-status-text">
          {getDetailedStatus(status)}
        </p>
      </div>
    </section>
  );
}

function getStatusText(status) {
  switch (status) {
    case "REQUESTING_PERMISSION":
      return "마이크 준비";

    case "RECORDING":
      return "녹음 중";

    case "TRANSCRIBING":
      return "음성 인식 중";

    case "PREPARING_ANALYSIS":
      return "분석 준비 중";

    case "ANALYZING":
      return "AI 분석 중";

    case "COMPLETED":
      return "분석 완료";

    case "FAILED":
      return "분석 실패";

    default:
      return "분석 대기";
  }
}

function getDetailedStatus(status) {
  switch (status) {
    case "REQUESTING_PERMISSION":
      return "브라우저의 마이크 사용 권한을 확인하고 있습니다.";

    case "RECORDING":
      return "음성을 녹음하고 있습니다. 완료하려면 정지 버튼을 눌러주세요.";

    case "TRANSCRIBING":
      return "음성을 텍스트로 변환하고 있습니다.";

    case "PREPARING_ANALYSIS":
      return "전사 결과를 대화 발언으로 준비하고 있습니다.";

    case "ANALYZING":
      return "발언의 의미와 맥락 후보를 분석하고 있습니다.";

    case "COMPLETED":
      return "모든 분석이 완료되었습니다.";

    case "FAILED":
      return "분석 처리 중 문제가 발생했습니다.";

    default:
      return "녹음을 완료하면 AI 분석이 시작됩니다.";
  }
}

export default AnalysisProgress;
