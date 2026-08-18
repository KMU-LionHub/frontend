import {
  BrainCircuit,
  Check,
  Sparkles,
} from "lucide-react";

function ContextPanel({
  contexts = [],
  selectedContextId = null,
  onSelectContext,
}) {
  // confidence / score 기준으로 높은 순서 정렬
  // 원본 contexts 배열은 건드리지 않도록 복사
  const sortedContexts = [...contexts].sort(
    (a, b) =>
      getConfidence(b) -
      getConfidence(a)
  );

  return (
    <section className="dashboard-card context-panel">
      {/* =========================
          상단 제목
      ========================== */}

      <div className="panel-heading-row">
        <div>
          <div className="panel-title-with-icon">
            <BrainCircuit
              size={20}
              strokeWidth={1.8}
            />

            <h2>AI 맥락 후보 분석</h2>
          </div>

          <p>
            AI가 분석한 발언의 가능한 맥락입니다.
          </p>
        </div>

        {contexts.length > 0 && (
          <div className="context-count-badge">
            <Sparkles size={14} />

            {contexts.length}개 후보
          </div>
        )}
      </div>

      {/* =========================
          맥락 후보
      ========================== */}

      <div className="context-list">
        {sortedContexts.length === 0 ? (
          <div className="context-empty">
            <BrainCircuit
              size={32}
              strokeWidth={1.4}
            />

            <strong>
              아직 분석된 맥락이 없습니다
            </strong>

            <p>
              대화 분석이 완료되면 AI가 추론한
              맥락 후보가 이곳에 표시됩니다.
            </p>
          </div>
        ) : (
          sortedContexts.map(
            (context, index) => {
              const isSelected =
                selectedContextId ===
                context.id;

              const confidence =
                getConfidence(context);

              return (
                <button
                  type="button"
                  key={
                    context.id ??
                    index
                  }
                  className={
                    isSelected
                      ? "context-candidate selected"
                      : "context-candidate"
                  }
                  onClick={() => {
                    if (
                      onSelectContext
                    ) {
                      onSelectContext(
                        context.id
                      );
                    }
                  }}
                >
                  {/* 순위 */}

                  <div className="context-rank">
                    {index + 1}
                  </div>

                  {/* 내용 */}

                  <div className="context-candidate-content">
                    <div className="context-candidate-title-row">
                      <strong>
                        {context.title ||
                          `맥락 후보 ${
                            index + 1
                          }`}
                      </strong>

                      {index === 0 && (
                        <span className="best-context-badge">
                          가장 유력
                        </span>
                      )}
                    </div>

                    <p>
                      {context.description ||
                        context.content ||
                        "상세 설명이 없습니다."}
                    </p>

                    {/* 확률 막대 */}

                    <div className="context-confidence-area">
                      <div className="context-confidence-bar">
                        <div
                          className="context-confidence-fill"
                          style={{
                            width: `${confidence}%`,
                          }}
                        />
                      </div>

                      <span>
                        {Math.round(
                          confidence
                        )}
                        %
                      </span>
                    </div>
                  </div>

                  {/* 선택 표시 */}

                  <div
                    className={
                      isSelected
                        ? "context-select-circle selected"
                        : "context-select-circle"
                    }
                  >
                    {isSelected && (
                      <Check
                        size={14}
                        strokeWidth={3}
                      />
                    )}
                  </div>
                </button>
              );
            }
          )
        )}
      </div>

      {/* =========================
          선택 결과
      ========================== */}

      {selectedContextId !== null &&
        contexts.length > 0 && (
          <div className="selected-context-message">
            <Check
              size={16}
              strokeWidth={2.5}
            />

            실제 의도와 가까운 맥락을
            선택했습니다.
          </div>
        )}
    </section>
  );
}

// ========================================
// confidence 값 통일
// ========================================

function getConfidence(context) {
  /*
    백엔드가

    confidence: 0.82

    형태로 보내도 되고

    score: 82

    형태로 보내도 화면에서는
    둘 다 82%로 처리
  */

  if (
    context.confidence != null
  ) {
    const value = Number(
      context.confidence
    );

    if (!Number.isFinite(value)) {
      return 0;
    }

    // 0.82 형태
    if (value >= 0 && value <= 1) {
      return value * 100;
    }

    // 혹시 confidence: 82로 오는 경우
    return clamp(value);
  }

  if (context.score != null) {
    return clamp(
      Number(context.score)
    );
  }

  return 0;
}

// 0~100 사이로 제한
function clamp(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, value)
  );
}

export default ContextPanel;