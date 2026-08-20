import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import RecordingPanel from "./components/RecordingPanel";
import AnalysisProgress from "./components/AnalysisProgress";
import TranscriptPanel from "./components/TranscriptPanel";
import ContextPanel from "./components/ContextPanel";
import ConversationSessionPanel from "./components/ConversationSessionPanel";

import HistoryPage from "./pages/HistoryPage";
import HelpPage from "./pages/HelpPage";

import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";

import {
  getAccessToken,
  getStoredUser,
  logout,
} from "./api/authApi";
import {
  apiRequest,
  subscribeToAuthExpiration,
} from "./api/apiClient";
import {
  correctTranscriptionWord,
  createTranscription,
  rerecordTranscription,
} from "./api/transcriptionApi";
import {
  addConversationUtterance,
  closeConversation,
  confirmConversationUtterance,
  createConversation,
  replaceUtteranceTranscription,
} from "./api/conversationApi";

import {
  saveConversation,
} from "./db/conversationDb";
import {
  initialRecordingWorkflow,
  isProcessingPhase,
  isRecordingPhase,
  RecordingAction,
  RecordingMode,
  RecordingPhase,
  recordingWorkflowReducer,
} from "./workflow/recordingWorkflow";

import "./App.css";

function App() {
  // ========================================
  // 인증
  // ========================================

  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(
    () => !!getAccessToken()
  );

  const [
    authPage,
    setAuthPage,
  ] = useState("login");

  const [
    currentUser,
    setCurrentUser,
  ] = useState(
    () => getStoredUser()
  );

  // ========================================
  // 메뉴
  // ========================================

  const [
    activeMenu,
    setActiveMenu,
  ] = useState("record");

  const [
    conversationSession,
    setConversationSession,
  ] = useState(null);

  const [
    currentSpeakerParticipantId,
    setCurrentSpeakerParticipantId,
  ] = useState(null);

  const [
    isSessionPending,
    setIsSessionPending,
  ] = useState(false);

  // ========================================
  // 녹음
  // ========================================

  const [
    recordingWorkflow,
    dispatchRecording,
  ] = useReducer(
    recordingWorkflowReducer,
    initialRecordingWorkflow
  );

  const {
    phase: analysisStatus,
    progress: analysisProgress,
    elapsedTime,
    mode: recordingMode,
  } = recordingWorkflow;

  const isRecording =
    isRecordingPhase(
      analysisStatus
    );

  const isProcessing =
    isProcessingPhase(
      analysisStatus
    );

  const isRerecording =
    recordingMode ===
    RecordingMode.RERECORD;

  const mediaRecorderRef =
    useRef(null);

  const streamRef =
    useRef(null);

  const chunksRef =
    useRef([]);

  const operationLockRef =
    useRef(false);

  const discardRecordingRef =
    useRef(false);

  const recordingStartedAtRef =
    useRef(null);

  const recordedDurationRef =
    useRef(0);

  const previousDurationRef =
    useRef(0);

  const recordingAttemptRef =
    useRef(0);

  // ========================================
  // 마이크 종료
  // ========================================

  const stopMicrophone =
    useCallback(() => {
      if (!streamRef.current) {
        return;
      }

      streamRef.current
        .getTracks()
        .forEach(
          (track) => {
            track.stop();
          }
        );

      streamRef.current =
        null;
    }, []);

  const [
    transcriptionId,
    setTranscriptionId,
  ] = useState(null);

  const [
    conversationId,
    setConversationId,
  ] = useState(null);

  const [
    utteranceId,
    setUtteranceId,
  ] = useState(null);

  const [
    analysisId,
    setAnalysisId,
  ] = useState(null);

  // ========================================
  // 결과
  // ========================================

  const [
    transcript,
    setTranscript,
  ] = useState("");

  const [
    contexts,
    setContexts,
  ] = useState([]);

  const [
    transcriptWords,
    setTranscriptWords,
  ] = useState([]);

  const [
    selectedContextId,
    setSelectedContextId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const hasCurrentUtterance =
    utteranceId != null;

  const canFinalizeCurrentUtterance =
    hasCurrentUtterance &&
    analysisStatus ===
      RecordingPhase.COMPLETED &&
    areAllAmbiguitiesResolved(
      contexts
    );

  const canStartNewUtterance =
    conversationSession?.id != null &&
    currentSpeakerParticipantId != null &&
    !hasCurrentUtterance &&
    !isSessionPending;

  // ========================================
  // 인증 만료
  // ========================================

  useEffect(() => {
    return subscribeToAuthExpiration(
      () => {
        recordingAttemptRef.current +=
          1;
        discardRecordingRef.current =
          true;

        const recorder =
          mediaRecorderRef.current;

        if (
          recorder &&
          recorder.state !==
            "inactive"
        ) {
          operationLockRef.current =
            true;
          recorder.stop();
        } else {
          operationLockRef.current =
            false;
        }

        stopMicrophone();
        recordingStartedAtRef.current =
          null;
        recordedDurationRef.current =
          0;
        previousDurationRef.current =
          0;

        setCurrentUser(null);
        setIsLoggedIn(false);
        setAuthPage("login");
        setActiveMenu("record");
        setConversationSession(null);
        setCurrentSpeakerParticipantId(
          null
        );
        setIsSessionPending(false);
        setTranscriptionId(null);
        setConversationId(null);
        setUtteranceId(null);
        setAnalysisId(null);
        setTranscript("");
        setContexts([]);
        setTranscriptWords([]);
        setSelectedContextId(null);
        setError("");

        dispatchRecording({
          type: RecordingAction.RESET,
        });
      }
    );
  }, [stopMicrophone]);

  // ========================================
  // 로그인 성공
  // ========================================

  const handleLoginSuccess = (
    user
  ) => {
    setCurrentUser(
      user ||
        getStoredUser()
    );

    setIsLoggedIn(true);
    setError("");

    dispatchRecording({
      type: RecordingAction.RESET,
    });
  };

  // ========================================
  // 로그아웃
  // ========================================

  const handleLogout = () => {
    logout();

    setCurrentUser(null);
    setIsLoggedIn(false);
    setAuthPage("login");
    setActiveMenu("record");

    resetConversation();
  };

  // ========================================
  // 메뉴 변경
  // ========================================

  const handleMenuChange = (
    menu
  ) => {
    setActiveMenu(menu);
  };

  // ========================================
  // 녹음 타이머
  // ========================================

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const timer =
      setInterval(() => {
        dispatchRecording({
          type:
            RecordingAction.TICK,
        });
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isRecording]);

  // ========================================
  // 종료 시 마이크 정리
  // ========================================

  useEffect(() => {
    return () => {
      recordingAttemptRef.current +=
        1;
      discardRecordingRef.current =
        true;

      const recorder =
        mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state !==
          "inactive"
      ) {
        recorder.stop();
      }

      stopMicrophone();
    };
  }, [stopMicrophone]);

  // ========================================
  // 녹음 시작
  // ========================================

  const startRecording =
    async (
      mode = RecordingMode.NEW
    ) => {
      if (
        operationLockRef.current ||
        isProcessing ||
        isRecording
      ) {
        return;
      }

      if (
        mode ===
          RecordingMode.RERECORD &&
        (
          transcriptionId == null ||
          conversationId == null ||
          utteranceId == null
        )
      ) {
        setError(
          "재발언할 전사 정보를 찾을 수 없습니다."
        );
        return;
      }

      if (
        mode === RecordingMode.NEW &&
        !canStartNewUtterance
      ) {
        setError(
          hasCurrentUtterance
            ? "현재 발언을 확정한 뒤 다음 발언을 녹음해주세요."
            : "대화를 시작하고 이번 발언의 화자를 선택해주세요."
        );
        return;
      }

      operationLockRef.current =
        true;
      previousDurationRef.current =
        elapsedTime;
      const attemptId =
        recordingAttemptRef.current +
        1;
      recordingAttemptRef.current =
        attemptId;
      discardRecordingRef.current =
        false;

      dispatchRecording({
        type:
          RecordingAction.REQUEST_PERMISSION,
        mode,
      });

      try {
        setError("");

        if (
          !navigator.mediaDevices
            ?.getUserMedia ||
          typeof MediaRecorder ===
            "undefined"
        ) {
          throw new Error(
            "이 브라우저는 음성 녹음을 지원하지 않습니다."
          );
        }

        const stream =
          await navigator
            .mediaDevices
            .getUserMedia({
              audio: {
                echoCancellation:
                  true,

                noiseSuppression:
                  true,
              },
            });

        if (
          attemptId !==
          recordingAttemptRef.current
        ) {
          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );
          return;
        }

        streamRef.current =
          stream;

        let options = {};

        if (
          MediaRecorder
            .isTypeSupported(
              "audio/webm;codecs=opus"
            )
        ) {
          options = {
            mimeType:
              "audio/webm;codecs=opus",
          };
        }

        const recorder =
          new MediaRecorder(
            stream,
            options
          );

        mediaRecorderRef.current =
          recorder;

        chunksRef.current = [];

        recorder.ondataavailable =
          (event) => {
            if (
              event.data.size >
              0
            ) {
              chunksRef.current.push(
                event.data
              );
            }
          };

        recorder.onstop =
          async () => {
            if (
              discardRecordingRef.current
            ) {
              discardRecordingRef.current =
                false;
              stopMicrophone();
              chunksRef.current = [];
              mediaRecorderRef.current =
                null;
              operationLockRef.current =
                false;
              recordingStartedAtRef.current =
                null;
              return;
            }

            const blob =
              new Blob(
                chunksRef.current,
                {
                  type:
                    recorder.mimeType ||
                    "audio/webm",
                }
              );

            stopMicrophone();

            try {
              await processRecording(
                blob,
                recordedDurationRef.current,
                mode
              );
            } finally {
              chunksRef.current = [];
              mediaRecorderRef.current =
                null;
              operationLockRef.current =
                false;
              recordingStartedAtRef.current =
                null;
            }
          };

        recorder.start();

        if (
          mode === RecordingMode.NEW
        ) {
          resetAnalysisResult();
        }

        recordingStartedAtRef.current =
          new Date().getTime();
        recordedDurationRef.current =
          0;

        dispatchRecording({
          type:
            RecordingAction.START_RECORDING,
        });

        operationLockRef.current =
          false;
      } catch (err) {
        if (
          attemptId !==
          recordingAttemptRef.current
        ) {
          return;
        }

        console.error(
          "녹음 시작 실패:",
          err
        );

        stopMicrophone();
        operationLockRef.current =
          false;

        dispatchRecording(
          mode ===
            RecordingMode.RERECORD
            ? {
                type:
                  RecordingAction.READY_FOR_REVIEW,
                elapsedTime:
                  previousDurationRef.current,
              }
            : {
                type:
                  RecordingAction.FAIL,
              }
        );

        setError(
          err.message ||
            "마이크를 사용할 수 없습니다. 브라우저 마이크 권한을 확인해주세요."
        );
      }
    };

  // ========================================
  // 녹음 종료
  // ========================================

  const stopRecording = () => {
    const recorder =
      mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state !==
        "inactive"
    ) {
      operationLockRef.current =
        true;

      const startedAt =
        recordingStartedAtRef.current;
      const elapsedTimeValue =
        startedAt == null
          ? elapsedTime
          : Math.floor(
              (new Date().getTime() -
                startedAt) /
                1000
            );

      recordedDurationRef.current =
        elapsedTimeValue;

      dispatchRecording({
        type:
          RecordingAction.STOP_RECORDING,
        elapsedTime:
          elapsedTimeValue,
      });

      recorder.stop();
    }
  };

  // ========================================
  // 녹음 버튼
  // ========================================

  const handleRecordButton =
    () => {
      const recorder =
        mediaRecorderRef.current;

      if (
        recorder?.state ===
        "recording"
      ) {
        stopRecording();
        return;
      }

      if (
        operationLockRef.current ||
        isProcessing
      ) {
        return;
      }

      startRecording(
        RecordingMode.NEW
      );
    };

  const handleRerecordButton =
    () => {
      const recorder =
        mediaRecorderRef.current;

      if (
        recorder?.state ===
          "recording" &&
        isRerecording
      ) {
        stopRecording();
        return;
      }

      if (
        recorder?.state ===
          "recording" ||
        operationLockRef.current ||
        isProcessing
      ) {
        return;
      }

      startRecording(
        RecordingMode.RERECORD
      );
    };

  // ========================================
  // 전체 녹음 처리
  // ========================================

  const processRecording =
    async (
      blob,
      elapsedTimeValue,
      mode
    ) => {
      try {
        setError("");

        const isReplacement =
          mode ===
          RecordingMode.RERECORD;

        const transcription =
          isReplacement
            ? await rerecordTranscription({
                transcriptionId,
                audioBlob: blob,
              })
            : await createTranscription(
                blob
              );

        const newTranscriptionId =
          transcription.id;

        if (
          newTranscriptionId == null
        ) {
          throw new Error(
            "전사 ID를 받지 못했습니다."
          );
        }

        const text =
          transcription.currentText ||
          transcription.originalText ||
          "";

        const words =
          Array.isArray(
            transcription.words
          )
            ? transcription.words
            : [];

        dispatchRecording({
          type:
            RecordingAction.TRANSCRIPTION_COMPLETE,
        });

        if (isReplacement) {
          const updatedUtterance =
            await replaceUtteranceTranscription({
              conversationId,
              utteranceId,
              transcriptionId:
                newTranscriptionId,
            });

          setTranscriptionId(
            newTranscriptionId
          );
          setTranscript(text);
          setTranscriptWords(words);
          setAnalysisId(null);
          setContexts([]);
          setSelectedContextId(null);
          setConversationSession(
            (current) => {
              if (!current) {
                return current;
              }

              return {
                ...current,
                utterances:
                  (
                    Array.isArray(
                      current.utterances
                    )
                      ? current.utterances
                      : []
                  ).map(
                    (item) =>
                      item.id ===
                      updatedUtterance.id
                        ? updatedUtterance
                        : item
                  ),
              };
            }
          );

          await persistConversation({
            transcriptionIdValue:
              newTranscriptionId,
            analysisIdValue: null,
            transcriptValue: text,
            contextsValue: [],
            transcriptWordsValue: words,
            selectedContextIdValue:
              null,
            elapsedTimeValue:
              elapsedTimeValue,
          });

          dispatchRecording({
            type:
              RecordingAction.READY_FOR_REVIEW,
            elapsedTime:
              elapsedTimeValue,
          });
          return;
        }

        setTranscriptionId(
          newTranscriptionId
        );
        setTranscript(text);
        setTranscriptWords(words);

        const newConversationId =
          conversationSession?.id;

        if (
          newConversationId == null ||
          currentSpeakerParticipantId ==
            null
        ) {
          throw new Error(
            "대화 또는 화자 정보를 찾을 수 없습니다."
          );
        }

        setConversationId(
          newConversationId
        );

        const utterance =
          await addConversationUtterance({
            conversationId:
              newConversationId,

            transcriptionId:
              newTranscriptionId,

            speakerParticipantId:
              currentSpeakerParticipantId,
          });

        const newUtteranceId =
          utterance.id;

        if (
          newUtteranceId == null
        ) {
          throw new Error(
            "발언 ID를 받지 못했습니다."
          );
        }

        setUtteranceId(
          newUtteranceId
        );
        setConversationSession(
          (current) => {
            if (
              current?.id !==
              newConversationId
            ) {
              return current;
            }

            const currentUtterances =
              Array.isArray(
                current.utterances
              )
                ? current.utterances
                : [];

            return {
              ...current,
              utterances: [
                ...currentUtterances.filter(
                  (item) =>
                    item.id !==
                    utterance.id
                ),
                utterance,
              ],
            };
          }
        );

        await persistConversation({
          conversationIdValue:
            newConversationId,

          transcriptionIdValue:
            newTranscriptionId,

          utteranceIdValue:
            newUtteranceId,

          analysisIdValue: null,

          transcriptValue:
            text,

          contextsValue: [],

          transcriptWordsValue:
            words,

          selectedContextIdValue: null,

          elapsedTimeValue:
            elapsedTimeValue,
        });

        dispatchRecording({
          type:
            RecordingAction.READY_FOR_REVIEW,
          elapsedTime:
            elapsedTimeValue,
        });
      } catch (err) {
        console.error(
          "녹음 처리 실패:",
          err
        );

        dispatchRecording(
          mode ===
            RecordingMode.RERECORD
            ? {
                type:
                  RecordingAction.READY_FOR_REVIEW,
                elapsedTime:
                  previousDurationRef.current,
              }
            : {
                type:
                  RecordingAction.FAIL,
              }
        );

        setError(
          err.message ||
            "녹음 처리 중 오류가 발생했습니다."
        );
      }
    };

  // ========================================
  // AI 맥락 분석
  // ========================================

  const createContextAnalysis =
    async ({
      conversationId,
      utteranceId,
    }) => {
      return apiRequest(
        "/api/context-analyses",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            conversationId,
            utteranceId,
            candidateCount: 3,
            model:
              "GEMINI_3_7_FLASH",
          }),
          defaultErrorMessage:
            "발언의 맥락을 분석하지 못했습니다.",
        }
      );
    };

  // ========================================
  // 전사 검토 후 AI 분석 시작
  // ========================================

  const handleAnalyzeTranscript =
    async () => {
      if (
        operationLockRef.current ||
        isProcessing ||
        isRecording
      ) {
        return;
      }

      if (
        conversationId == null ||
        utteranceId == null ||
        transcriptionId == null
      ) {
        setError(
          "분석할 전사 정보를 찾을 수 없습니다."
        );
        return;
      }

      operationLockRef.current =
        true;
      setError("");

      dispatchRecording({
        type:
          RecordingAction.START_ANALYSIS,
      });

      try {
        const analysis =
          await createContextAnalysis({
            conversationId,
            utteranceId,
          });

        if (analysis.id == null) {
          throw new Error(
            "분석 ID를 받지 못했습니다."
          );
        }

        const normalizedContexts =
          normalizeContextCandidates(
            analysis
          );
        const alreadySelected =
          normalizedContexts.find(
            (context) =>
              context.selected
          );
        const newSelectedContextId =
          alreadySelected?.id ??
          null;

        setAnalysisId(analysis.id);
        setContexts(
          normalizedContexts
        );
        setSelectedContextId(
          newSelectedContextId
        );

        await persistConversation({
          analysisIdValue:
            analysis.id,
          contextsValue:
            normalizedContexts,
          selectedContextIdValue:
            newSelectedContextId,
        });

        dispatchRecording({
          type:
            RecordingAction.COMPLETE,
        });
      } catch (err) {
        console.error(
          "맥락 분석 실패:",
          err
        );

        dispatchRecording({
          type:
            RecordingAction.READY_FOR_REVIEW,
        });

        setError(
          err.message ||
            "발언의 맥락을 분석하지 못했습니다."
        );
      } finally {
        operationLockRef.current =
          false;
      }
    };

  // ========================================
  // IndexedDB 저장
  // ========================================

  const persistConversation =
    async ({
      conversationIdValue =
        conversationId,

      transcriptionIdValue =
        transcriptionId,

      utteranceIdValue =
        utteranceId,

      analysisIdValue =
        analysisId,

      transcriptValue =
        transcript,

      contextsValue =
        contexts,

      transcriptWordsValue =
        transcriptWords,

      selectedContextIdValue =
        selectedContextId,

      elapsedTimeValue =
        elapsedTime,
    } = {}) => {
      if (
        conversationIdValue == null ||
        utteranceIdValue == null
      ) {
        return;
      }

      const speaker =
        conversationSession
          ?.participants
          ?.find(
            (participant) =>
              participant.id ===
              currentSpeakerParticipantId
          ) || null;

      try {
        await saveConversation({
          id:
            `conversation-${conversationIdValue}-utterance-${utteranceIdValue}`,

          conversationId:
            conversationIdValue,

          conversationTitle:
            conversationSession?.title ||
            null,

          conversationContext:
            conversationSession?.context ||
            null,

          speaker,

          transcriptionId:
            transcriptionIdValue,

          utteranceId:
            utteranceIdValue,

          analysisId:
            analysisIdValue,

          transcript:
            transcriptValue ||
            "",

          contexts:
            Array.isArray(
              contextsValue
            )
              ? contextsValue
              : [],

          annotations:
            Array.isArray(
              transcriptWordsValue
            )
              ? transcriptWordsValue
              : [],

          selectedContextId:
            selectedContextIdValue ??
            null,

          elapsedTime:
            elapsedTimeValue ??
            0,

          updatedAt:
            new Date()
              .toISOString(),
        });
      } catch (err) {
        console.error(
          "대화 기록 저장 실패:",
          err
        );
      }
    };

  // ========================================
  // 단어 교정
  // ========================================

  const handleCorrectWord =
    async (
      wordId,
      correctedText
    ) => {
      if (
        transcriptionId == null
      ) {
        throw new Error(
          "수정할 전사 정보를 찾을 수 없습니다."
        );
      }

      if (
        operationLockRef.current ||
        isProcessing ||
        isRecording
      ) {
        throw new Error(
          "진행 중인 작업이 끝난 뒤 다시 시도해주세요."
        );
      }

      const text = String(
        correctedText || ""
      ).trim();

      if (!text) {
        throw new Error(
          "수정할 단어를 입력해주세요."
        );
      }

      operationLockRef.current =
        true;
      setError("");

      dispatchRecording({
        type:
          RecordingAction.START_TRANSCRIPT_UPDATE,
      });

      try {
        const updatedTranscription =
          await correctTranscriptionWord({
            transcriptionId,
            wordId,
            text,
          });

        const updatedText =
          updatedTranscription.currentText ||
          updatedTranscription.originalText ||
          "";
        const updatedWords =
          Array.isArray(
            updatedTranscription.words
          )
            ? updatedTranscription.words
            : [];

        setTranscript(updatedText);
        setTranscriptWords(
          updatedWords
        );
        setAnalysisId(null);
        setContexts([]);
        setSelectedContextId(null);

        await persistConversation({
          analysisIdValue: null,
          transcriptValue: updatedText,
          contextsValue: [],
          transcriptWordsValue:
            updatedWords,
          selectedContextIdValue:
            null,
        });

        dispatchRecording({
          type:
            RecordingAction.READY_FOR_REVIEW,
        });

        return updatedTranscription;
      } catch (err) {
        console.error(
          "단어 수정 실패:",
          err
        );

        dispatchRecording({
          type:
            RecordingAction.READY_FOR_REVIEW,
        });

        setError(
          err.message ||
            "단어를 수정하지 못했습니다."
        );

        throw err;
      } finally {
        operationLockRef.current =
          false;
      }

    };

  // ========================================
  // 후보 선택
  // ========================================

  const handleSelectContext =
    async (
      contextId
    ) => {
      try {
        setError("");

        const context =
          contexts.find(
            (item) =>
              item.id ===
              contextId
          );

        if (!context) {
          throw new Error(
            "선택한 맥락 후보를 찾을 수 없습니다."
          );
        }

        const candidateId =
          Number(
            context.id
          );

        if (
          !Number.isFinite(
            candidateId
          )
        ) {
          throw new Error(
            "후보 ID가 올바르지 않습니다."
          );
        }

        await apiRequest(
          `/api/context-analyses/${context.analysisId}/ambiguities/${context.ambiguityId}/selection`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              candidateId,
            }),
            defaultErrorMessage:
              "맥락 후보를 선택하지 못했습니다.",
          }
        );

        const updatedContexts =
          contexts.map(
            (item) => ({
              ...item,

              selected:
                item.id ===
                contextId,
            })
          );

        setContexts(
          updatedContexts
        );

        setSelectedContextId(
          contextId
        );

        await persistConversation({
          contextsValue:
            updatedContexts,

          selectedContextIdValue:
            contextId,
        });
      } catch (err) {
        console.error(
          "맥락 선택 실패:",
          err
        );

        setError(
          err.message ||
            "맥락 선택에 실패했습니다."
        );
      }
    };

  // ========================================
  // 맥락 직접 수정
  //
  // 여기서는 프론트 상태만 수정.
  // 최종 확정할 때 CUSTOM으로 백엔드 전송.
  // ========================================

  const handleEditContext =
    async (
      context,
      text
    ) => {
      try {
        setError("");

        if (!context) {
          throw new Error(
            "수정할 맥락이 없습니다."
          );
        }

        const trimmedText =
          String(
            text ||
            ""
          ).trim();

        if (!trimmedText) {
          throw new Error(
            "수정할 내용을 입력해주세요."
          );
        }

        const updatedContexts =
          contexts.map(
            (item) =>
              item.id ===
              context.id
                ? {
                    ...item,

                    editedText:
                      trimmedText,

                    finalText:
                      trimmedText,

                    wasEdited:
                      true,
                  }
                : item
          );

        setContexts(
          updatedContexts
        );

        await persistConversation({
          contextsValue:
            updatedContexts,

          selectedContextIdValue:
            selectedContextId,
        });
      } catch (err) {
        console.error(
          "맥락 수정 실패:",
          err
        );

        setError(
          err.message ||
            "맥락 수정에 실패했습니다."
        );

        throw err;
      }
    };

  // ========================================
  // 맥락 최종 확정
  //
  // 백엔드 실제 규칙:
  //
  // CANDIDATE
  // - candidateId 필요
  // - text 있으면 안 됨
  //
  // CUSTOM
  // - candidateId 있으면 안 됨
  // - text 필요
  //
  // DISMISSED
  // - 둘 다 없어야 함
  // ========================================

  const handleResolveContext =
    async (
      context,
      finalText
    ) => {
      try {
        setError("");

        if (!context) {
          throw new Error(
            "선택된 맥락이 없습니다."
          );
        }

        if (
          context.analysisId ==
            null ||
          context.ambiguityId ==
            null
        ) {
          throw new Error(
            "맥락 분석 정보를 찾을 수 없습니다."
          );
        }

        const candidateId =
          Number(
            context.id
          );

        if (
          !Number.isFinite(
            candidateId
          )
        ) {
          throw new Error(
            "후보 ID가 올바르지 않습니다."
          );
        }

        const customText =
          String(
            finalText ||
            context.editedText ||
            context.finalText ||
            ""
          ).trim();

        let requestBody;

        // ========================================
        // 직접 수정한 경우 → CUSTOM
        // ========================================

        if (
          context.wasEdited ===
            true &&
          customText
        ) {
          requestBody = {
            type:
              "CUSTOM",

            text:
              customText,
          };
        }

        // ========================================
        // 후보 그대로 확정 → CANDIDATE
        // ========================================

        else {
          requestBody = {
            type:
              "CANDIDATE",

            candidateId,
          };
        }

        const data = await apiRequest(
          `/api/context-analyses/${context.analysisId}/ambiguities/${context.ambiguityId}/resolution`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              requestBody
            ),
            defaultErrorMessage:
              "맥락을 확정하지 못했습니다.",
          }
        );

        const resolvedText =
          context.wasEdited
            ? customText
            : (
                context.interpretation ||
                context.title ||
                ""
              );

        const updatedContexts =
          contexts.map(
            (item) =>
              item.id ===
              context.id
                ? {
                    ...item,

                    selected:
                      true,

                    resolved:
                      true,

                    finalText:
                      resolvedText,
                  }
                : item
          );

        setContexts(
          updatedContexts
        );

        setSelectedContextId(
          context.id
        );

        await persistConversation({
          contextsValue:
            updatedContexts,

          selectedContextIdValue:
            context.id,
        });

        return data;
      } catch (err) {
        console.error(
          "맥락 확정 실패:",
          err
        );

        setError(
          err.message ||
            "맥락 확정에 실패했습니다."
        );

        throw err;
      }
    };

  // ========================================
  // 대화 기록 열기
  // ========================================

  const handleOpenConversation =
    (
      conversation
    ) => {
      setConversationSession(null);
      setCurrentSpeakerParticipantId(
        null
      );

      setTranscript(
        conversation.transcript ||
          ""
      );

      setContexts(
        Array.isArray(
          conversation.contexts
        )
          ? conversation.contexts
          : []
      );

      setTranscriptWords(
        Array.isArray(
          conversation.annotations
        )
          ? conversation.annotations
          : []
      );

      setSelectedContextId(
        conversation
          .selectedContextId ??
          null
      );

      recordedDurationRef.current =
        conversation.elapsedTime ??
        0;

      setTranscriptionId(
        conversation
          .transcriptionId ??
          null
      );

      setConversationId(
        conversation
          .conversationId ??
          null
      );

      setUtteranceId(
        conversation
          .utteranceId ??
          null
      );

      setAnalysisId(
        conversation
          .analysisId ??
          null
      );

      dispatchRecording(
        conversation.analysisId == null
          ? {
              type:
                RecordingAction.READY_FOR_REVIEW,
              elapsedTime:
                conversation.elapsedTime ??
                0,
            }
          : {
              type:
                RecordingAction.RESTORE_COMPLETED,
              elapsedTime:
                conversation.elapsedTime ??
                0,
            }
      );

      setError("");

      setActiveMenu(
        "record"
      );
    };

  // ========================================
  // 분석 초기화
  // ========================================

  const resetAnalysisResult =
    () => {
      setTranscriptionId(
        null
      );

      setUtteranceId(
        null
      );

      setAnalysisId(
        null
      );

      dispatchRecording({
        type: RecordingAction.RESET,
      });

      setTranscript("");

      setContexts([]);

      setTranscriptWords([]);

      setSelectedContextId(
        null
      );
    };

  // ========================================
  // 전체 초기화
  // ========================================

  const resetConversation =
    () => {
      recordingAttemptRef.current +=
        1;
      discardRecordingRef.current =
        true;

      const recorder =
        mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state !==
          "inactive"
      ) {
        operationLockRef.current =
          true;
        recorder.stop();
      } else {
        operationLockRef.current =
          false;
      }

      stopMicrophone();
      recordingStartedAtRef.current =
        null;
      recordedDurationRef.current =
        0;
      previousDurationRef.current =
        0;

      resetAnalysisResult();

      setConversationId(null);
      setConversationSession(null);
      setCurrentSpeakerParticipantId(
        null
      );
      setIsSessionPending(false);

      setError("");
    };

  // ========================================
  // 대화 세션 생성
  // ========================================

  const handleCreateConversationSession =
    async ({
      title,
      context,
      participantNames,
    }) => {
      if (
        operationLockRef.current ||
        isSessionPending
      ) {
        throw new Error(
          "진행 중인 작업이 끝난 뒤 다시 시도해주세요."
        );
      }

      operationLockRef.current =
        true;
      setIsSessionPending(true);
      setError("");

      try {
        const session =
          await createConversation({
            title,
            context,
            participantNames,
          });
        const selfParticipant =
          findSelfParticipant(
            session,
            currentUser
          );

        if (
          session.id == null ||
          selfParticipant?.id == null
        ) {
          throw new Error(
            "생성된 대화의 참여자 정보를 확인할 수 없습니다."
          );
        }

        resetAnalysisResult();
        setConversationSession({
          ...session,
          utterances:
            Array.isArray(
              session.utterances
            )
              ? session.utterances
              : [],
        });
        setConversationId(session.id);
        setCurrentSpeakerParticipantId(
          selfParticipant.id
        );

        return session;
      } catch (err) {
        console.error(
          "대화 생성 실패:",
          err
        );
        setError(
          err.message ||
            "대화를 생성하지 못했습니다."
        );
        throw err;
      } finally {
        operationLockRef.current =
          false;
        setIsSessionPending(false);
      }
    };

  const handleSelectSpeaker = (
    participantId
  ) => {
    if (
      hasCurrentUtterance ||
      isProcessing ||
      isSessionPending
    ) {
      return;
    }

    const exists =
      conversationSession?.participants
        ?.some(
          (participant) =>
            participant.id ===
            participantId
        );

    if (exists) {
      setCurrentSpeakerParticipantId(
        participantId
      );
    }
  };

  // ========================================
  // 현재 발언 확정 및 다음 발언 준비
  // ========================================

  const handleFinalizeCurrentUtterance =
    async () => {
      if (
        !canFinalizeCurrentUtterance ||
        conversationId == null ||
        utteranceId == null ||
        operationLockRef.current
      ) {
        return;
      }

      operationLockRef.current =
        true;
      setError("");

      dispatchRecording({
        type:
          RecordingAction.START_CONFIRMING_UTTERANCE,
      });

      try {
        const confirmedUtterance =
          await confirmConversationUtterance({
            conversationId,
            utteranceId,
          });

        setConversationSession(
          (current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              utterances:
                (
                  Array.isArray(
                    current.utterances
                  )
                    ? current.utterances
                    : []
                ).map(
                  (item) =>
                    item.id ===
                    confirmedUtterance.id
                      ? confirmedUtterance
                      : item
                ),
            };
          }
        );

        resetAnalysisResult();
        recordingStartedAtRef.current =
          null;
        recordedDurationRef.current =
          0;
        previousDurationRef.current =
          0;
      } catch (err) {
        console.error(
          "발언 확정 실패:",
          err
        );

        dispatchRecording({
          type:
            RecordingAction.RESTORE_COMPLETED,
          elapsedTime,
        });
        setError(
          err.message ||
            "현재 발언을 확정하지 못했습니다."
        );
      } finally {
        operationLockRef.current =
          false;
      }
    };

  // ========================================
  // 대화 종료
  // ========================================

  const handleCloseConversationSession =
    async () => {
      if (
        !conversationSession?.id ||
        hasCurrentUtterance ||
        operationLockRef.current
      ) {
        return;
      }

      operationLockRef.current =
        true;
      setIsSessionPending(true);
      setError("");

      try {
        await closeConversation(
          conversationSession.id
        );
        resetAnalysisResult();
        setConversationId(null);
        setConversationSession(null);
        setCurrentSpeakerParticipantId(
          null
        );
      } catch (err) {
        console.error(
          "대화 종료 실패:",
          err
        );
        setError(
          err.message ||
            "대화를 종료하지 못했습니다."
        );
        throw err;
      } finally {
        operationLockRef.current =
          false;
        setIsSessionPending(false);
      }
    };

  // ========================================
  // 로그인 전
  // ========================================

  if (!isLoggedIn) {
    if (
      authPage ===
      "signup"
    ) {
      return (
        <SignupPage
          onGoLogin={() =>
            setAuthPage(
              "login"
            )
          }
        />
      );
    }

    return (
      <LoginPage
        onLoginSuccess={
          handleLoginSuccess
        }

        onGoSignup={() =>
          setAuthPage(
            "signup"
          )
        }
      />
    );
  }

  // ========================================
  // 메인
  // ========================================

  return (
    <div className="dashboard-shell">
      <Sidebar
        activeMenu={
          activeMenu
        }

        onMenuChange={
          handleMenuChange
        }

        onLogout={
          handleLogout
        }
      />

      <div className="dashboard-main">
        <Header
          nickname={
            currentUser
              ?.nickname
          }

          email={
            currentUser
              ?.email
          }

          workflowStatus={
            analysisStatus
          }

          onLogout={
            handleLogout
          }
        />

        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}

        <main className="dashboard-content">
          {activeMenu ===
          "history" ? (
            <HistoryPage
              onOpenConversation={
                handleOpenConversation
              }
            />
          ) : activeMenu ===
            "help" ? (
            <HelpPage />
          ) : (
            <div className="record-workspace">
              <ConversationSessionPanel
                session={
                  conversationSession
                }
                currentSpeakerParticipantId={
                  currentSpeakerParticipantId
                }
                hasCurrentUtterance={
                  hasCurrentUtterance &&
                  conversationSession != null
                }
                canFinalizeUtterance={
                  canFinalizeCurrentUtterance
                }
                isBusy={
                  isProcessing ||
                  isRecording ||
                  isSessionPending
                }
                onCreateSession={
                  handleCreateConversationSession
                }
                onSelectSpeaker={
                  handleSelectSpeaker
                }
                onFinalizeUtterance={
                  handleFinalizeCurrentUtterance
                }
                onCloseSession={
                  handleCloseConversationSession
                }
              />

              <div className="dashboard-grid">
              {/* 왼쪽 */}

              <div className="dashboard-left-column">
                <RecordingPanel
                  isRecording={
                    isRecording
                  }

                  isProcessing={
                    isProcessing ||
                    isSessionPending
                  }

                  canRecord={
                    canStartNewUtterance
                  }

                  disabledReason={
                    conversationSession == null
                      ? "대화 설정을 먼저 완료해주세요."
                      : hasCurrentUtterance
                        ? "현재 발언을 확정한 뒤 다음 발언을 녹음할 수 있습니다."
                        : "이번 발언의 화자를 선택해주세요."
                  }

                  elapsedTime={
                    elapsedTime
                  }

                  transcript={
                    transcript
                  }

                  onRecordToggle={
                    handleRecordButton
                  }
                />

                <TranscriptPanel
                  key={
                    transcriptionId ??
                    "no-transcription"
                  }

                  transcript={
                    transcript
                  }

                  words={
                    transcriptWords
                  }

                  analysisStatus={
                    analysisStatus
                  }

                  isRecording={
                    isRecording
                  }

                  isRerecording={
                    isRerecording
                  }

                  isProcessing={
                    isProcessing
                  }

                  canAnalyze={
                    analysisStatus ===
                    RecordingPhase.REVIEWING_TRANSCRIPT
                  }

                  onCorrectWord={
                    handleCorrectWord
                  }

                  onRerecordToggle={
                    handleRerecordButton
                  }

                  onAnalyze={
                    handleAnalyzeTranscript
                  }
                />
              </div>

              {/* 오른쪽 */}

              <div className="dashboard-right-column">
                <AnalysisProgress
                  progress={
                    analysisProgress
                  }

                  status={
                    analysisStatus
                  }
                />

                <ContextPanel
                  key={`${
                    analysisId ??
                    "no-analysis"
                  }-${
                    selectedContextId ??
                    "no-selection"
                  }`}

                  contexts={
                    contexts
                  }

                  selectedContextId={
                    selectedContextId
                  }

                  onSelectContext={
                    handleSelectContext
                  }

                  onEditContext={
                    handleEditContext
                  }

                  onResolveContext={
                    handleResolveContext
                  }

                  analysisCompleted={
                    analysisStatus ===
                    RecordingPhase.COMPLETED
                  }

                  isAnalyzing={
                    analysisStatus ===
                    RecordingPhase.ANALYZING
                  }

                  awaitingTranscriptReview={
                    analysisStatus ===
                    RecordingPhase.REVIEWING_TRANSCRIPT
                  }
                />
              </div>
            </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ========================================
// SELF 참여자 찾기
// ========================================

function findSelfParticipant(
  conversation,
  currentUser
) {
  const participants =
    Array.isArray(
      conversation?.participants
    )
      ? conversation.participants
      : [];

  const self =
    participants.find(
      (participant) =>
        participant?.type ===
        "SELF"
    );

  if (self) {
    return self;
  }

  if (
    currentUser?.id !=
    null
  ) {
    return (
      participants.find(
        (participant) =>
          Number(
            participant
              ?.userId
          ) ===
          Number(
            currentUser.id
          )
      ) ||
      null
    );
  }

  return null;
}

// ========================================
// AI 후보 정규화
// ========================================

function normalizeContextCandidates(
  analysis
) {
  if (
    !analysis ||
    !Array.isArray(
      analysis.ambiguities
    )
  ) {
    return [];
  }

  const result = [];

  analysis.ambiguities.forEach(
    (ambiguity) => {
      if (
        !Array.isArray(
          ambiguity.candidates
        )
      ) {
        return;
      }

      ambiguity.candidates
        .forEach(
          (candidate) => {
            result.push({
              ...candidate,

              id:
                Number(
                  candidate.id
                ),

              analysisId:
                Number(
                  analysis.id
                ),

              ambiguityId:
                Number(
                  ambiguity.id
                ),

              excerpt:
                ambiguity.excerpt,

              title:
                candidate
                  .inferredIntent ||
                candidate
                  .interpretation ||
                "맥락 후보",

              description:
                candidate
                  .rationale ||
                candidate
                  .interpretation ||
                "",

              confidence:
                Number(
                  candidate
                    .intentSimilarityScore ??
                  0
                ),

              selected:
                candidate
                  .selected ===
                true,

              resolved:
                Boolean(
                  ambiguity
                    ?.selection
                ),

              finalText:
                ambiguity
                  ?.selection
                  ?.finalText ||
                "",

              editedText:
                "",

              wasEdited:
                false,
            });
          }
        );
    }
  );

  return result;
}

function areAllAmbiguitiesResolved(
  contexts
) {
  if (!Array.isArray(contexts)) {
    return false;
  }

  if (contexts.length === 0) {
    return true;
  }

  const ambiguityIds = [
    ...new Set(
      contexts.map(
        (context) =>
          context.ambiguityId
      )
    ),
  ];

  if (
    ambiguityIds.some(
      (ambiguityId) =>
        ambiguityId == null
    )
  ) {
    return false;
  }

  return ambiguityIds.every(
    (ambiguityId) =>
      contexts.some(
        (context) =>
          context.ambiguityId ===
            ambiguityId &&
          context.resolved === true
      )
  );
}

export default App;
