export const RecordingPhase =
  Object.freeze({
    IDLE: "IDLE",
    REQUESTING_PERMISSION:
      "REQUESTING_PERMISSION",
    RECORDING: "RECORDING",
    TRANSCRIBING: "TRANSCRIBING",
    PREPARING_ANALYSIS:
      "PREPARING_ANALYSIS",
    ANALYZING: "ANALYZING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
  });

export const RecordingAction =
  Object.freeze({
    REQUEST_PERMISSION:
      "REQUEST_PERMISSION",
    START_RECORDING: "START_RECORDING",
    TICK: "TICK",
    STOP_RECORDING: "STOP_RECORDING",
    TRANSCRIPTION_COMPLETE:
      "TRANSCRIPTION_COMPLETE",
    START_ANALYSIS: "START_ANALYSIS",
    COMPLETE: "COMPLETE",
    FAIL: "FAIL",
    RESTORE_COMPLETED:
      "RESTORE_COMPLETED",
    RESET: "RESET",
  });

export const initialRecordingWorkflow =
  Object.freeze({
    phase: RecordingPhase.IDLE,
    progress: 0,
    elapsedTime: 0,
  });

export function recordingWorkflowReducer(
  state,
  action
) {
  switch (action.type) {
    case RecordingAction.REQUEST_PERMISSION:
      return {
        phase:
          RecordingPhase.REQUESTING_PERMISSION,
        progress: 0,
        elapsedTime: 0,
      };

    case RecordingAction.START_RECORDING:
      return {
        phase: RecordingPhase.RECORDING,
        progress: 0,
        elapsedTime: 0,
      };

    case RecordingAction.TICK:
      if (
        state.phase !==
        RecordingPhase.RECORDING
      ) {
        return state;
      }

      return {
        ...state,
        elapsedTime:
          state.elapsedTime + 1,
      };

    case RecordingAction.STOP_RECORDING:
      return {
        phase: RecordingPhase.TRANSCRIBING,
        progress: 20,
        elapsedTime:
          normalizeElapsedTime(
            action.elapsedTime
          ),
      };

    case RecordingAction.TRANSCRIPTION_COMPLETE:
      return {
        ...state,
        phase:
          RecordingPhase.PREPARING_ANALYSIS,
        progress: 40,
      };

    case RecordingAction.START_ANALYSIS:
      return {
        ...state,
        phase: RecordingPhase.ANALYZING,
        progress: 70,
      };

    case RecordingAction.COMPLETE:
      return {
        ...state,
        phase: RecordingPhase.COMPLETED,
        progress: 100,
      };

    case RecordingAction.FAIL:
      return {
        ...state,
        phase: RecordingPhase.FAILED,
        progress: 0,
      };

    case RecordingAction.RESTORE_COMPLETED:
      return {
        phase: RecordingPhase.COMPLETED,
        progress: 100,
        elapsedTime:
          normalizeElapsedTime(
            action.elapsedTime
          ),
      };

    case RecordingAction.RESET:
      return {
        ...initialRecordingWorkflow,
      };

    default:
      return state;
  }
}

export function isRecordingPhase(phase) {
  return phase ===
    RecordingPhase.RECORDING;
}

export function isProcessingPhase(phase) {
  return [
    RecordingPhase.REQUESTING_PERMISSION,
    RecordingPhase.TRANSCRIBING,
    RecordingPhase.PREPARING_ANALYSIS,
    RecordingPhase.ANALYZING,
  ].includes(phase);
}

function normalizeElapsedTime(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(number)
  );
}
