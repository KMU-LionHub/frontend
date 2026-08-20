export const RecordingPhase =
  Object.freeze({
    IDLE: "IDLE",
    REQUESTING_PERMISSION:
      "REQUESTING_PERMISSION",
    RECORDING: "RECORDING",
    TRANSCRIBING: "TRANSCRIBING",
    PREPARING_TRANSCRIPT:
      "PREPARING_TRANSCRIPT",
    REVIEWING_TRANSCRIPT:
      "REVIEWING_TRANSCRIPT",
    UPDATING_TRANSCRIPT:
      "UPDATING_TRANSCRIPT",
    CONFIRMING_UTTERANCE:
      "CONFIRMING_UTTERANCE",
    ANALYZING: "ANALYZING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
  });

export const RecordingMode =
  Object.freeze({
    NEW: "NEW",
    RERECORD: "RERECORD",
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
    READY_FOR_REVIEW:
      "READY_FOR_REVIEW",
    START_TRANSCRIPT_UPDATE:
      "START_TRANSCRIPT_UPDATE",
    START_CONFIRMING_UTTERANCE:
      "START_CONFIRMING_UTTERANCE",
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
    mode: null,
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
        elapsedTime:
          action.mode ===
          RecordingMode.RERECORD
            ? state.elapsedTime
            : 0,
        mode:
          action.mode ||
          RecordingMode.NEW,
      };

    case RecordingAction.START_RECORDING:
      return {
        phase: RecordingPhase.RECORDING,
        progress: 0,
        elapsedTime: 0,
        mode:
          state.mode ||
          RecordingMode.NEW,
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
        mode: state.mode,
      };

    case RecordingAction.TRANSCRIPTION_COMPLETE:
      return {
        ...state,
        phase:
          RecordingPhase.PREPARING_TRANSCRIPT,
        progress: 40,
      };

    case RecordingAction.READY_FOR_REVIEW:
      return {
        ...state,
        phase:
          RecordingPhase.REVIEWING_TRANSCRIPT,
        progress: 50,
        elapsedTime:
          action.elapsedTime == null
            ? state.elapsedTime
            : normalizeElapsedTime(
                action.elapsedTime
              ),
        mode: null,
      };

    case RecordingAction.START_TRANSCRIPT_UPDATE:
      return {
        ...state,
        phase:
          RecordingPhase.UPDATING_TRANSCRIPT,
        progress: 50,
        mode: null,
      };

    case RecordingAction.START_CONFIRMING_UTTERANCE:
      return {
        ...state,
        phase:
          RecordingPhase.CONFIRMING_UTTERANCE,
        progress: 100,
        mode: null,
      };

    case RecordingAction.START_ANALYSIS:
      return {
        ...state,
        phase: RecordingPhase.ANALYZING,
        progress: 70,
        mode: null,
      };

    case RecordingAction.COMPLETE:
      return {
        ...state,
        phase: RecordingPhase.COMPLETED,
        progress: 100,
        mode: null,
      };

    case RecordingAction.FAIL:
      return {
        ...state,
        phase: RecordingPhase.FAILED,
        progress: 0,
        mode: null,
      };

    case RecordingAction.RESTORE_COMPLETED:
      return {
        phase: RecordingPhase.COMPLETED,
        progress: 100,
        elapsedTime:
          normalizeElapsedTime(
            action.elapsedTime
          ),
        mode: null,
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
    RecordingPhase.PREPARING_TRANSCRIPT,
    RecordingPhase.UPDATING_TRANSCRIPT,
    RecordingPhase.CONFIRMING_UTTERANCE,
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
