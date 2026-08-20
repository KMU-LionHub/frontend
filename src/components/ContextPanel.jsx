import {
  Ban,
  BrainCircuit,
  Check,
  CheckCircle2,
  CircleCheck,
  MessageSquareText,
  Pencil,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import {
  ContextResolutionType,
} from "../api/contextAnalysisApi";

function ContextPanel({
  analysis = null,
  onResolveAmbiguity,
  resolvingAmbiguityId = null,
  analysisCompleted = false,
  isAnalyzing = false,
  awaitingTranscriptReview = false,
  readOnly = false,
}) {
  const ambiguities =
    Array.isArray(analysis?.ambiguities)
      ? analysis.ambiguities
      : [];
  const resolvedCount =
    ambiguities.filter(
      (ambiguity) =>
        ambiguity.selection != null
    ).length;

  return (
    <section className="dashboard-card context-panel">
      <div className="panel-heading-row context-panel-heading">
        <div>
          <div className="panel-title-with-icon">
            <BrainCircuit
              size={20}
              strokeWidth={1.8}
            />
            <h2>AI 맥락 후보 분석</h2>
          </div>

          <p>
            모호한 단어 구간마다 실제 의도와 가까운
            의미를 독립적으로 확정합니다.
          </p>
        </div>

        {ambiguities.length > 0 && (
          <div className="context-count-badge">
            <Sparkles size={14} />
            {resolvedCount}/{ambiguities.length}개 확정
          </div>
        )}
      </div>

      {ambiguities.length > 0 && (
        <div className="context-score-notice">
          유사도는 후보 간 비교 점수이며 AI의 확률이나
          확신도를 의미하지 않습니다.
        </div>
      )}

      {analysis?.stale && (
        <div
          className="context-stale-warning"
          role="alert"
        >
          전사가 변경되어 이 분석은 더 이상 유효하지
          않습니다. 현재 발언을 다시 분석해주세요.
        </div>
      )}

      {readOnly && analysis && (
        <div className="context-read-only-notice">
          서버에 저장된 분석 결과를 읽기 전용으로 보고
          있습니다.
        </div>
      )}

      <div className="context-ambiguity-list">
        {ambiguities.length > 0 ? (
          ambiguities.map(
            (ambiguity, index) => (
              <AmbiguityCard
                key={`${analysis.id}-${ambiguity.id}-${
                  ambiguity.selection
                    ?.updatedAt ||
                  ambiguity.selection
                    ?.selectedAt ||
                  "unresolved"
                }`}
                ambiguity={ambiguity}
                displayOrder={index + 1}
                isResolving={
                  resolvingAmbiguityId ===
                  ambiguity.id
                }
                disabled={
                  resolvingAmbiguityId !=
                    null ||
                  analysis?.stale === true ||
                  readOnly
                }
                onResolve={
                  onResolveAmbiguity
                }
              />
            )
          )
        ) : isAnalyzing ? (
          <ContextEmptyState
            icon={BrainCircuit}
            title="AI가 맥락을 분석하고 있습니다"
            description="발언 속 모호한 단어 구간과 가능한 의도를 확인하고 있습니다."
          />
        ) : analysisCompleted ? (
          <ContextEmptyState
            icon={CircleCheck}
            title="추가 확인이 필요한 표현이 없습니다"
            description="현재 발언은 대화 문맥만으로 충분히 해석할 수 있습니다."
          />
        ) : awaitingTranscriptReview ? (
          <ContextEmptyState
            icon={MessageSquareText}
            title="전사 내용을 먼저 검토해주세요"
            description="잘못 인식된 단어를 수정한 뒤 AI 분석 시작 버튼을 눌러주세요."
          />
        ) : (
          <ContextEmptyState
            icon={BrainCircuit}
            title="아직 분석된 맥락이 없습니다"
            description="전사 검토 후 AI 분석을 시작하면 단어 구간별 후보가 표시됩니다."
          />
        )}
      </div>

      {analysis?.usableResolution &&
        ambiguities.length > 0 && (
        <div className="context-all-resolved">
          <CheckCircle2 size={18} />
          모든 모호한 표현의 맥락이 확정되었습니다.
        </div>
      )}
    </section>
  );
}

function AmbiguityCard({
  ambiguity,
  displayOrder,
  isResolving,
  disabled,
  onResolve,
}) {
  const selection = ambiguity.selection;
  const candidates = [
    ...(Array.isArray(ambiguity.candidates)
      ? ambiguity.candidates
      : []),
  ].sort(
    (a, b) =>
      Number(a.rank ?? 0) -
      Number(b.rank ?? 0)
  );
  const [mode, setMode] = useState(
    selection?.type ||
      ContextResolutionType.CANDIDATE
  );
  const [selectedCandidateId, setSelectedCandidateId] =
    useState(
      selection?.candidateId ?? null
    );
  const [customText, setCustomText] =
    useState(
      selection?.type ===
        ContextResolutionType.CUSTOM
        ? selection.finalText || ""
        : ""
    );
  const [isChanging, setIsChanging] =
    useState(selection == null);
  const [error, setError] =
    useState("");

  const handleResolve = async () => {
    let resolution;

    if (
      mode ===
      ContextResolutionType.CANDIDATE
    ) {
      if (selectedCandidateId == null) {
        setError(
          "실제 의도와 가까운 후보를 선택해주세요."
        );
        return;
      }

      resolution = {
        type: mode,
        candidateId:
          selectedCandidateId,
      };
    } else if (
      mode === ContextResolutionType.CUSTOM
    ) {
      const text = customText.trim();

      if (!text) {
        setError(
          "직접 해석한 맥락을 입력해주세요."
        );
        return;
      }

      resolution = {
        type: mode,
        text,
      };
    } else {
      resolution = {
        type:
          ContextResolutionType.DISMISSED,
      };
    }

    try {
      setError("");
      await onResolve?.(
        ambiguity.id,
        resolution
      );
    } catch (err) {
      setError(
        err.message ||
          "맥락을 확정하지 못했습니다."
      );
    }
  };

  return (
    <article
      className={
        selection
          ? "context-ambiguity-card resolved"
          : "context-ambiguity-card"
      }
    >
      <header className="context-ambiguity-header">
        <div className="context-ambiguity-order">
          {displayOrder}
        </div>

        <div>
          <span>확인이 필요한 표현</span>
          <h3>“{ambiguity.excerpt}”</h3>
          {ambiguity.startWordOrder !=
            null && (
            <p>
              단어 {ambiguity.startWordOrder + 1}
              {ambiguity.endWordOrder !==
                ambiguity.startWordOrder &&
                `~${ambiguity.endWordOrder + 1}`}
              번째 구간
            </p>
          )}
        </div>

        <span
          className={
            selection
              ? "context-resolution-status resolved"
              : "context-resolution-status"
          }
        >
          {selection
            ? "확정 완료"
            : "확인 필요"}
        </span>
      </header>

      {selection && !isChanging ? (
        <ResolutionSummary
          selection={selection}
          onChange={() =>
            setIsChanging(true)
          }
          disabled={disabled}
        />
      ) : (
        <>
          <div
            className="context-resolution-modes"
            aria-label="맥락 확정 방식"
          >
            <button
              type="button"
              className={
                mode ===
                ContextResolutionType.CANDIDATE
                  ? "active"
                  : ""
              }
              onClick={() => {
                setMode(
                  ContextResolutionType.CANDIDATE
                );
                setError("");
              }}
              disabled={disabled}
            >
              <Sparkles size={13} />
              AI 후보
            </button>

            <button
              type="button"
              className={
                mode ===
                ContextResolutionType.CUSTOM
                  ? "active"
                  : ""
              }
              onClick={() => {
                setMode(
                  ContextResolutionType.CUSTOM
                );
                setError("");
              }}
              disabled={disabled}
            >
              <Pencil size={13} />
              직접 입력
            </button>

            <button
              type="button"
              className={
                mode ===
                ContextResolutionType.DISMISSED
                  ? "active"
                  : ""
              }
              onClick={() => {
                setMode(
                  ContextResolutionType.DISMISSED
                );
                setError("");
              }}
              disabled={disabled}
            >
              <Ban size={13} />
              무시
            </button>
          </div>

          {mode ===
          ContextResolutionType.CANDIDATE ? (
            <div className="context-group-candidates">
              {candidates.map(
                (candidate) => {
                  const selected =
                    selectedCandidateId ===
                    candidate.id;

                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      className={
                        selected
                          ? "context-group-candidate selected"
                          : "context-group-candidate"
                      }
                      onClick={() => {
                        setSelectedCandidateId(
                          candidate.id
                        );
                        setError("");
                      }}
                      disabled={disabled}
                      aria-pressed={selected}
                    >
                      <span className="context-candidate-rank">
                        {candidate.rank}
                      </span>

                      <span className="context-candidate-copy">
                        <strong>
                          {candidate.interpretation}
                        </strong>
                        <span>
                          의도: {candidate.inferredIntent}
                        </span>
                        <small>
                          {candidate.rationale}
                        </small>
                        <SimilarityScore
                          value={
                            candidate.intentSimilarityScore
                          }
                        />
                      </span>

                      <span className="context-candidate-check">
                        {selected && (
                          <Check
                            size={14}
                            strokeWidth={3}
                          />
                        )}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          ) : mode ===
            ContextResolutionType.CUSTOM ? (
            <div className="context-custom-resolution">
              <label
                htmlFor={`custom-context-${ambiguity.id}`}
              >
                화자가 의도한 실제 맥락
              </label>
              <textarea
                id={`custom-context-${ambiguity.id}`}
                value={customText}
                onChange={(event) =>
                  setCustomText(
                    event.target.value
                  )
                }
                maxLength={4000}
                rows={3}
                placeholder="AI 후보에 없다면 실제 의미를 직접 입력해주세요."
                disabled={disabled}
              />
            </div>
          ) : (
            <div className="context-dismiss-resolution">
              <Ban size={18} />
              <div>
                <strong>
                  이 표현은 별도 확인이 필요하지 않습니다
                </strong>
                <p>
                  현재 대화 문맥만으로 충분히 이해할 수
                  있다면 모호성 구간을 무시할 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div
              className="context-group-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            className="context-group-resolve-button"
            onClick={handleResolve}
            disabled={disabled || isResolving}
          >
            <CheckCircle2 size={16} />
            {isResolving
              ? "확정 중..."
              : getResolveButtonText(mode)}
          </button>
        </>
      )}
    </article>
  );
}

function ResolutionSummary({
  selection,
  onChange,
  disabled,
}) {
  const dismissed =
    selection.type ===
    ContextResolutionType.DISMISSED;

  return (
    <div className="context-resolution-summary">
      <div>
        {dismissed ? (
          <Ban size={18} />
        ) : (
          <CheckCircle2 size={18} />
        )}

        <div>
          <span>
            {getResolutionTypeLabel(
              selection.type
            )}
          </span>
          <strong>
            {dismissed
              ? "문맥상 추가 확인이 필요하지 않음"
              : selection.finalText}
          </strong>
        </div>
      </div>

      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
      >
        <Pencil size={13} />
        확정 내용 변경
      </button>
    </div>
  );
}

function SimilarityScore({ value }) {
  const score = Math.min(
    1,
    Math.max(0, Number(value) || 0)
  );

  return (
    <span className="context-similarity-score">
      <span>
        <i
          style={{
            width: `${score * 100}%`,
          }}
        />
      </span>
      유사도 {score.toFixed(2)}
    </span>
  );
}

function ContextEmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="context-empty">
      <Icon
        size={32}
        strokeWidth={1.4}
      />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function getResolveButtonText(mode) {
  switch (mode) {
    case ContextResolutionType.CUSTOM:
      return "직접 입력한 맥락으로 확정";
    case ContextResolutionType.DISMISSED:
      return "모호성 무시로 확정";
    default:
      return "선택한 후보로 확정";
  }
}

function getResolutionTypeLabel(type) {
  switch (type) {
    case ContextResolutionType.CUSTOM:
      return "직접 입력한 맥락";
    case ContextResolutionType.DISMISSED:
      return "모호성 무시";
    default:
      return "AI 후보로 확정";
  }
}

export default ContextPanel;
