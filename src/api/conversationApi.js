import { apiRequest } from "./apiClient";

export function listConversations({
  page = 0,
  size = 20,
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  return apiRequest(
    `/api/conversations?${query}`
  );
}

export function getConversation(
  conversationId
) {
  return apiRequest(
    `/api/conversations/${conversationId}`
  );
}

export function createConversation({
  title,
  context,
  participantNames = [],
}) {
  return apiRequest(
    "/api/conversations",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        title,
        context: context || null,
        participants:
          participantNames.map(
            (displayName) => ({
              displayName,
            })
          ),
      }),
      defaultErrorMessage:
        "대화를 생성하지 못했습니다.",
    }
  );
}

export function addConversationUtterance({
  conversationId,
  transcriptionId,
  speakerParticipantId,
}) {
  return apiRequest(
    `/api/conversations/${conversationId}/utterances`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        transcriptionId,
        speakerParticipantId,
      }),
      defaultErrorMessage:
        "발언을 대화에 추가하지 못했습니다.",
    }
  );
}

export function replaceUtteranceTranscription({
  conversationId,
  utteranceId,
  transcriptionId,
}) {
  return apiRequest(
    `/api/conversations/${conversationId}/utterances/${utteranceId}/transcription`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        transcriptionId,
      }),
      defaultErrorMessage:
        "재발언을 대화에 연결하지 못했습니다.",
    }
  );
}

export function confirmConversationUtterance({
  conversationId,
  utteranceId,
}) {
  return apiRequest(
    `/api/conversations/${conversationId}/utterances/${utteranceId}/confirm`,
    {
      method: "POST",
      defaultErrorMessage:
        "현재 발언을 확정하지 못했습니다.",
    }
  );
}

export function closeConversation(
  conversationId
) {
  return apiRequest(
    `/api/conversations/${conversationId}/close`,
    {
      method: "POST",
      defaultErrorMessage:
        "대화를 종료하지 못했습니다.",
    }
  );
}
