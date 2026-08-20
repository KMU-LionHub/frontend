import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import ConversationSessionPanel from "./ConversationSessionPanel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const session = {
  id: 22,
  title: "여행 일정 조율",
  context: "친구와 여행 계획",
  status: "ACTIVE",
  participants: [
    {
      id: 33,
      type: "SELF",
      displayName: "사용자",
    },
    {
      id: 34,
      type: "OTHER",
      displayName: "민지",
    },
  ],
  utterances: [],
};

describe("ConversationSessionPanel", () => {
  it("creates a session with context and participants", async () => {
    const onCreateSession = vi.fn()
      .mockResolvedValue({});

    render(
      <ConversationSessionPanel
        onCreateSession={
          onCreateSession
        }
      />
    );

    fireEvent.change(
      screen.getByLabelText(
        /대화 제목/
      ),
      {
        target: {
          value: "여행 일정 조율",
        },
      }
    );
    fireEvent.change(
      screen.getByLabelText(
        /대화 배경/
      ),
      {
        target: {
          value: "친구와 여행 계획",
        },
      }
    );
    fireEvent.change(
      screen.getByLabelText(
        /상대 참여자/
      ),
      {
        target: {
          value: "민지",
        },
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "추가",
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "이 설정으로 대화 시작",
      })
    );

    await waitFor(() => {
      expect(
        onCreateSession
      ).toHaveBeenCalledWith({
        title: "여행 일정 조율",
        context: "친구와 여행 계획",
        participantNames: ["민지"],
      });
    });
  });

  it("selects a speaker before recording", () => {
    const onSelectSpeaker = vi.fn();

    render(
      <ConversationSessionPanel
        session={session}
        currentSpeakerParticipantId={33}
        onSelectSpeaker={
          onSelectSpeaker
        }
      />
    );

    expect(
      screen.getByRole("button", {
        name: /사용자/,
      })
    ).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "민지",
      })
    );

    expect(
      onSelectSpeaker
    ).toHaveBeenCalledWith(34);
  });

  it("requires a resolved analysis before the next utterance", () => {
    const onFinalizeUtterance =
      vi.fn();
    const activeSession = {
      ...session,
      utterances: [
        {
          id: 44,
        },
      ],
    };
    const { rerender } = render(
      <ConversationSessionPanel
        session={activeSession}
        currentSpeakerParticipantId={33}
        hasCurrentUtterance
        canFinalizeUtterance={false}
        onFinalizeUtterance={
          onFinalizeUtterance
        }
      />
    );

    expect(
      screen.getByRole("button", {
        name: "발언 확정 후 다음",
      })
    ).toBeDisabled();

    rerender(
      <ConversationSessionPanel
        session={activeSession}
        currentSpeakerParticipantId={33}
        hasCurrentUtterance
        canFinalizeUtterance
        onFinalizeUtterance={
          onFinalizeUtterance
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "발언 확정 후 다음",
      })
    );

    expect(
      onFinalizeUtterance
    ).toHaveBeenCalledOnce();
  });

  it("shows a read-only banner for a stored utterance", () => {
    const onExitHistory = vi.fn();

    render(
      <ConversationSessionPanel
        historyRecord={{
          conversationTitle:
            "저장된 여행 대화",
          conversationContext:
            "친구와 여행 이야기",
          speaker: {
            displayName: "민지",
          },
        }}
        onExitHistory={onExitHistory}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: "저장된 여행 대화",
      })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name:
          "새 대화 설정으로 돌아가기",
      })
    );

    expect(
      onExitHistory
    ).toHaveBeenCalledOnce();
  });
});
