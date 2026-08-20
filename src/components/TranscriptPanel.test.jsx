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

import {
  RecordingPhase,
} from "../workflow/recordingWorkflow";
import TranscriptPanel from "./TranscriptPanel";

afterEach(cleanup);

const words = [
  {
    id: 10,
    order: 0,
    originalText: "의사소퉁",
    correctedText: null,
    currentText: "의사소퉁",
    confidence: 0.62,
  },
  {
    id: 11,
    order: 1,
    originalText: "도우미",
    correctedText: null,
    currentText: "도우미",
    confidence: 0.95,
  },
];

describe("TranscriptPanel", () => {
  it("edits a selected backend word", async () => {
    const onCorrectWord = vi.fn()
      .mockResolvedValue({});

    render(
      <TranscriptPanel
        transcript="의사소퉁 도우미"
        words={words}
        analysisStatus={
          RecordingPhase.REVIEWING_TRANSCRIPT
        }
        canAnalyze
        onCorrectWord={onCorrectWord}
        onRerecordToggle={vi.fn()}
        onAnalyze={vi.fn()}
      />
    );

    const lowConfidenceWord =
      screen.getByRole("button", {
        name: "의사소퉁 단어 수정",
      });

    expect(lowConfidenceWord).toHaveClass(
      "low-confidence"
    );

    fireEvent.click(lowConfidenceWord);
    fireEvent.change(
      screen.getByLabelText(
        "교정할 단어"
      ),
      {
        target: {
          value: "의사소통",
        },
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "단어 저장",
      })
    );

    await waitFor(() => {
      expect(
        onCorrectWord
      ).toHaveBeenCalledWith(
        10,
        "의사소통"
      );
    });

    expect(
      screen.queryByLabelText(
        "교정할 단어"
      )
    ).not.toBeInTheDocument();
  });

  it("starts analysis only from the review state", () => {
    const onAnalyze = vi.fn();
    const { rerender } = render(
      <TranscriptPanel
        transcript="의사소통 도우미"
        words={words}
        analysisStatus={
          RecordingPhase.REVIEWING_TRANSCRIPT
        }
        canAnalyze
        onCorrectWord={vi.fn()}
        onRerecordToggle={vi.fn()}
        onAnalyze={onAnalyze}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "AI 분석 시작",
      })
    );

    expect(onAnalyze).toHaveBeenCalledOnce();

    rerender(
      <TranscriptPanel
        transcript="의사소통 도우미"
        words={words}
        analysisStatus={
          RecordingPhase.COMPLETED
        }
        canAnalyze={false}
        onCorrectWord={vi.fn()}
        onRerecordToggle={vi.fn()}
        onAnalyze={onAnalyze}
      />
    );

    expect(
      screen.getByRole("button", {
        name: "분석 완료",
      })
    ).toBeDisabled();
  });

  it("keeps the re-record stop action available while recording", () => {
    const onRerecordToggle = vi.fn();

    render(
      <TranscriptPanel
        transcript="의사소통 도우미"
        words={words}
        analysisStatus={
          RecordingPhase.RECORDING
        }
        isRecording
        isRerecording
        onCorrectWord={vi.fn()}
        onRerecordToggle={
          onRerecordToggle
        }
        onAnalyze={vi.fn()}
      />
    );

    const stopButton =
      screen.getByRole("button", {
        name: "재발언 녹음 종료",
      });

    expect(stopButton).toBeEnabled();
    fireEvent.click(stopButton);
    expect(
      onRerecordToggle
    ).toHaveBeenCalledOnce();
  });
});
