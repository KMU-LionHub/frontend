import {
  FileText,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

function TranscriptPanel({
  transcript = "",
  annotations = [],
  onTranscriptSave,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] =
    useState(transcript);

  // 백엔드에서 새로운 STT 결과가 들어오면
  // 수정용 텍스트도 같이 갱신
  useEffect(() => {
    setEditedTranscript(transcript);
  }, [transcript]);

  // =========================
  // 수정 시작
  // =========================

  const handleEdit = () => {
    setEditedTranscript(transcript);
    setIsEditing(true);
  };

  // =========================
  // 수정 취소
  // =========================

  const handleCancel = () => {
    setEditedTranscript(transcript);
    setIsEditing(false);
  };

  // =========================
  // 수정 내용 저장
  // =========================

  const handleSave = () => {
    if (onTranscriptSave) {
      onTranscriptSave(editedTranscript);
    }

    setIsEditing(false);
  };

  return (
    <section className="dashboard-card transcript-panel">
      {/* =========================
          상단 제목
      ========================== */}

      <div className="panel-heading-row">
        <div>
          <div className="panel-title-with-icon">
            <FileText
              size={19}
              strokeWidth={1.8}
            />

            <h2>
              발언 전문 및 단어 주석 수정
            </h2>
          </div>

          <p>
            STT로 변환된 발언 내용을 확인하고
            필요한 경우 직접 수정할 수 있습니다.
          </p>
        </div>

        {!isEditing ? (
          <button
            type="button"
            className="transcript-edit-button"
            onClick={handleEdit}
            disabled={!transcript}
          >
            <Pencil size={15} />

            수정
          </button>
        ) : (
          <div className="transcript-edit-actions">
            <button
              type="button"
              className="transcript-cancel-button"
              onClick={handleCancel}
            >
              <X size={15} />

              취소
            </button>

            <button
              type="button"
              className="transcript-save-button"
              onClick={handleSave}
            >
              <Save size={15} />

              저장
            </button>
          </div>
        )}
      </div>

      {/* =========================
          STT 내용
      ========================== */}

      <div className="transcript-content">
        {isEditing ? (
          <textarea
            className="transcript-textarea"
            value={editedTranscript}
            onChange={(e) =>
              setEditedTranscript(
                e.target.value
              )
            }
            placeholder="발언 내용을 입력해주세요."
          />
        ) : transcript ? (
          <AnnotatedTranscript
            transcript={transcript}
            annotations={annotations}
          />
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
              녹음을 완료하면 STT로 변환된
              발언 전문이 이곳에 표시됩니다.
            </p>
          </div>
        )}
      </div>

      {/* =========================
          주석 범례
      ========================== */}

      {annotations.length > 0 && (
        <div className="annotation-legend">
          {getAnnotationTypes(
            annotations
          ).map((type) => (
            <div
              className="annotation-legend-item"
              key={type}
            >
              <span
                className={`annotation-dot ${getAnnotationClass(
                  type
                )}`}
              />

              {getAnnotationLabel(type)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ========================================
// 주석이 적용된 발언 전문
// ========================================

function AnnotatedTranscript({
  transcript,
  annotations,
}) {
  /*
    나중에 백엔드에서 이런 식의 주석 데이터를
    내려주는 것을 지원할 수 있도록 구성.

    예:

    {
      id: 1,
      word: "중앙 해커톤",
      type: "PROJECT",
      description: "현재 진행 중인 프로젝트"
    }

    현재는 word 또는 text를 기준으로
    transcript 안의 단어를 찾아 강조한다.
  */

  if (
    !annotations ||
    annotations.length === 0
  ) {
    return (
      <p className="transcript-text">
        {transcript}
      </p>
    );
  }

  const validAnnotations =
    annotations
      .map((annotation) => ({
        ...annotation,

        target:
          annotation.word ||
          annotation.text ||
          "",
      }))
      .filter(
        (annotation) =>
          annotation.target
      );

  if (validAnnotations.length === 0) {
    return (
      <p className="transcript-text">
        {transcript}
      </p>
    );
  }

  // 긴 단어부터 검사해서
  // 짧은 단어가 먼저 매칭되는 문제 방지
  validAnnotations.sort(
    (a, b) =>
      b.target.length -
      a.target.length
  );

  const escapedWords =
    validAnnotations.map(
      (annotation) =>
        escapeRegExp(
          annotation.target
        )
    );

  const regex = new RegExp(
    `(${escapedWords.join("|")})`,
    "g"
  );

  const parts =
    transcript.split(regex);

  return (
    <p className="transcript-text">
      {parts.map((part, index) => {
        const annotation =
          validAnnotations.find(
            (item) =>
              item.target === part
          );

        if (!annotation) {
          return (
            <span key={index}>
              {part}
            </span>
          );
        }

        return (
          <span
            key={index}
            className={`annotated-word ${getAnnotationClass(
              annotation.type
            )}`}
            title={
              annotation.description ||
              ""
            }
          >
            {part}
          </span>
        );
      })}
    </p>
  );
}

// ========================================
// 정규식 특수문자 처리
// ========================================

function escapeRegExp(text) {
  return text.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

// ========================================
// 존재하는 주석 종류 추출
// ========================================

function getAnnotationTypes(
  annotations
) {
  return [
    ...new Set(
      annotations
        .map(
          (annotation) =>
            annotation.type
        )
        .filter(Boolean)
    ),
  ];
}

// ========================================
// 주석 종류별 CSS 클래스
// ========================================

function getAnnotationClass(type) {
  switch (
    String(type).toUpperCase()
  ) {
    case "PERSON":
      return "annotation-person";

    case "PLACE":
    case "LOCATION":
      return "annotation-location";

    case "DATE":
    case "TIME":
      return "annotation-time";

    case "PROJECT":
    case "TOPIC":
      return "annotation-topic";

    case "ORGANIZATION":
    case "ORG":
      return "annotation-organization";

    default:
      return "annotation-default";
  }
}

// ========================================
// 사용자에게 보여줄 이름
// ========================================

function getAnnotationLabel(type) {
  switch (
    String(type).toUpperCase()
  ) {
    case "PERSON":
      return "인물";

    case "PLACE":
    case "LOCATION":
      return "장소";

    case "DATE":
    case "TIME":
      return "시간";

    case "PROJECT":
    case "TOPIC":
      return "주제";

    case "ORGANIZATION":
    case "ORG":
      return "기관";

    default:
      return type;
  }
}

export default TranscriptPanel;