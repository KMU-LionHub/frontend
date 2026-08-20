import {
  useEffect,
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
  saveConversation,
} from "./db/conversationDb";

import "./App.css";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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
    isRecording,
    setIsRecording,
  ] = useState(false);

  const [
    elapsedTime,
    setElapsedTime,
  ] = useState(0);

  const mediaRecorderRef =
    useRef(null);

  const streamRef =
    useRef(null);

  const chunksRef =
    useRef([]);

  // ========================================
  // 마이크 종료
  // ========================================

  const stopMicrophone = () => {
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
  };

  // ========================================
  // 분석
  // ========================================

  const [
    analysisStatus,
    setAnalysisStatus,
  ] = useState("WAITING");

  const [
    analysisProgress,
    setAnalysisProgress,
  ] = useState(0);

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
  };

  // ========================================
  // 로그아웃
  // ========================================

  const handleLogout = () => {
    logout();

    stopMicrophone();

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
        setElapsedTime(
          (current) =>
            current + 1
        );
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
      stopMicrophone();
    };
  }, []);

  // ========================================
  // 녹음 시작
  // ========================================

  const startRecording =
    async () => {
      try {
        setError("");

        resetAnalysisResult();

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

            await processRecording(
              blob
            );
          };

        recorder.start();

        setElapsedTime(0);
        setIsRecording(true);

        setAnalysisStatus(
          "RECORDING"
        );

        setAnalysisProgress(0);
      } catch (err) {
        console.error(
          "녹음 시작 실패:",
          err
        );

        setError(
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
      recorder.stop();
    }

    setIsRecording(false);
  };

  // ========================================
  // 녹음 버튼
  // ========================================

  const handleRecordButton =
    () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };

  // ========================================
  // 전체 녹음 처리
  // ========================================

  const processRecording =
    async (blob) => {
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

        setAnalysisProgress(40);

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
        setAnalysisStatus(
          "ANALYZING_CONTEXT"
        );

        setAnalysisProgress(70);

        const analysis =
          await createContextAnalysis({
            conversationId:
              newConversationId,

            utteranceId:
              newUtteranceId,
          });

        console.log(
          "AI ANALYSIS RESPONSE:",
          analysis
        );

        const newAnalysisId =
          analysis.id;

        setAnalysisId(
          newAnalysisId
        );

        const normalizedContexts =
          normalizeContextCandidates(
            analysis
          );

        console.log(
          "NORMALIZED CONTEXTS:",
          normalizedContexts
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

        setAnalysisProgress(100);

        setAnalysisStatus(
          "COMPLETED"
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
            elapsedTime,
        });
      } catch (err) {
        console.error(
          "녹음 처리 실패:",
          err
        );

        setAnalysisStatus(
          "FAILED"
        );

        setAnalysisProgress(0);

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
      setAnalysisStatus(
        "UPLOADING"
      );

      setAnalysisProgress(20);

      const formData =
        new FormData();

      formData.append(
        "audio",
        blob,
        "recording.webm"
      );

      const response =
        await authFetch(
          `${API_URL}/api/stt/transcriptions`,
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      return await handleApiResponse(
        response
      );
    };

  // ========================================
  // 대화 생성
  // ========================================

  const createConversation =
    async () => {
      const response =
        await authFetch(
          `${API_URL}/api/conversations`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                title:
                  "AI 맥락 분석",

                context:
                  null,

                participants:
                  [],
              }),
          }
        );

      return await handleApiResponse(
        response
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
      const response =
        await authFetch(
          `${API_URL}/api/conversations/${conversationId}/utterances`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                transcriptionId,
                speakerParticipantId,
              }),
          }
        );

      return await handleApiResponse(
        response
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
      const response =
        await authFetch(
          `${API_URL}/api/context-analyses`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                conversationId,
                utteranceId,

                candidateCount:
                  3,

                model:
                  "GEMINI_3_7_FLASH",
              }),
          }
        );

      return await handleApiResponse(
        response
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

        const response =
          await authFetch(
            `${API_URL}/api/context-analyses/${context.analysisId}/ambiguities/${context.ambiguityId}/selection`,
            {
              method:
                "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  candidateId,
                }),
            }
          );

        await handleApiResponse(
          response
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

        console.log(
          "CONTEXT RESOLUTION REQUEST:",
          requestBody
        );

        const response =
          await authFetch(
            `${API_URL}/api/context-analyses/${context.analysisId}/ambiguities/${context.ambiguityId}/resolution`,
            {
              method:
                "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  requestBody
                ),
            }
          );

        const data =
          await handleApiResponse(
            response
          );

        console.log(
          "CONTEXT RESOLUTION RESPONSE:",
          data
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

      setElapsedTime(
        conversation
          .elapsedTime ??
          0
      );

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

      setAnalysisStatus(
        "COMPLETED"
      );

      setAnalysisProgress(
        100
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

      setConversationId(
        null
      );

      setUtteranceId(
        null
      );

      setAnalysisId(
        null
      );

      setAnalysisStatus(
        "WAITING"
      );

      setAnalysisProgress(
        0
      );

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
      stopMicrophone();

      if (
        mediaRecorderRef
          .current &&
        mediaRecorderRef
          .current
          .state !==
          "inactive"
      ) {
        mediaRecorderRef
          .current
          .stop();
      }

      setIsRecording(
        false
      );

      setElapsedTime(0);

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
                    "COMPLETED"
                  }

                  isAnalyzing={
                    analysisStatus ===
                    "ANALYZING_CONTEXT"
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

// ========================================
// 인증 Fetch
// ========================================

async function authFetch(
  url,
  options = {}
) {
  const accessToken =
    getAccessToken();

  if (!accessToken) {
    throw new Error(
      "로그인이 필요합니다."
    );
  }

  const headers = {
    ...(options.headers ||
      {}),

    Authorization:
      `Bearer ${accessToken}`,
  };

  return fetch(
    url,
    {
      ...options,

      headers,
    }
  );
}

// ========================================
// API 응답 처리
// ========================================

async function handleApiResponse(
  response
) {
  const data =
    await readResponseBody(
      response
    );

  if (
    response.status ===
    401
  ) {
    logout();

    throw new Error(
      "로그인이 만료되었습니다."
    );
  }

  if (!response.ok) {
    const message =
      data?.message ||
      (
        Array.isArray(
          data?.errors
        )
          ? data.errors.join(
              ", "
            )
          : null
      ) ||
      `요청에 실패했습니다. HTTP ${response.status}`;

    throw new Error(
      message
    );
  }

  return data;
}

// ========================================
// Response 읽기
// ========================================

async function readResponseBody(
  response
) {
  const contentType =
    response.headers.get(
      "content-type"
    );

  if (
    contentType?.includes(
      "application/json"
    )
  ) {
    return await response.json();
  }

  const text =
    await response.text();

  if (!text) {
    return {};
  }

  return {
    message: text,
  };
}

export default App;
