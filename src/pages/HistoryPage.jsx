import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageSquareText,
  Play,
  RotateCcw,
  UserRound,
  Users,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import {
  findDraftUtterance,
  getConversationHistoryDetail,
  listConversationHistory,
  loadUtteranceHistoryRecord,
} from "../api/historyApi";

const PAGE_SIZE = 12;

function HistoryPage({
  onOpenConversation,
  onResumeConversation,
}) {
  const [page, setPage] =
    useState(0);
  const [pageData, setPageData] =
    useState({
      conversations: [],
      page: 0,
      size: PAGE_SIZE,
      totalElements: 0,
      totalPages: 0,
    });
  const [selectedConversation, setSelectedConversation] =
    useState(null);
  const [loading, setLoading] =
    useState(true);
  const [detailLoading, setDetailLoading] =
    useState(false);
  const [utteranceLoadingId, setUtteranceLoadingId] =
    useState(null);
  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    listConversationHistory({
      page,
      size: PAGE_SIZE,
    })
      .then((data) => {
        if (!cancelled) {
          setPageData(data);
          setError("");
        }
      })
      .catch((err) => {
        console.error(
          "서버 대화 기록 조회 실패:",
          err
        );

        if (!cancelled) {
          setError(
            err.message ||
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
  }, [page]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError("");
      const data =
        await listConversationHistory({
          page,
          size: PAGE_SIZE,
        });
      setPageData(data);
    } catch (err) {
      console.error(
        "서버 대화 기록 새로고침 실패:",
        err
      );
      setError(
        err.message ||
          "대화 기록을 새로고침하지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (
    conversationId
  ) => {
    try {
      setDetailLoading(true);
      setError("");
      const detail =
        await getConversationHistoryDetail(
          conversationId
        );
      setSelectedConversation(detail);
    } catch (err) {
      console.error(
        "대화 상세 조회 실패:",
        err
      );
      setError(
        err.message ||
          "대화 상세를 불러오지 못했습니다."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenUtterance = async (
    utterance
  ) => {
    if (!selectedConversation) {
      return;
    }

    try {
      setUtteranceLoadingId(
        utterance.id
      );
      setError("");
      const record =
        await loadUtteranceHistoryRecord({
          conversation:
            selectedConversation,
          utterance,
        });
      onOpenConversation?.(record);
    } catch (err) {
      console.error(
        "발언 기록 조회 실패:",
        err
      );
      setError(
        err.message ||
          "발언 기록을 불러오지 못했습니다."
      );
    } finally {
      setUtteranceLoadingId(null);
    }
  };

  const handleResume = async () => {
    if (!selectedConversation) {
      return;
    }

    const draftUtterance =
      findDraftUtterance(
        selectedConversation
      );

    try {
      setDetailLoading(true);
      setError("");
      const record = draftUtterance
        ? await loadUtteranceHistoryRecord({
            conversation:
              selectedConversation,
            utterance: draftUtterance,
          })
        : null;

      onResumeConversation?.({
        conversation:
          selectedConversation,
        record,
      });
    } catch (err) {
      console.error(
        "대화 이어가기 실패:",
        err
      );
      setError(
        err.message ||
          "대화를 이어서 열지 못했습니다."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  if (selectedConversation) {
    return (
      <ConversationHistoryDetail
        conversation={
          selectedConversation
        }
        error={error}
        detailLoading={detailLoading}
        utteranceLoadingId={
          utteranceLoadingId
        }
        onBack={() => {
          setSelectedConversation(null);
          setError("");
        }}
        onOpenUtterance={
          handleOpenUtterance
        }
        onResume={handleResume}
      />
    );
  }

  const conversations =
    Array.isArray(pageData.conversations)
      ? pageData.conversations
      : [];

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h2>대화 기록</h2>
          <p>
            현재 계정에 저장된 서버 대화를 확인하고
            발언별 전사와 맥락 분석을 다시 볼 수 있습니다.
          </p>
        </div>

        <button
          type="button"
          className="history-refresh-button"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RotateCcw
            size={15}
            className={
              loading
                ? "history-loading-icon"
                : ""
            }
          />
          새로고침
        </button>
      </div>

      {error && (
        <div
          className="history-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <HistoryLoading />
      ) : conversations.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">
            <MessageSquareText
              size={30}
            />
          </div>
          <strong>
            서버에 저장된 대화가 없습니다
          </strong>
          <p>
            대화를 시작하고 발언을 녹음하면 이곳에
            계정별 기록이 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="history-list">
          {conversations.map(
            (conversation) => (
              <button
                key={conversation.id}
                type="button"
                className="history-item"
                onClick={() =>
                  handleOpenDetail(
                    conversation.id
                  )
                }
                disabled={detailLoading}
              >
                <div className="history-item-icon">
                  <MessageSquareText
                    size={20}
                  />
                </div>

                <div className="history-item-content">
                  <div className="history-item-top">
                    <strong>
                      {conversation.title}
                    </strong>
                    <div className="history-time">
                      <Clock3 size={12} />
                      {formatDate(
                        conversation.updatedAt
                      )}
                    </div>
                  </div>

                  <p>
                    {conversation.context ||
                      "대화 배경이 없습니다."}
                  </p>

                  <div className="history-meta">
                    <span>
                      발언 {conversation.utteranceCount}개
                    </span>
                    <span
                      className={
                        conversation.status ===
                        "CLOSED"
                          ? "history-status-closed"
                          : "history-status-active"
                      }
                    >
                      {conversation.status ===
                      "CLOSED"
                        ? "종료됨"
                        : "진행 중"}
                    </span>
                  </div>
                </div>

                <div className="history-item-actions">
                  <ChevronRight
                    size={18}
                    className="history-arrow"
                  />
                </div>
              </button>
            )
          )}
        </div>
      )}

      {pageData.totalPages > 1 && (
        <div className="history-pagination">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setPage(
                (current) =>
                  Math.max(0, current - 1)
              );
            }}
            disabled={page <= 0 || loading}
            aria-label="이전 페이지"
          >
            <ChevronLeft size={16} />
          </button>

          <span>
            {pageData.page + 1} / {pageData.totalPages}
          </span>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setPage(
                (current) =>
                  Math.min(
                    pageData.totalPages - 1,
                    current + 1
                  )
              );
            }}
            disabled={
              page >=
                pageData.totalPages - 1 ||
              loading
            }
            aria-label="다음 페이지"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function ConversationHistoryDetail({
  conversation,
  error,
  detailLoading,
  utteranceLoadingId,
  onBack,
  onOpenUtterance,
  onResume,
}) {
  const participants =
    Array.isArray(conversation.participants)
      ? conversation.participants
      : [];
  const utterances =
    Array.isArray(conversation.utterances)
      ? [...conversation.utterances].sort(
          (a, b) =>
            Number(a.order ?? 0) -
            Number(b.order ?? 0)
        )
      : [];

  return (
    <div className="history-page history-detail-page">
      <div className="history-detail-header">
        <button
          type="button"
          className="history-back-button"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          목록으로
        </button>

        <div className="history-detail-title">
          <div>
            <span
              className={
                conversation.status ===
                "CLOSED"
                  ? "history-status-closed"
                  : "history-status-active"
              }
            >
              {conversation.status ===
              "CLOSED"
                ? "종료된 대화"
                : "진행 중인 대화"}
            </span>
            <h2>{conversation.title}</h2>
            <p>
              {conversation.context ||
                "대화 배경이 없습니다."}
            </p>
          </div>

          {conversation.status ===
            "ACTIVE" && (
            <button
              type="button"
              className="history-resume-button"
              onClick={onResume}
              disabled={detailLoading}
            >
              <Play size={15} />
              {detailLoading
                ? "불러오는 중..."
                : "이 대화 이어가기"}
            </button>
          )}
        </div>

        <div className="history-detail-participants">
          <Users size={16} />
          <strong>참여자</strong>
          <div>
            {participants.map(
              (participant) => (
                <span key={participant.id}>
                  <UserRound size={13} />
                  {participant.displayName}
                  {participant.type ===
                    "SELF" && " · 나"}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          className="history-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="history-utterance-list">
        {utterances.length === 0 ? (
          <div className="history-empty compact">
            <strong>
              아직 저장된 발언이 없습니다
            </strong>
          </div>
        ) : (
          utterances.map(
            (utterance) => (
              <button
                key={utterance.id}
                type="button"
                className="history-utterance-item"
                onClick={() =>
                  onOpenUtterance(
                    utterance
                  )
                }
                disabled={
                  utteranceLoadingId != null
                }
              >
                <span className="history-utterance-order">
                  {utterance.order + 1}
                </span>

                <span className="history-utterance-copy">
                  <span>
                    <strong>
                      {utterance.speaker
                        .displayName}
                    </strong>
                    <i
                      className={
                        utterance.transcription
                          .status ===
                        "CONFIRMED"
                          ? "confirmed"
                          : "draft"
                      }
                    >
                      {utterance.transcription
                        .status ===
                      "CONFIRMED"
                        ? "확정"
                        : "검토 중"}
                    </i>
                  </span>
                  <p>
                    {utterance.transcription
                      .currentText ||
                      utterance.transcription
                        .originalText}
                  </p>
                  <small>
                    {formatDate(
                      utterance.createdAt
                    )}
                  </small>
                </span>

                <span className="history-utterance-open">
                  {utteranceLoadingId ===
                  utterance.id
                    ? "불러오는 중..."
                    : "발언 보기"}
                  <ChevronRight size={16} />
                </span>
              </button>
            )
          )
        )}
      </div>
    </div>
  );
}

function HistoryLoading() {
  return (
    <div className="history-empty">
      <div className="history-empty-icon">
        <RotateCcw
          size={25}
          className="history-loading-icon"
        />
      </div>
      <strong>
        서버 대화 기록을 불러오는 중입니다
      </strong>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
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
