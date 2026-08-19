import {
  BrainCircuit,
  Check,
  Sparkles,
  CircleCheck,
  Pencil,
  Save,
  CheckCircle2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

function ContextPanel({
  contexts = [],
  selectedContextId = null,
  onSelectContext,
  onEditContext,
  onResolveContext,
  analysisCompleted = false,
  isAnalyzing = false,
}) {
  const [editText, setEditText] =
    useState("");

  const [isEditing, setIsEditing] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isResolving, setIsResolving] =
    useState(false);

  // ========================================
  // 점수 높은 순으로 정렬
  // ========================================

  const sortedContexts = [
    ...contexts,
  ].sort(
    (a, b) =>
      getConfidence(b) -
      getConfidence(a)
  );

  // ========================================
  // 현재 선택한 후보
  // ========================================

  const selectedContext =
    contexts.find(
      (context) =>
        context.id ===
        selectedContextId
    ) || null;

  // ========================================
  // 선택 후보가 바뀌면
  // 편집창 내용 갱신
  // ========================================

  useEffect(() => {
    if (!selectedContext) {
      setEditText("");
      setIsEditing(false);
      return;
    }

    setEditText(
      selectedContext.finalText ||
        selectedContext.editedText ||
        selectedContext.description ||
        selectedContext.interpretation ||
        ""
    );
  }, [selectedContext]);

  // ========================================
  // 직접 수정 저장
  // ========================================

  const handleSaveEdit =
    async () => {
      if (
        !selectedContext ||
        !onEditContext
      ) {
        return;
      }

      const trimmed =
        editText.trim();

      if (!trimmed) {
        return;
      }

      try {
        setIsSaving(true);

        await onEditContext(
          selectedContext,
          trimmed
        );

        setIsEditing(false);
      } finally {
        setIsSaving(false);
      }
    };

  // ========================================
  // 최종 확정
  // ========================================

  const handleResolve =
    async () => {
      if (
        !selectedContext ||
        !onResolveContext
      ) {
        return;
      }

      const finalText =
        editText.trim() ||
        selectedContext.description ||
        selectedContext.interpretation ||
        "";

      try {
        setIsResolving(true);

        await onResolveContext(
          selectedContext,
          finalText
        );
      } finally {
        setIsResolving(false);
      }
    };

  // ========================================
  // 화면
  // ========================================

  return (
    <section className="dashboard-card context-panel">
      {/* ========================================
          제목
      ======================================== */}

      <div className="panel-heading-row">
        <div>
          <div className="panel-title-with-icon">
            <BrainCircuit
              size={20}
              strokeWidth={1.8}
            />

            <h2>
              AI 맥락 후보 분석
            </h2>
          </div>

          <p>
            AI가 분석한 발언의 가능한 맥락입니다.
          </p>
        </div>

        {contexts.length > 0 && (
          <div className="context-count-badge">
            <Sparkles
              size={14}
            />

            {contexts.length}개 후보
          </div>
        )}
      </div>

      {/* ========================================
          후보 / 상태 영역
      ======================================== */}

      <div className="context-list">
        {/* ========================================
            중요:
            후보가 있으면 무조건 후보부터 표시
        ======================================== */}

        {sortedContexts.length > 0 ? (
          sortedContexts.map(
            (context, index) => {
              const isSelected =
                selectedContextId ===
                context.id;

              const confidence =
                getConfidence(
                  context
                );

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

                  {/* 후보 내용 */}

                  <div className="context-candidate-content">
                    <div className="context-candidate-title-row">
                      <strong>
                        {context.title ||
                          context.inferredIntent ||
                          context.interpretation ||
                          `맥락 후보 ${
                            index + 1
                          }`}
                      </strong>

                      {index === 0 && (
                        <span className="best-context-badge">
                          가장 유력
                        </span>
                      )}

                      {context.resolved && (
                        <span className="best-context-badge">
                          확정
                        </span>
                      )}
                    </div>

                    <p>
                      {context.editedText ||
                        context.description ||
                        context.interpretation ||
                        context.rationale ||
                        context.content ||
                        "상세 설명이 없습니다."}
                    </p>

                    {/* 확률 */}

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
        ) : isAnalyzing ? (
          /* ========================================
              분석 중
          ======================================== */

          <div className="context-empty">
            <BrainCircuit
              size={32}
              strokeWidth={1.4}
            />

            <strong>
              AI가 맥락을 분석하고 있습니다
            </strong>

            <p>
              발언 속 모호한 표현과 가능한
              의도를 확인하고 있습니다.
            </p>
          </div>
        ) : analysisCompleted ? (
          /* ========================================
              분석 완료 + 후보 없음
          ======================================== */

          <div className="context-empty">
            <CircleCheck
              size={32}
              strokeWidth={1.6}
            />

            <strong>
              추가 확인이 필요한
              모호한 표현이 없습니다
            </strong>

            <p>
              현재 발언은 문맥만으로 충분히
              해석할 수 있어 별도의 맥락
              후보가 생성되지 않았습니다.
            </p>
          </div>
        ) : (
          /* ========================================
              아직 분석 전
          ======================================== */

          <div className="context-empty">
            <BrainCircuit
              size={32}
              strokeWidth={1.4}
            />

            <strong>
              아직 분석된 맥락이 없습니다
            </strong>

            <p>
              대화를 녹음하면 AI가 발언을
              분석하여 필요한 맥락 후보를
              표시합니다.
            </p>
          </div>
        )}
      </div>

      {/* ========================================
          선택된 후보 편집 / 확정
      ======================================== */}

      {selectedContext && (
        <div className="context-selection-editor">
          <div className="selected-context-message">
            <Check
              size={16}
              strokeWidth={2.5}
            />

            실제 의도와 가까운 맥락을
            선택했습니다.
          </div>

          {/* 아직 확정되지 않은 경우 */}

          {!selectedContext.resolved && (
            <>
              <div className="context-edit-header">
                <strong>
                  선택한 맥락
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    setIsEditing(
                      (current) =>
                        !current
                    )
                  }
                >
                  <Pencil
                    size={14}
                  />

                  {isEditing
                    ? "수정 취소"
                    : "직접 수정"}
                </button>
              </div>

              {isEditing ? (
                <div className="context-edit-area">
                  <textarea
                    value={
                      editText
                    }
                    onChange={(
                      event
                    ) =>
                      setEditText(
                        event.target
                          .value
                      )
                    }
                    rows={4}
                    placeholder="실제 의미에 맞게 맥락을 수정해주세요."
                  />

                  <button
                    type="button"
                    onClick={
                      handleSaveEdit
                    }
                    disabled={
                      isSaving ||
                      !editText.trim()
                    }
                  >
                    <Save
                      size={15}
                    />

                    {isSaving
                      ? "저장 중..."
                      : "수정 내용 저장"}
                  </button>
                </div>
              ) : (
                <div className="context-selected-preview">
                  {editText}
                </div>
              )}

              <button
                type="button"
                className="context-resolve-button"
                onClick={
                  handleResolve
                }
                disabled={
                  isResolving
                }
              >
                <CheckCircle2
                  size={17}
                />

                {isResolving
                  ? "확정 중..."
                  : "이 맥락으로 최종 확정"}
              </button>
            </>
          )}

          {/* 확정 완료 */}

          {selectedContext.resolved && (
            <div className="context-resolved-message">
              <CheckCircle2
                size={18}
              />

              이 맥락으로 최종
              확정되었습니다.
            </div>
          )}
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
    현재 백엔드:

    intentSimilarityScore: 0.8

    기존 프론트 호환:

    confidence: 0.82
    score: 82
  */

  if (
    context.intentSimilarityScore != null
  ) {
    const value = Number(
      context.intentSimilarityScore
    );

    if (!Number.isFinite(value)) {
      return 0;
    }

    if (
      value >= 0 &&
      value <= 1
    ) {
      return value * 100;
    }

    return clamp(value);
  }

  if (
    context.confidence != null
  ) {
    const value = Number(
      context.confidence
    );

    if (!Number.isFinite(value)) {
      return 0;
    }

    if (
      value >= 0 &&
      value <= 1
    ) {
      return value * 100;
    }

    return clamp(value);
  }

  if (
    context.score != null
  ) {
    return clamp(
      Number(context.score)
    );
  }

  return 0;
}

// ========================================
// 0 ~ 100
// ========================================

function clamp(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      value
    )
  );
}

export default ContextPanel;