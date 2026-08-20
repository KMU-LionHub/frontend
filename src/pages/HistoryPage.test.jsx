import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  findDraftUtterance,
  getConversationHistoryDetail,
  listConversationHistory,
  loadUtteranceHistoryRecord,
} from "../api/historyApi";
import HistoryPage from "./HistoryPage";

vi.mock("../api/historyApi", () => ({
  listConversationHistory: vi.fn(),
  getConversationHistoryDetail:
    vi.fn(),
  loadUtteranceHistoryRecord:
    vi.fn(),
  findDraftUtterance: vi.fn(),
}));

const summary = {
  id: 5,
  title: "여행 이야기",
  context: "친구와 여행 회고",
  status: "CLOSED",
  utteranceCount: 2,
  createdAt:
    "2026-08-21T00:00:00",
  updatedAt:
    "2026-08-21T00:01:00",
};

const detail = {
  ...summary,
  participants: [
    {
      id: 8,
      type: "SELF",
      displayName: "사용자",
    },
    {
      id: 9,
      type: "OTHER",
      displayName: "민지",
    },
  ],
  utterances: [
    {
      id: 12,
      order: 0,
      speaker: {
        id: 9,
        displayName: "민지",
      },
      transcription: {
        id: 21,
        status: "CONFIRMED",
        originalText: "원문",
        currentText: "첫 번째 발언",
      },
      createdAt:
        "2026-08-21T00:00:10",
      updatedAt:
        "2026-08-21T00:00:11",
    },
  ],
};

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listConversationHistory
      .mockResolvedValue({
        conversations: [summary],
        page: 0,
        size: 12,
        totalElements: 1,
        totalPages: 1,
      });
    getConversationHistoryDetail
      .mockResolvedValue(detail);
    findDraftUtterance.mockReturnValue(
      null
    );
  });

  afterEach(cleanup);

  it("loads server conversations and opens an utterance", async () => {
    const onOpenConversation = vi.fn();
    const record = {
      source: "SERVER",
      conversationId: 5,
      utteranceId: 12,
      transcript: "첫 번째 발언",
    };
    loadUtteranceHistoryRecord
      .mockResolvedValue(record);

    render(
      <HistoryPage
        onOpenConversation={
          onOpenConversation
        }
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("여행 이야기")
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByTitle("기록 삭제")
    ).not.toBeInTheDocument();
    expect(
      listConversationHistory
    ).toHaveBeenCalledWith({
      page: 0,
      size: 12,
    });

    fireEvent.click(
      screen
        .getByText("여행 이야기")
        .closest("button")
    );

    await waitFor(() => {
      expect(
        screen.getByText("첫 번째 발언")
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen
        .getByText("첫 번째 발언")
        .closest("button")
    );

    await waitFor(() => {
      expect(
        onOpenConversation
      ).toHaveBeenCalledWith(record);
    });
  });

  it("resumes the latest draft in an active conversation", async () => {
    const draft = {
      ...detail.utterances[0],
      transcription: {
        ...detail.utterances[0]
          .transcription,
        status: "DRAFT",
      },
    };
    const activeDetail = {
      ...detail,
      status: "ACTIVE",
      utterances: [draft],
    };
    const record = {
      source: "SERVER",
      conversationId: 5,
      utteranceId: 12,
      transcriptionStatus: "DRAFT",
    };
    const onResumeConversation = vi.fn();

    getConversationHistoryDetail
      .mockResolvedValue(activeDetail);
    findDraftUtterance.mockReturnValue(
      draft
    );
    loadUtteranceHistoryRecord
      .mockResolvedValue(record);

    render(
      <HistoryPage
        onResumeConversation={
          onResumeConversation
        }
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("여행 이야기")
      ).toBeInTheDocument();
    });
    fireEvent.click(
      screen
        .getByText("여행 이야기")
        .closest("button")
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "이 대화 이어가기",
        })
      ).toBeEnabled();
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "이 대화 이어가기",
      })
    );

    await waitFor(() => {
      expect(
        onResumeConversation
      ).toHaveBeenCalledWith({
        conversation: activeDetail,
        record,
      });
    });
  });
});
