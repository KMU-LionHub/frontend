import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { apiRequest } from "./apiClient";
import {
  addConversationUtterance,
  closeConversation,
  confirmConversationUtterance,
  createConversation,
  getConversation,
  listConversations,
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

  it("creates a conversation with context and participants", async () => {
    await createConversation({
      title: "여행 일정 조율",
      context: "친구와 여행 계획",
      participantNames: [
        "민지",
        "현우",
      ],
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/conversations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "여행 일정 조율",
          context: "친구와 여행 계획",
          participants: [
            {
              displayName: "민지",
            },
            {
              displayName: "현우",
            },
          ],
        }),
      })
    );
  });

  it("adds and confirms an utterance", async () => {
    await addConversationUtterance({
      conversationId: 5,
      transcriptionId: 21,
      speakerParticipantId: 8,
    });
    await confirmConversationUtterance({
      conversationId: 5,
      utteranceId: 12,
    });

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/conversations/5/utterances",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          transcriptionId: 21,
          speakerParticipantId: 8,
        }),
      })
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/conversations/5/utterances/12/confirm",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("closes a completed conversation", async () => {
    await closeConversation(5);

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/conversations/5/close",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("lists and loads owned conversations", async () => {
    await listConversations({
      page: 2,
      size: 10,
    });
    await getConversation(5);

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/conversations?page=2&size=10"
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/conversations/5"
    );
  });
});
