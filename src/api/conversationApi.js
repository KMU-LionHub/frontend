import { apiRequest } from "./apiClient";

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
