import {
  BrainCircuit,
  FileText,
  Mic,
  Pencil,
  Save,
  Square,
  X,
} from "lucide-react";
import { useState } from "react";

import {
  RecordingPhase,
} from "../workflow/recordingWorkflow";

function TranscriptPanel({
  transcript = "",
  words = [],
  analysisStatus =
    RecordingPhase.IDLE,
  isRecording = false,
  isRerecording = false,
  isProcessing = false,
  canAnalyze = false,
  onCorrectWord,
  onRerecordToggle,
  onAnalyze,
}) {
  const [editingWordId, setEditingWordId] =
    useState(null);
  const [editedWord, setEditedWord] =
    useState("");
  const [isSaving, setIsSaving] =
    useState(false);
  const [editError, setEditError] =
    useState("");

  const orderedWords = [...words].sort(
    (a, b) =>
      Number(a.order ?? 0) -
      Number(b.order ?? 0)
  );
  const editingWord =
    orderedWords.find(
      (word) =>
        word.id === editingWordId
    ) || null;

  const isAnalyzing =
    analysisStatus ===
    RecordingPhase.ANALYZING;
  const analysisCompleted =
    analysisStatus ===
    RecordingPhase.COMPLETED;

  const handleStartEdit = (word) => {
    setEditingWordId(word.id);
    setEditedWord(getWordText(word));
    setEditError("");
  };

  const handleCancelEdit = () => {
    setEditingWordId(null);
    setEditedWord("");
    setEditError("");
  };

  const handleSaveWord = async (
    event
  ) => {
    event.preventDefault();

    if (
      !editingWord ||
      !onCorrectWord
    ) {
      return;
    }

    const text = editedWord.trim();

    if (!text) {
      setEditError(
        "수정할 단어를 입력해주세요."
      );
      return;
    }

    try {
      setIsSaving(true);
      setEditError("");
      await onCorrectWord(
        editingWord.id,
        text
      );
      handleCancelEdit();
    } catch (err) {
      setEditError(
        err.message ||
          "단어를 수정하지 못했습니다."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const wordEditingDisabled =
    isRecording || isProcessing;
  const rerecordDisabled =
    !transcript ||
    (
      isRecording
        ? !isRerecording
        : isProcessing
    );

  return (
    <section className="dashboard-card transcript-panel">
      <div className="panel-heading-row transcript-heading-row">
        <div>
          <div className="panel-title-with-icon">
            <FileText
              size={19}
              strokeWidth={1.8}
            />

            <h2>STT 전사 검토</h2>
          </div>

          <p>
            잘못 인식된 단어를 선택해 수정하거나
            전체 발언을 다시 녹음할 수 있습니다.
          </p>
        </div>

        <div className="transcript-review-actions">
          <button
            type="button"
            className="transcript-secondary-action"
            onClick={onRerecordToggle}
            disabled={rerecordDisabled}
          >
            {isRerecording &&
            isRecording ? (
              <Square size={14} />
            ) : (
              <Mic size={15} />
            )}

            {getRerecordButtonText({
              isRecording,
              isRerecording,
              isProcessing,
            })}
          </button>

          <button
            type="button"
            className="transcript-analyze-button"
            onClick={onAnalyze}
            disabled={
              !canAnalyze ||
              isRecording ||
              isProcessing
            }
          >
            <BrainCircuit size={15} />

            {isAnalyzing
              ? "분석 중..."
              : analysisCompleted
                ? "분석 완료"
                : "AI 분석 시작"}
          </button>
        </div>
      </div>

      {editingWord && (
        <WordEditor
          word={editingWord}
          value={editedWord}
          error={editError}
          isSaving={isSaving}
          onChange={setEditedWord}
          onCancel={handleCancelEdit}
          onSubmit={handleSaveWord}
        />
      )}

      <div className="transcript-content">
        {transcript ? (
          <>
            <p className="transcript-text">
              {transcript}
            </p>

            {orderedWords.length > 0 ? (
              <div className="transcript-word-review">
                <div className="transcript-word-guide">
                  <strong>
                    단어별 전사 결과
                  </strong>

                  <span>
                    수정할 단어를 선택하세요.
                  </span>
                </div>

                <div
                  className="transcript-word-list"
                  aria-label="전사 단어 목록"
                >
                  {orderedWords.map(
                    (word) => {
                      const confidence =
                        getWordConfidence(
                          word
                        );
                      const isLowConfidence =
                        confidence != null &&
                        confidence < 0.8;
                      const isCorrected =
                        Boolean(
                          word.correctedText
                        );

                      return (
                        <button
                          key={word.id}
                          type="button"
                          className={[
                            "transcript-word",
                            isLowConfidence
                              ? "low-confidence"
                              : "",
                            isCorrected
                              ? "corrected"
                              : "",
                            editingWordId ===
                            word.id
                              ? "editing"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() =>
                            handleStartEdit(
                              word
                            )
                          }
                          disabled={
                            wordEditingDisabled
                          }
                          aria-label={`${getWordText(
                            word
                          )} 단어 수정`}
                          title={
                            isLowConfidence
                              ? "STT 신뢰도가 낮은 단어입니다."
                              : "단어를 수정하려면 선택하세요."
                          }
                        >
                          {getWordText(word)}

                          {isCorrected && (
                            <span className="transcript-word-corrected-mark">
                              수정됨
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="transcript-word-legend">
                  <span>
                    <i className="low-confidence-dot" />
                    STT 신뢰도 80% 미만
                  </span>

                  <span>
                    <i className="corrected-dot" />
                    직접 수정한 단어
                  </span>
                </div>
              </div>
            ) : (
              <p className="transcript-word-unavailable">
                단어별 전사 정보가 없어 전체 문장만
                표시합니다. 필요하면 재발언해주세요.
              </p>
            )}
          </>
        ) : (
          <div className="transcript-empty">
            <FileText
              size={30}
              strokeWidth={1.5}
            />

            <strong>
              아직 발언 내용이 없습니다
            </strong>

            <p>
              녹음을 완료하면 단어별 STT 결과를
              이곳에서 검토할 수 있습니다.
            </p>
          </div>
        )}
      </div>

    </section>
  );
}

function WordEditor({
  word,
  value,
  error,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}) {
  const confidence =
    getWordConfidence(word);

  return (
    <form
      className="transcript-word-editor"
      onSubmit={onSubmit}
    >
      <div className="transcript-word-editor-header">
        <div>
          <Pencil size={15} />
          <strong>선택한 단어 수정</strong>
        </div>

        <button
          type="button"
          className="transcript-word-editor-close"
          onClick={onCancel}
          aria-label="단어 수정 취소"
        >
          <X size={16} />
        </button>
      </div>

      <label htmlFor="corrected-word">
        교정할 단어
      </label>

      <input
        id="corrected-word"
        name="correctedWord"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        maxLength={2000}
        autoFocus
      />

      <div className="transcript-word-editor-meta">
        <span>
          원본: {word.originalText}
        </span>

        {confidence != null && (
          <span>
            STT 신뢰도: {Math.round(
              confidence * 100
            )}
            %
          </span>
        )}
      </div>

      {error && (
        <div
          className="transcript-word-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="transcript-word-editor-actions">
        <button
          type="button"
          className="transcript-word-cancel-button"
          onClick={onCancel}
          disabled={isSaving}
        >
          취소
        </button>

        <button
          type="submit"
          className="transcript-word-save-button"
          disabled={
            isSaving || !value.trim()
          }
        >
          <Save size={14} />
          {isSaving
            ? "저장 중..."
            : "단어 저장"}
        </button>
      </div>
    </form>
  );
}

function getWordText(word) {
  return (
    word.currentText ||
    word.correctedText ||
    word.originalText ||
    ""
  );
}

function getWordConfidence(word) {
  const confidence = Number(
    word.confidence
  );

  if (!Number.isFinite(confidence)) {
    return null;
  }

  return Math.min(
    1,
    Math.max(0, confidence)
  );
}

function getRerecordButtonText({
  isRecording,
  isRerecording,
  isProcessing,
}) {
  if (isRerecording && isRecording) {
    return "재발언 녹음 종료";
  }

  if (isRerecording && isProcessing) {
    return "재발언 처리 중...";
  }

  return "전체 재발언";
}

export default TranscriptPanel;
