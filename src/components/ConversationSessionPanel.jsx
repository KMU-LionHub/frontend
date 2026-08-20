import {
  CheckCircle2,
  MessageSquarePlus,
  Plus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

function ConversationSessionPanel({
  session = null,
  currentSpeakerParticipantId = null,
  hasCurrentUtterance = false,
  canFinalizeUtterance = false,
  isBusy = false,
  onCreateSession,
  onSelectSpeaker,
  onFinalizeUtterance,
  onCloseSession,
}) {
  const [title, setTitle] =
    useState("");
  const [context, setContext] =
    useState("");
  const [participantDraft, setParticipantDraft] =
    useState("");
  const [participantNames, setParticipantNames] =
    useState([]);
  const [error, setError] =
    useState("");

  const handleAddParticipant = () => {
    const name = participantDraft.trim();

    if (!name) {
      return;
    }

    if (
      participantNames.some(
        (participantName) =>
          participantName.toLocaleLowerCase() ===
          name.toLocaleLowerCase()
      )
    ) {
      setError(
        "같은 이름의 참여자가 이미 있습니다."
      );
      return;
    }

    if (participantNames.length >= 20) {
      setError(
        "상대 참여자는 최대 20명까지 등록할 수 있습니다."
      );
      return;
    }

    setParticipantNames(
      (current) => [
        ...current,
        name,
      ]
    );
    setParticipantDraft("");
    setError("");
  };

  const handleCreate = async (
    event
  ) => {
    event.preventDefault();

    const normalizedTitle =
      title.trim();

    if (!normalizedTitle) {
      setError(
        "대화 제목을 입력해주세요."
      );
      return;
    }

    try {
      setError("");
      await onCreateSession?.({
        title: normalizedTitle,
        context: context.trim(),
        participantNames,
      });
      setTitle("");
      setContext("");
      setParticipantDraft("");
      setParticipantNames([]);
    } catch (err) {
      setError(
        err.message ||
          "대화를 시작하지 못했습니다."
      );
    }
  };

  if (!session) {
    return (
      <section className="conversation-session-card setup">
        <div className="conversation-session-heading">
          <div className="conversation-session-icon">
            <MessageSquarePlus
              size={19}
            />
          </div>

          <div>
            <h2>새 대화 설정</h2>
            <p>
              AI가 발언을 해석할 수 있도록 대화 배경과
              참여자를 먼저 알려주세요.
            </p>
          </div>
        </div>

        <form
          className="conversation-setup-form"
          onSubmit={handleCreate}
        >
          <div className="conversation-setup-field">
            <label htmlFor="conversation-title">
              대화 제목 <span>필수</span>
            </label>
            <input
              id="conversation-title"
              name="conversationTitle"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="예: 여행 일정 조율"
              maxLength={100}
              disabled={isBusy}
              required
            />
          </div>

          <div className="conversation-setup-field context-field">
            <label htmlFor="conversation-context">
              대화 배경 <span>선택</span>
            </label>
            <textarea
              id="conversation-context"
              name="conversationContext"
              value={context}
              onChange={(event) =>
                setContext(event.target.value)
              }
              placeholder="예: 친구와 여름휴가 장소를 정하는 대화"
              maxLength={2000}
              rows={2}
              disabled={isBusy}
            />
          </div>

          <div className="conversation-setup-field participant-field">
            <label htmlFor="participant-name">
              상대 참여자 <span>선택</span>
            </label>

            <div className="participant-input-row">
              <input
                id="participant-name"
                name="participantName"
                value={participantDraft}
                onChange={(event) =>
                  setParticipantDraft(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddParticipant();
                  }
                }}
                placeholder="참여자 이름"
                maxLength={50}
                disabled={isBusy}
              />

              <button
                type="button"
                onClick={handleAddParticipant}
                disabled={
                  isBusy ||
                  !participantDraft.trim()
                }
              >
                <Plus size={15} />
                추가
              </button>
            </div>

            {participantNames.length > 0 && (
              <div className="participant-draft-list">
                {participantNames.map(
                  (name) => (
                    <span key={name}>
                      <UserRound size={13} />
                      {name}
                      <button
                        type="button"
                        onClick={() =>
                          setParticipantNames(
                            (current) =>
                              current.filter(
                                (item) =>
                                  item !== name
                              )
                          )
                        }
                        aria-label={`${name} 참여자 삭제`}
                        disabled={isBusy}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )
                )}
              </div>
            )}
          </div>

          {error && (
            <div
              className="conversation-session-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="conversation-start-button"
            disabled={
              isBusy || !title.trim()
            }
          >
            <MessageSquarePlus size={16} />
            {isBusy
              ? "대화 생성 중..."
              : "이 설정으로 대화 시작"}
          </button>
        </form>
      </section>
    );
  }

  const participants =
    Array.isArray(session.participants)
      ? session.participants
      : [];
  const utteranceCount =
    Array.isArray(session.utterances)
      ? session.utterances.length
      : 0;

  return (
    <section className="conversation-session-card active">
      <div className="conversation-session-summary">
        <div>
          <div className="conversation-session-title-row">
            <span className="conversation-active-badge">
              대화 진행 중
            </span>
            <span>
              발언 {utteranceCount}개
            </span>
          </div>

          <h2>{session.title}</h2>

          {session.context && (
            <p>{session.context}</p>
          )}
        </div>

        {!hasCurrentUtterance &&
          utteranceCount > 0 && (
          <button
            type="button"
            className="conversation-close-button"
            onClick={async () => {
              const confirmed =
                window.confirm(
                  "현재 대화를 종료하시겠습니까?"
                );

              if (!confirmed) {
                return;
              }

              try {
                setError("");
                await onCloseSession?.();
              } catch (err) {
                setError(
                  err.message ||
                    "대화를 종료하지 못했습니다."
                );
              }
            }}
            disabled={isBusy}
          >
            <CheckCircle2 size={15} />
            대화 종료
          </button>
        )}
      </div>

      <div className="conversation-speaker-area">
        <div className="conversation-speaker-label">
          <Users size={16} />
          <strong>이번 발언 화자</strong>
          <span>
            {hasCurrentUtterance
              ? "현재 발언이 끝날 때까지 변경할 수 없습니다."
              : "녹음할 사람을 선택하세요."}
          </span>
        </div>

        <div className="conversation-participant-list">
          {participants.map(
            (participant) => {
              const selected =
                participant.id ===
                currentSpeakerParticipantId;

              return (
                <button
                  key={participant.id}
                  type="button"
                  className={
                    selected
                      ? "conversation-participant selected"
                      : "conversation-participant"
                  }
                  onClick={() =>
                    onSelectSpeaker?.(
                      participant.id
                    )
                  }
                  disabled={
                    isBusy ||
                    hasCurrentUtterance
                  }
                  aria-pressed={selected}
                >
                  <UserRound size={14} />
                  {participant.displayName}
                  {participant.type ===
                    "SELF" && (
                    <span>나</span>
                  )}
                </button>
              );
            }
          )}
        </div>
      </div>

      {hasCurrentUtterance ? (
        <div className="conversation-next-utterance">
          <p>
            {canFinalizeUtterance
              ? "현재 발언의 검토가 끝났습니다. 확정하면 다음 발언을 녹음할 수 있습니다."
              : "AI 분석과 필요한 맥락 확정을 마치면 다음 발언으로 이동할 수 있습니다."}
          </p>

          <button
            type="button"
            onClick={onFinalizeUtterance}
            disabled={
              isBusy ||
              !canFinalizeUtterance
            }
          >
            <CheckCircle2 size={15} />
            발언 확정 후 다음
          </button>
        </div>
      ) : (
        <p className="conversation-ready-message">
          아래 마이크 버튼을 눌러 선택한 화자의 발언을
          녹음해주세요.
        </p>
      )}

      {error && (
        <div
          className="conversation-session-error"
          role="alert"
        >
          {error}
        </div>
      )}
    </section>
  );
}

export default ConversationSessionPanel;
