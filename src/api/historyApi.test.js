import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  getConversation,
  listConversations,
} from "./conversationApi";
import {
  getContextAnalysis,
  getContextAnalysisHistory,
} from "./contextAnalysisApi";
import {
  findDraftUtterance,
  getConversationHistoryDetail,
  listConversationHistory,
  loadUtteranceHistoryRecord,
} from "./historyApi";
import {
  getTranscription,
} from "./transcriptionApi";

vi.mock("./conversationApi", () => ({
  listConversations: vi.fn(),
  getConversation: vi.fn(),
}));
vi.mock("./transcriptionApi", () => ({
  getTranscription: vi.fn(),
}));
vi.mock("./contextAnalysisApi", () => ({
  getContextAnalysis: vi.fn(),
  getContextAnalysisHistory: vi.fn(),
}));

describe("historyApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates conversation list and detail", async () => {
    listConversations.mockResolvedValue({});
    getConversation.mockResolvedValue({});

    await listConversationHistory({
      page: 1,
      size: 10,
    });
    await getConversationHistoryDetail(5);

    expect(
      listConversations
    ).toHaveBeenCalledWith({
      page: 1,
      size: 10,
    });
    expect(
      getConversation
    ).toHaveBeenCalledWith(5);
  });

  it("combines transcription words with the best analysis", async () => {
    const conversation = {
      id: 5,
      title: "여행 이야기",
      context: "친구와 대화",
      status: "CLOSED",
    };
    const utterance = {
      id: 12,
      order: 0,
      speaker: {
        id: 8,
        displayName: "민지",
      },
      transcription: {
        id: 21,
      },
      createdAt:
        "2026-08-21T00:00:00",
      updatedAt:
        "2026-08-21T00:00:01",
    };

    getTranscription.mockResolvedValue({
      id: 21,
      status: "CONFIRMED",
      originalText: "원문",
      currentText: "교정 문장",
      words: [
        {
          id: 100,
          order: 0,
          currentText: "교정",
          endOffsetMillis: 1250,
        },
      ],
    });
    getContextAnalysisHistory
      .mockResolvedValue({
        analyses: [
          {
            id: 31,
            stale: false,
            usableResolution: false,
          },
          {
            id: 30,
            stale: false,
            usableResolution: true,
          },
        ],
      });
    getContextAnalysis.mockResolvedValue({
      id: 30,
      fullyResolved: true,
      usableResolution: true,
      ambiguities: [],
    });

    const record =
      await loadUtteranceHistoryRecord({
        conversation,
        utterance,
      });

    expect(
      getContextAnalysis
    ).toHaveBeenCalledWith(30);
    expect(record).toEqual(
      expect.objectContaining({
        source: "SERVER",
        conversationId: 5,
        utteranceId: 12,
        transcriptionId: 21,
        analysisId: 30,
        transcript: "교정 문장",
        elapsedTime: 2,
      })
    );
  });

  it("finds the latest draft utterance", () => {
    const draft = {
      id: 13,
      order: 2,
      transcription: {
        status: "DRAFT",
      },
    };

    expect(
      findDraftUtterance({
        utterances: [
          {
            id: 11,
            order: 0,
            transcription: {
              status: "CONFIRMED",
            },
          },
          draft,
        ],
      })
    ).toBe(draft);
  });
});
