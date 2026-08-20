import {
  useEffect,
  useState,
} from "react";

import {
  Clock3,
  MessageSquareText,
  Trash2,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

import {
  getAllConversations,
  deleteConversation,
  clearConversations,
} from "../db/conversationDb";

function HistoryPage({
  onOpenConversation,
}) {
  const [
    conversations,
    setConversations,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ========================================
  // 전체 기록 불러오기
  // ========================================

  const loadConversations =
    async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getAllConversations();

        setConversations(data);
      } catch (err) {
        console.error(
          "대화 기록 조회 실패:",
          err
        );

        setError(
          "대화 기록을 불러오지 못했습니다."
        );
      } finally {
        setLoading(false);
      }
    };

  // ========================================
  // 최초 조회
  // ========================================

  useEffect(() => {
    let cancelled = false;

    getAllConversations()
      .then((data) => {
        if (!cancelled) {
          setConversations(data);
        }
      })
      .catch((err) => {
        console.error(
          "대화 기록 조회 실패:",
          err
        );

        if (!cancelled) {
          setError(
            "대화 기록을 불러오지 못했습니다."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ========================================
  // 특정 기록 열기
  // ========================================

  const handleOpen = (
    conversation
  ) => {
    if (
      onOpenConversation
    ) {
      onOpenConversation(
        conversation
      );
    }
  };

  // ========================================
  // 특정 기록 삭제
  // ========================================

  const handleDelete =
    async (event, id) => {
      event.stopPropagation();

      const confirmed =
        window.confirm(
          "이 대화 기록을 삭제하시겠습니까?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteConversation(id);

        setConversations(
          (current) =>
            current.filter(
              (conversation) =>
                conversation.id !==
                id
            )
        );
      } catch (err) {
        console.error(
          "대화 기록 삭제 실패:",
          err
        );

        setError(
          "대화 기록 삭제에 실패했습니다."
        );
      }
    };

  // ========================================
  // 전체 기록 삭제
  // ========================================

  const handleClearAll =
    async () => {
      if (
        conversations.length ===
        0
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "저장된 모든 대화 기록을 삭제하시겠습니까?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await clearConversations();

        setConversations([]);
      } catch (err) {
        console.error(
          "대화 기록 전체 삭제 실패:",
          err
        );

        setError(
          "대화 기록을 삭제하지 못했습니다."
        );
      }
    };

  return (
    <div className="history-page">
      {/* 상단 */}

      <div className="history-header">
        <div>
          <h2>
            대화 기록
          </h2>

          <p>
            이전에 분석한 대화와
            AI 맥락 분석 결과를
            다시 확인할 수 있습니다.
          </p>
        </div>

        <div className="history-header-actions">
          <button
            type="button"
            className="history-refresh-button"
            onClick={
              loadConversations
            }
          >
            <RotateCcw
              size={15}
            />

            새로고침
          </button>

          <button
            type="button"
            className="history-clear-button"
            onClick={
              handleClearAll
            }
            disabled={
              conversations.length ===
              0
            }
          >
            <Trash2
              size={15}
            />

            전체 삭제
          </button>
        </div>
      </div>

      {/* 오류 */}

      {error && (
        <div className="history-error">
          {error}
        </div>
      )}

      {/* 로딩 */}

      {loading ? (
        <div className="history-empty">
          <div className="history-empty-icon">
            <RotateCcw
              size={25}
              className="history-loading-icon"
            />
          </div>

          <strong>
            대화 기록을 불러오는 중입니다
          </strong>
        </div>
      ) : conversations.length ===
        0 ? (
        /* 기록 없음 */

        <div className="history-empty">
          <div className="history-empty-icon">
            <MessageSquareText
              size={30}
            />
          </div>

          <strong>
            저장된 대화가 없습니다
          </strong>

          <p>
            대화를 녹음하고 AI 분석이
            완료되면 이곳에 기록이
            저장됩니다.
          </p>
        </div>
      ) : (
        /* 기록 목록 */

        <div className="history-list">
          {conversations.map(
            (conversation) => (
              <div
                key={
                  conversation.id
                }
                className="history-item"
                role="button"
                tabIndex={0}
                onClick={() =>
                  handleOpen(
                    conversation
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                      "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();

                    handleOpen(
                      conversation
                    );
                  }
                }}
              >
                {/* 아이콘 */}

                <div className="history-item-icon">
                  <MessageSquareText
                    size={20}
                  />
                </div>

                {/* 내용 */}

                <div className="history-item-content">
                  <div className="history-item-top">
                    <strong>
                      {getConversationTitle(
                        conversation
                      )}
                    </strong>

                    <div className="history-time">
                      <Clock3
                        size={12}
                      />

                      {formatDate(
                        conversation.createdAt
                      )}
                    </div>
                  </div>

                  <p>
                    {getPreview(
                      conversation.transcript
                    )}
                  </p>

                  <div className="history-meta">
                    <span>
                      맥락 후보{" "}
                      {
                        conversation
                          .contexts
                          ?.length ??
                        0
                      }
                      개
                    </span>

                    <span>
                      주석{" "}
                      {
                        conversation
                          .annotations
                          ?.length ??
                        0
                      }
                      개
                    </span>

                    {conversation.selectedContextId !=
                      null && (
                      <span className="history-selected-badge">
                        맥락 선택 완료
                      </span>
                    )}
                  </div>
                </div>

                {/* 액션 */}

                <div className="history-item-actions">
                  <button
                    type="button"
                    className="history-delete-button"
                    onClick={(
                      event
                    ) =>
                      handleDelete(
                        event,
                        conversation.id
                      )
                    }
                    title="기록 삭제"
                  >
                    <Trash2
                      size={15}
                    />
                  </button>

                  <ChevronRight
                    size={18}
                    className="history-arrow"
                  />
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ========================================
// 대화 제목
// ========================================

function getConversationTitle(
  conversation
) {
  if (
    conversation.contexts?.[0]
      ?.title
  ) {
    return conversation.contexts[0]
      .title;
  }

  if (
    conversation.transcript
  ) {
    const trimmed =
      conversation.transcript.trim();

    if (
      trimmed.length <= 28
    ) {
      return trimmed;
    }

    return `${trimmed.slice(
      0,
      28
    )}...`;
  }

  return "새로운 대화";
}

// ========================================
// 미리보기
// ========================================

function getPreview(
  transcript
) {
  if (!transcript) {
    return "발언 내용이 없습니다.";
  }

  const trimmed =
    transcript.trim();

  if (
    trimmed.length <= 90
  ) {
    return trimmed;
  }

  return `${trimmed.slice(
    0,
    90
  )}...`;
}

// ========================================
// 날짜
// ========================================

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  const now =
    new Date();

  const isToday =
    now.getFullYear() ===
      date.getFullYear() &&
    now.getMonth() ===
      date.getMonth() &&
    now.getDate() ===
      date.getDate();

  const time =
    date.toLocaleTimeString(
      "ko-KR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  if (isToday) {
    return `오늘 ${time}`;
  }

  return date.toLocaleString(
    "ko-KR",
    {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

export default HistoryPage;
