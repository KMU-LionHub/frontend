import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import RecordingPanel from "./RecordingPanel";

afterEach(cleanup);

describe("RecordingPanel", () => {
  it("blocks a new recording while processing", () => {
    render(
      <RecordingPanel
        isRecording={false}
        isProcessing
        elapsedTime={7}
        transcript=""
        onRecordToggle={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", {
        name: "녹음 처리 중",
      })
    ).toBeDisabled();
    expect(
      screen.getByText(
        "음성을 처리하고 있습니다. 잠시만 기다려주세요."
      )
    ).toBeInTheDocument();
  });

  it("keeps the stop control available while recording", () => {
    render(
      <RecordingPanel
        isRecording
        isProcessing={false}
        elapsedTime={3}
        transcript=""
        onRecordToggle={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", {
        name: "녹음 종료",
      })
    ).toBeEnabled();
  });

  it("requires an active conversation before recording", () => {
    render(
      <RecordingPanel
        isRecording={false}
        isProcessing={false}
        canRecord={false}
        disabledReason="대화 설정을 먼저 완료해주세요."
        elapsedTime={0}
        transcript=""
        onRecordToggle={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", {
        name: "녹음 준비 필요",
      })
    ).toBeDisabled();
    expect(
      screen.getAllByText(
        "대화 설정을 먼저 완료해주세요."
      ).length
    ).toBeGreaterThan(0);
  });
});
