import {
  describe,
  expect,
  it,
} from "vitest";

import {
  initialRecordingWorkflow,
  isProcessingPhase,
  RecordingAction,
  RecordingMode,
  RecordingPhase,
  recordingWorkflowReducer,
} from "./recordingWorkflow";

describe("recordingWorkflowReducer", () => {
  it("moves through the recording pipeline", () => {
    const actions = [
      {
        type:
          RecordingAction.REQUEST_PERMISSION,
        mode: RecordingMode.NEW,
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
          RecordingAction.READY_FOR_REVIEW,
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
      mode: null,
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
        RecordingPhase.CONFIRMING_UTTERANCE
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
      mode: null,
    });
  });

  it("preserves the previous duration while requesting a re-recording", () => {
    const state =
      recordingWorkflowReducer(
        {
          phase:
            RecordingPhase.COMPLETED,
          progress: 100,
          elapsedTime: 15,
          mode: null,
        },
        {
          type:
            RecordingAction.REQUEST_PERMISSION,
          mode:
            RecordingMode.RERECORD,
        }
      );

    expect(state).toEqual({
      phase:
        RecordingPhase.REQUESTING_PERMISSION,
      progress: 0,
      elapsedTime: 15,
      mode: RecordingMode.RERECORD,
    });
  });
});
