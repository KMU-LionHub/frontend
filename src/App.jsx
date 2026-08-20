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
  saveConversation,
} from "./db/conversationDb";
import {
  initialRecordingWorkflow,
  isProcessingPhase,
  isRecordingPhase,
  RecordingAction,
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
  } = recordingWorkflow;

  const isRecording =
    isRecordingPhase(
      analysisStatus
    );

  const isProcessing =
    isProcessingPhase(
      analysisStatus
    );

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
    annotations,
    setAnnotations,
  ] = useState([]);

  const [
    selectedContextId,
    setSelectedContextId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

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

        setCurrentUser(null);
        setIsLoggedIn(false);
        setAuthPage("login");
        setActiveMenu("record");
        setTranscriptionId(null);
        setConversationId(null);
        setUtteranceId(null);
        setAnalysisId(null);
        setTranscript("");
        setContexts([]);
        setAnnotations([]);
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
    async () => {
      if (
        operationLockRef.current ||
        isProcessing ||
        isRecording
      ) {
        return;
      }

      operationLockRef.current =
        true;
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
                recordedDurationRef.current
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

        resetAnalysisResult();

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

        dispatchRecording({
          type: RecordingAction.FAIL,
        });

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

      startRecording();
    };

  // ========================================
  // 전체 녹음 처리
  // ========================================

  const processRecording =
    async (
      blob,
      elapsedTimeValue
    ) => {
      try {
        setError("");

        // 1. STT
        const transcription =
          await createTranscription(
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

        setTranscriptionId(
          newTranscriptionId
        );

        const text =
          transcription.currentText ||
          transcription.originalText ||
          "";

        setTranscript(text);

        const words =
          Array.isArray(
            transcription.words
          )
            ? transcription.words
            : [];

        setAnnotations(words);

        dispatchRecording({
          type:
            RecordingAction.TRANSCRIPTION_COMPLETE,
        });

        // 2. 대화 생성
        const conversation =
          await createConversation();

        const newConversationId =
          conversation.id;

        if (
          newConversationId == null
        ) {
          throw new Error(
            "대화 ID를 받지 못했습니다."
          );
        }

        setConversationId(
          newConversationId
        );

        // SELF 참여자 찾기
        const selfParticipant =
          findSelfParticipant(
            conversation,
            currentUser
          );

        if (
          !selfParticipant?.id
        ) {
          throw new Error(
            "현재 사용자의 참여자 정보를 찾지 못했습니다."
          );
        }

        // 3. 발언 생성
        const utterance =
          await createUtterance({
            conversationId:
              newConversationId,

            transcriptionId:
              newTranscriptionId,

            speakerParticipantId:
              selfParticipant.id,
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

        // 4. AI 분석
        dispatchRecording({
          type:
            RecordingAction.START_ANALYSIS,
        });

        const analysis =
          await createContextAnalysis({
            conversationId:
              newConversationId,

            utteranceId:
              newUtteranceId,
          });

        const newAnalysisId =
          analysis.id;

        setAnalysisId(
          newAnalysisId
        );

        const normalizedContexts =
          normalizeContextCandidates(
            analysis
          );

        setContexts(
          normalizedContexts
        );

        const alreadySelected =
          normalizedContexts.find(
            (context) =>
              context.selected
          );

        const newSelectedContextId =
          alreadySelected?.id ??
          null;

        setSelectedContextId(
          newSelectedContextId
        );

        // 5. 기록 저장
        await persistConversation({
          conversationIdValue:
            newConversationId,

          transcriptionIdValue:
            newTranscriptionId,

          utteranceIdValue:
            newUtteranceId,

          analysisIdValue:
            newAnalysisId,

          transcriptValue:
            text,

          contextsValue:
            normalizedContexts,

          annotationsValue:
            words,

          selectedContextIdValue:
            newSelectedContextId,

          elapsedTimeValue:
            elapsedTimeValue,
        });

        dispatchRecording({
          type:
            RecordingAction.COMPLETE,
        });
      } catch (err) {
        console.error(
          "녹음 처리 실패:",
          err
        );

        dispatchRecording({
          type: RecordingAction.FAIL,
        });

        setError(
          err.message ||
            "녹음 처리 중 오류가 발생했습니다."
        );
      }
    };

  // ========================================
  // STT
  // ========================================

  const createTranscription =
    async (blob) => {
      const formData =
        new FormData();

      formData.append(
        "audio",
        blob,
        "recording.webm"
      );

      return apiRequest(
        "/api/stt/transcriptions",
        {
          method: "POST",
          body: formData,
          defaultErrorMessage:
            "음성을 텍스트로 변환하지 못했습니다.",
        }
      );
    };

  // ========================================
  // 대화 생성
  // ========================================

  const createConversation =
    async () => {
      return apiRequest(
        "/api/conversations",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title: "AI 맥락 분석",
            context: null,
            participants: [],
          }),
          defaultErrorMessage:
            "대화를 생성하지 못했습니다.",
        }
      );
    };

  // ========================================
  // 발언 생성
  // ========================================

  const createUtterance =
    async ({
      conversationId,
      transcriptionId,
      speakerParticipantId,
    }) => {
      return apiRequest(
        `/api/conversations/${conversationId}/utterances`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            transcriptionId,
            speakerParticipantId,
          }),
          defaultErrorMessage:
            "발언을 대화에 추가하지 못했습니다.",
        }
      );
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

      annotationsValue =
        annotations,

      selectedContextIdValue =
        selectedContextId,

      elapsedTimeValue =
        elapsedTime,
    } = {}) => {
      if (
        conversationIdValue == null
      ) {
        return;
      }

      try {
        await saveConversation({
          id:
            `conversation-${conversationIdValue}`,

          conversationId:
            conversationIdValue,

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
              annotationsValue
            )
              ? annotationsValue
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
  // 발언 수정
  // ========================================

  const handleTranscriptSave =
    async (
      updatedTranscript
    ) => {
      setTranscript(
        updatedTranscript
      );

      await persistConversation({
        transcriptValue:
          updatedTranscript,
      });
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

      setAnnotations(
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

      dispatchRecording({
        type:
          RecordingAction.RESTORE_COMPLETED,
        elapsedTime:
          conversation.elapsedTime ??
          0,
      });

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

      setConversationId(
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

      setAnnotations([]);

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

      resetAnalysisResult();

      setError("");
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

          isRecording={
            isRecording
          }

          isProcessing={
            isProcessing
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
            <div className="dashboard-grid">
              {/* 왼쪽 */}

              <div className="dashboard-left-column">
                <RecordingPanel
                  isRecording={
                    isRecording
                  }

                  isProcessing={
                    isProcessing
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
                  transcript={
                    transcript
                  }

                  annotations={
                    annotations
                  }

                  onTranscriptSave={
                    handleTranscriptSave
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
                />
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

export default App;
