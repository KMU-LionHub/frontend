import { apiRequest } from "./apiClient";

export const ContextResolutionType =
  Object.freeze({
    CANDIDATE: "CANDIDATE",
    CUSTOM: "CUSTOM",
    DISMISSED: "DISMISSED",
  });

export function analyzeContext({
  conversationId,
  utteranceId,
  candidateCount = 3,
  model = "GEMINI_3_7_FLASH",
}) {
  return apiRequest(
    "/api/context-analyses",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        conversationId,
        utteranceId,
        candidateCount,
        model,
      }),
      defaultErrorMessage:
        "발언의 맥락을 분석하지 못했습니다.",
    }
  );
}

export function resolveContextAmbiguity({
  analysisId,
  ambiguityId,
  type,
  candidateId = null,
  text = null,
}) {
  return apiRequest(
    `/api/context-analyses/${analysisId}/ambiguities/${ambiguityId}/resolution`,
    {
      method: "PUT",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(
        createResolutionBody({
          type,
          candidateId,
          text,
        })
      ),
      defaultErrorMessage:
        "모호한 표현의 맥락을 확정하지 못했습니다.",
    }
  );
}

function createResolutionBody({
  type,
  candidateId,
  text,
}) {
  switch (type) {
    case ContextResolutionType.CANDIDATE:
      return {
        type,
        candidateId,
      };
    case ContextResolutionType.CUSTOM:
      return {
        type,
        text,
      };
    case ContextResolutionType.DISMISSED:
      return { type };
    default:
      throw new Error(
        "지원하지 않는 맥락 확정 유형입니다."
      );
  }
}
