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

import Header from "./Header";
import {
  RecordingPhase,
} from "../workflow/recordingWorkflow";

afterEach(cleanup);

describe("Header", () => {
  it("shows the workflow status and labels logout", () => {
    render(
      <Header
        workflowStatus={
          RecordingPhase.RECORDING
        }
        nickname="사용자"
        email="user@example.com"
        onLogout={vi.fn()}
      />
    );

    expect(
      screen.getByText("녹음 중")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "로그아웃",
      })
    ).toBeInTheDocument();
  });
});
