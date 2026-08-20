import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { apiRequest } from "./apiClient";
import {
  replaceUtteranceTranscription,
} from "./conversationApi";

vi.mock("./apiClient", () => ({
  apiRequest: vi.fn(),
}));

describe("conversationApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValue({});
  });

  it("replaces the transcription connected to an utterance", async () => {
    await replaceUtteranceTranscription({
      conversationId: 5,
      utteranceId: 12,
      transcriptionId: 22,
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/conversations/5/utterances/12/transcription",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          transcriptionId: 22,
        }),
      })
    );
  });
});
