import {
  getConversation,
  listConversations,
} from "./conversationApi";
import {
  getContextAnalysis,
  getContextAnalysisHistory,
} from "./contextAnalysisApi";
import {
  getTranscription,
} from "./transcriptionApi";

export function listConversationHistory(
  options
) {
  return listConversations(options);
}

export function getConversationHistoryDetail(
  conversationId
) {
  return getConversation(conversationId);
}

export async function loadUtteranceHistoryRecord({
  conversation,
  utterance,
}) {
  const [transcription, analysisHistory] =
    await Promise.all([
      getTranscription(
        utterance.transcription.id
      ),
      getContextAnalysisHistory({
        conversationId: conversation.id,
        utteranceId: utterance.id,
      }),
    ]);

  const analysisSummary =
    selectAnalysisSummary(
      analysisHistory.analyses
    );
  const contextAnalysis =
    analysisSummary
      ? await getContextAnalysis(
          analysisSummary.id
        )
      : null;

  return {
    id:
      `server-conversation-${conversation.id}-utterance-${utterance.id}`,
    source: "SERVER",
    conversationId: conversation.id,
    conversationTitle:
      conversation.title,
    conversationContext:
      conversation.context,
    conversationStatus:
      conversation.status,
    speaker: utterance.speaker,
    transcriptionId:
      transcription.id,
    utteranceId: utterance.id,
    analysisId:
      contextAnalysis?.id ?? null,
    transcript:
      transcription.currentText ||
      transcription.originalText ||
      "",
    annotations:
      Array.isArray(transcription.words)
        ? transcription.words
        : [],
    contextAnalysis,
    elapsedTime:
      getTranscriptionDuration(
        transcription.words
      ),
    transcriptionStatus:
      transcription.status,
    createdAt: utterance.createdAt,
    updatedAt: utterance.updatedAt,
  };
}

export function findDraftUtterance(
  conversation
) {
  const utterances =
    Array.isArray(conversation?.utterances)
      ? conversation.utterances
      : [];

  return (
    [...utterances]
      .sort(
        (a, b) =>
          Number(b.order ?? 0) -
          Number(a.order ?? 0)
      )
      .find(
        (utterance) =>
          utterance.transcription
            ?.status === "DRAFT"
      ) || null
  );
}

function selectAnalysisSummary(analyses) {
  if (!Array.isArray(analyses)) {
    return null;
  }

  return (
    analyses.find(
      (analysis) =>
        analysis.usableResolution
    ) ||
    analyses.find(
      (analysis) => !analysis.stale
    ) ||
    analyses[0] ||
    null
  );
}

function getTranscriptionDuration(words) {
  if (!Array.isArray(words)) {
    return 0;
  }

  const lastOffset = words.reduce(
    (maximum, word) =>
      Math.max(
        maximum,
        Number(
          word.endOffsetMillis
        ) || 0
      ),
    0
  );

  return Math.ceil(lastOffset / 1000);
}
