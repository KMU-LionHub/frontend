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

const API_URL =
  "http://localhost:8080";

const CONTEXT_MODEL =
  "GEMINI_3_7_FLASH";

const CANDIDATE_COUNT = 3;

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
  // 사이드바
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
  // 백엔드 ID
  // ========================================

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
    contextAnalysisId,
    setContextAnalysisId,
  ] = useState(null);

  // ========================================
  // 분석 상태
  // ========================================

  const [
    analysisStatus,
    setAnalysisStatus,
  ] = useState("WAITING");

  const [
    analysisProgress,
    setAnalysisProgress,
  ] = useState(0);

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
      user || getStoredUser()
    );

    setIsLoggedIn(true);
  };

  // ========================================
  // 로그아웃
  // ========================================

  const handleLogout = () => {
    logout();

    stopMicrophone();

    setIsRecording(false);
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
      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach(
            (track) => {
              track.stop();
            }
          );
      }
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
          await navigator.mediaDevices
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
              chunksRef.current
                .push(
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

        setAnalysisProgress(
          0
        );
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

  const handleRecordButton =
    () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };

  // ========================================
  // 마이크 정리
  // ========================================

  const stopMicrophone =
    () => {
      if (
        !streamRef.current
      ) {
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
  // 전체 분석 처리
  // ========================================

  const processRecording =
    async (blob) => {
      try {
        setError("");

        // 1. STT
        setAnalysisStatus(
          "UPLOADING"
        );

        setAnalysisProgress(
          20
        );

        const transcription =
          await createTranscription(
            blob
          );

        const newTranscriptionId =
          transcription.id;

        if (
          !newTranscriptionId
        ) {
          throw new Error(
            "전사 ID를 받지 못했습니다."
          );
        }

        setTranscriptionId(
          newTranscriptionId
        );

        const newTranscript =
          transcription.currentText ||
          transcription.originalText ||
          "";

        setTranscript(
          newTranscript
        );

        const newAnnotations =
          Array.isArray(
            transcription.words
          )
            ? transcription.words
            : [];

        setAnnotations(
          newAnnotations
        );

        // 2. 대화 생성
        setAnalysisStatus(
          "CREATING_CONVERSATION"
        );

        setAnalysisProgress(
          40
        );

        const conversation =
          await createConversation();

        const newConversationId =
          conversation.id;

        if (
          !newConversationId
        ) {
          throw new Error(
            "대화 ID를 받지 못했습니다."
          );
        }

        setConversationId(
          newConversationId
        );

        const selfParticipant =
          findSelfParticipant(
            conversation,
            currentUser
          );

        if (
          !selfParticipant?.id
        ) {
          throw new Error(
            "현재 사용자의 대화 참여자 정보를 찾지 못했습니다."
          );
        }

        // 3. 발언 연결
        setAnalysisStatus(
          "LINKING_UTTERANCE"
        );

        setAnalysisProgress(
          60
        );

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
          !newUtteranceId
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

        setAnalysisProgress(
          80
        );

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
          analysis.id ??
          null;

        setContextAnalysisId(
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

        setAnalysisStatus(
          "COMPLETED"
        );

        setAnalysisProgress(
          100
        );

        // 5. 기록 자동 저장
        await persistConversation({
          conversationIdValue:
            newConversationId,

          transcriptionIdValue:
            newTranscriptionId,

          utteranceIdValue:
            newUtteranceId,

          contextAnalysisIdValue:
            newAnalysisId,

          transcriptValue:
            newTranscript,

          contextsValue:
            normalizedContexts,

          annotationsValue:
            newAnnotations,

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

        setAnalysisProgress(
          0
        );

        setError(
          err.message ||
            "녹음 분석 처리에 실패했습니다."
        );
      }
    };

  // ========================================
  // STT
  // ========================================

  const createTranscription =
    async (blob) => {
      const accessToken =
        requireAccessToken();

      const formData =
        new FormData();

      formData.append(
        "audio",
        blob,
        "recording.webm"
      );

      const response =
        await fetch(
          `${API_URL}/api/stt/transcriptions`,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },

            body:
              formData,
          }
        );

      return await handleApiResponse(
        response,
        "STT 요청에 실패했습니다."
      );
    };

  // ========================================
  // 대화 생성
  // ========================================

  const createConversation =
    async () => {
      const accessToken =
        requireAccessToken();

      const response =
        await fetch(
          `${API_URL}/api/conversations`,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                title:
                  "새 대화",

                context:
                  "",

                participants:
                  [],
              }),
          }
        );

      return await handleApiResponse(
        response,
        "대화 생성에 실패했습니다."
      );
    };

  // ========================================
  // 발언 연결
  // ========================================

  const createUtterance =
    async ({
      conversationId,
      transcriptionId,
      speakerParticipantId,
    }) => {
      const accessToken =
        requireAccessToken();

      const response =
        await fetch(
          `${API_URL}/api/conversations/${conversationId}/utterances`,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,

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
        response,
        "발언 연결에 실패했습니다."
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
      const accessToken =
        requireAccessToken();

      const response =
        await fetch(
          `${API_URL}/api/context-analyses`,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                conversationId,
                utteranceId,

                candidateCount:
                  CANDIDATE_COUNT,

                model:
                  CONTEXT_MODEL,
              }),
          }
        );

      return await handleApiResponse(
        response,
        "AI 맥락 분석에 실패했습니다."
      );
    };

  // ========================================
  // IndexedDB 기록 저장
  // ========================================

  const persistConversation =
    async ({
      conversationIdValue =
        conversationId,

      transcriptionIdValue =
        transcriptionId,

      utteranceIdValue =
        utteranceId,

      contextAnalysisIdValue =
        contextAnalysisId,

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
        conversationIdValue ==
        null
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

          contextAnalysisId:
            contextAnalysisIdValue,

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
  // 전사 수정
  // ========================================

  const handleTranscriptSave =
    (updatedTranscript) => {
      setTranscript(
        updatedTranscript
      );

      persistConversation({
        transcriptValue:
          updatedTranscript,
      });
    };

  // ========================================
  // 후보 선택
  // ========================================

  const handleSelectContext =
    async (contextId) => {
      try {
        setError("");

        const selectedContext =
          contexts.find(
            (context) =>
              context.id ===
              contextId
          );

        if (
          !selectedContext
        ) {
          throw new Error(
            "선택한 맥락 후보를 찾을 수 없습니다."
          );
        }

        const {
          analysisId,
          ambiguityId,
        } =
          selectedContext;

        const accessToken =
          requireAccessToken();

        const response =
          await fetch(
            `${API_URL}/api/context-analyses/${analysisId}/ambiguities/${ambiguityId}/selection`,
            {
              method:
                "PUT",

              headers: {
                Authorization:
                  `Bearer ${accessToken}`,

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  candidateId:
                    contextId,
                }),
            }
          );

        await handleApiResponse(
          response,
          "맥락 후보 선택에 실패했습니다."
        );

        const updatedContexts =
          contexts.map(
            (context) => ({
              ...context,

              selected:
                context.id ===
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
          err.message
        );
      }
    };

  // ========================================
  // 직접 수정
  // ========================================

  const handleEditContext =
    async (
      selectedContext,
      text
    ) => {
      try {
        setError("");

        const {
          analysisId,
          ambiguityId,
          id: candidateId,
        } =
          selectedContext;

        const accessToken =
          requireAccessToken();

        const response =
          await fetch(
            `${API_URL}/api/context-analyses/${analysisId}/ambiguities/${ambiguityId}/selection`,
            {
              method:
                "PATCH",

              headers: {
                Authorization:
                  `Bearer ${accessToken}`,

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  text,
                }),
            }
          );

        await handleApiResponse(
          response,
          "맥락 직접 수정에 실패했습니다."
        );

        const updatedContexts =
          contexts.map(
            (context) =>
              context.id ===
              candidateId
                ? {
                    ...context,

                    editedText:
                      text,
                  }
                : context
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
          err.message
        );

        throw err;
      }
    };

  // ========================================
  // 최종 확정
  //
  // 중요:
  // CANDIDATE 타입일 때는
  // candidateId만 전송한다.
  // ========================================

  const handleResolveContext =
    async (
      selectedContext,
      finalText
    ) => {
      try {
        setError("");

        const {
          analysisId,
          ambiguityId,
          id: candidateId,
        } =
          selectedContext;

        if (
          analysisId == null ||
          ambiguityId == null ||
          candidateId == null
        ) {
          throw new Error(
            "최종 확정에 필요한 맥락 정보가 없습니다."
          );
        }

        const accessToken =
          requireAccessToken();

        const response =
          await fetch(
            `${API_URL}/api/context-analyses/${analysisId}/ambiguities/${ambiguityId}/resolution`,
            {
              method:
                "PUT",

              headers: {
                Authorization:
                  `Bearer ${accessToken}`,

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  type:
                    "CANDIDATE",

                  candidateId,
                }),
            }
          );

        const data =
          await handleApiResponse(
            response,
            "맥락 최종 확정에 실패했습니다."
          );

        console.log(
          "CONTEXT RESOLUTION RESPONSE:",
          data
        );

        const updatedContexts =
          contexts.map(
            (context) =>
              context.id ===
              candidateId
                ? {
                    ...context,

                    resolved:
                      true,

                    finalText:
                      finalText ||
                      context.editedText ||
                      context.description ||
                      "",
                  }
                : context
          );

        setContexts(
          updatedContexts
        );

        setSelectedContextId(
          candidateId
        );

        await persistConversation({
          contextsValue:
            updatedContexts,

          selectedContextIdValue:
            candidateId,
        });

        return data;
      } catch (err) {
        console.error(
          "최종 확정 실패:",
          err
        );

        setError(
          err.message ||
            "맥락 최종 확정에 실패했습니다."
        );

        throw err;
      }
    };

  // ========================================
  // 기록 다시 열기
  // ========================================

  const handleOpenConversation =
    (conversation) => {
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

      setContextAnalysisId(
        conversation
          .contextAnalysisId ??
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

      setContextAnalysisId(
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
        mediaRecorderRef.current &&
        mediaRecorderRef
          .current.state !==
          "inactive"
      ) {
        mediaRecorderRef.current
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
  // 메인 UI
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
            currentUser?.nickname
          }
          email={
            currentUser?.email
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

              <AnalysisProgress
                progress={
                  analysisProgress
                }
                status={
                  analysisStatus
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

              <ContextPanel
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
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ========================================
// 토큰
// ========================================

function requireAccessToken() {
  const token =
    getAccessToken();

  if (!token) {
    throw new Error(
      "로그인이 필요합니다."
    );
  }

  return token;
}

// ========================================
// API 응답 처리
// ========================================

async function handleApiResponse(
  response,
  fallbackMessage
) {
  if (
    response.status ===
    401
  ) {
    logout();

    throw new Error(
      "로그인이 만료되었습니다."
    );
  }

  const data =
    await readResponseBody(
      response
    );

  if (!response.ok) {
    const errors =
      Array.isArray(
        data?.errors
      )
        ? data.errors.join(
            ", "
          )
        : "";

    throw new Error(
      data?.message ||
        errors ||
        `${fallbackMessage} HTTP ${response.status}`
    );
  }

  return data;
}

// ========================================
// SELF 찾기
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
      ) || null
    );
  }

  return null;
}

// ========================================
// AI 응답 변환
// ========================================

function normalizeContextCandidates(
  analysis
) {
  const normalized = [];

  if (
    Array.isArray(
      analysis?.ambiguities
    )
  ) {
    analysis.ambiguities
      .forEach(
        (ambiguity) => {
          const candidates =
            Array.isArray(
              ambiguity
                ?.candidates
            )
              ? ambiguity.candidates
              : [];

          candidates.forEach(
            (candidate) => {
              normalized.push(
                normalizeCandidate(
                  candidate,
                  ambiguity,
                  analysis
                )
              );
            }
          );
        }
      );
  }

  return normalized;
}

function normalizeCandidate(
  candidate,
  ambiguity,
  analysis
) {
  const selection =
    ambiguity?.selection;

  return {
    id:
      candidate?.id,

    title:
      candidate
        ?.inferredIntent ||
      candidate
        ?.interpretation ||
      "맥락 후보",

    description:
      candidate
        ?.interpretation ||
      candidate
        ?.rationale ||
      "",

    confidence:
      candidate
        ?.intentSimilarityScore ??
      0,

    rationale:
      candidate
        ?.rationale ||
      "",

    inferredIntent:
      candidate
        ?.inferredIntent ||
      "",

    interpretation:
      candidate
        ?.interpretation ||
      "",

    rank:
      candidate?.rank ??
      null,

    ambiguityId:
      ambiguity?.id ??
      null,

    analysisId:
      analysis?.id ??
      null,

    selected:
      candidate
        ?.selected ===
      true,

    editedText:
      selection?.edited
        ? selection?.finalText ||
          ""
        : "",

    finalText:
      selection?.finalText ||
      "",

    resolved:
      Boolean(
        ambiguity?.resolution
      ),
  };
}

// ========================================
// 응답 읽기
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

  return {
    message: text,
  };
}

export default App;