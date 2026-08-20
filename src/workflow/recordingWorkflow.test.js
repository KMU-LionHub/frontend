import {
  describe,
  expect,
  it,
} from "vitest";

import {
  initialRecordingWorkflow,
  isProcessingPhase,
  RecordingAction,
  RecordingPhase,
  recordingWorkflowReducer,
} from "./recordingWorkflow";

describe("recordingWorkflowReducer", () => {
  it("moves through the recording pipeline", () => {
    const actions = [
      {
        type:
          RecordingAction.REQUEST_PERMISSION,
      },
      {
        type:
          RecordingAction.START_RECORDING,
      },
      {
        type: RecordingAction.TICK,
      },
      {
        type:
          RecordingAction.STOP_RECORDING,
        elapsedTime: 7,
      },
      {
        type:
          RecordingAction.TRANSCRIPTION_COMPLETE,
      },
      {
        type:
          RecordingAction.START_ANALYSIS,
      },
      {
        type: RecordingAction.COMPLETE,
      },
    ];

    const finalState = actions.reduce(
      recordingWorkflowReducer,
      initialRecordingWorkflow
    );

    expect(finalState).toEqual({
      phase: RecordingPhase.COMPLETED,
      progress: 100,
      elapsedTime: 7,
    });
  });

  it("counts time only while recording", () => {
    const idleState =
      recordingWorkflowReducer(
        initialRecordingWorkflow,
        {
          type: RecordingAction.TICK,
        }
      );

    const recordingState =
      recordingWorkflowReducer(
        {
          ...initialRecordingWorkflow,
          phase:
            RecordingPhase.RECORDING,
        },
        {
          type: RecordingAction.TICK,
        }
      );

    expect(idleState).toBe(
      initialRecordingWorkflow
    );
    expect(
      recordingState.elapsedTime
    ).toBe(1);
  });

  it("identifies phases that block a new recording", () => {
    expect(
      isProcessingPhase(
        RecordingPhase.REQUESTING_PERMISSION
      )
    ).toBe(true);
    expect(
      isProcessingPhase(
        RecordingPhase.ANALYZING
      )
    ).toBe(true);
    expect(
      isProcessingPhase(
        RecordingPhase.RECORDING
      )
    ).toBe(false);
    expect(
      isProcessingPhase(
        RecordingPhase.COMPLETED
      )
    ).toBe(false);
  });

  it("restores a completed recording safely", () => {
    const state =
      recordingWorkflowReducer(
        initialRecordingWorkflow,
        {
          type:
            RecordingAction.RESTORE_COMPLETED,
          elapsedTime: "12.9",
        }
      );

    expect(state).toEqual({
      phase: RecordingPhase.COMPLETED,
      progress: 100,
      elapsedTime: 12,
    });
  });
});
