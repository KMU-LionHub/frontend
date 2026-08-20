import { apiRequest } from "./apiClient";

export function createTranscription(
  audioBlob
) {
  return apiRequest(
    "/api/stt/transcriptions",
    createAudioRequest(
      audioBlob,
      "음성을 텍스트로 변환하지 못했습니다."
    )
  );
}

export function correctTranscriptionWord({
  transcriptionId,
  wordId,
  text,
}) {
  return apiRequest(
    `/api/stt/transcriptions/${transcriptionId}/words/${wordId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({ text }),
      defaultErrorMessage:
        "단어를 수정하지 못했습니다.",
    }
  );
}

export function rerecordTranscription({
  transcriptionId,
  audioBlob,
}) {
  return apiRequest(
    `/api/stt/transcriptions/${transcriptionId}/re-record`,
    createAudioRequest(
      audioBlob,
      "재발언을 텍스트로 변환하지 못했습니다."
    )
  );
}

function createAudioRequest(
  audioBlob,
  defaultErrorMessage
) {
  const formData = new FormData();

  formData.append(
    "audio",
    audioBlob,
    getAudioFilename(audioBlob.type)
  );

  return {
    method: "POST",
    body: formData,
    defaultErrorMessage,
  };
}

function getAudioFilename(contentType) {
  if (contentType?.includes("mp4")) {
    return "recording.m4a";
  }

  if (contentType?.includes("ogg")) {
    return "recording.ogg";
  }

  if (contentType?.includes("mpeg")) {
    return "recording.mp3";
  }

  return "recording.webm";
}
