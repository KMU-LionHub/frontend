import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { apiRequest } from "./apiClient";
import {
  analyzeContext,
  ContextResolutionType,
  getContextAnalysis,
  getContextAnalysisHistory,
  resolveContextAmbiguity,
} from "./contextAnalysisApi";

vi.mock("./apiClient", () => ({
  apiRequest: vi.fn(),
}));

describe("contextAnalysisApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValue({});
  });

  it("requests grouped context analysis", async () => {
    await analyzeContext({
      conversationId: 5,
      utteranceId: 12,
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/context-analyses",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          conversationId: 5,
          utteranceId: 12,
          candidateCount: 3,
          model: "GEMINI_3_7_FLASH",
        }),
      })
    );
  });

  it.each([
    {
      type:
        ContextResolutionType.CANDIDATE,
      candidateId: 31,
      text: null,
      expected: {
        type: "CANDIDATE",
        candidateId: 31,
      },
    },
    {
      type: ContextResolutionType.CUSTOM,
      candidateId: null,
      text: "직접 입력한 의미",
      expected: {
        type: "CUSTOM",
        text: "직접 입력한 의미",
      },
    },
    {
      type:
        ContextResolutionType.DISMISSED,
      candidateId: null,
      text: null,
      expected: {
        type: "DISMISSED",
      },
    },
  ])(
    "sends a $type resolution",
    async ({
      type,
      candidateId,
      text,
      expected,
    }) => {
      await resolveContextAmbiguity({
        analysisId: 20,
        ambiguityId: 21,
        type,
        candidateId,
        text,
      });

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/context-analyses/20/ambiguities/21/resolution",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(expected),
        })
      );
    }
  );

  it("loads analysis history and detail", async () => {
    await getContextAnalysisHistory({
      conversationId: 5,
      utteranceId: 12,
    });
    await getContextAnalysis(20);

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/context-analyses?conversationId=5&utteranceId=12"
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/context-analyses/20"
    );
  });
});
