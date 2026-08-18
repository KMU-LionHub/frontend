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

import "./App.css";

const API_URL = "http://localhost:8080";

function App() {
  // ========================================
  // 인증
  // ========================================

  const [isLoggedIn, setIsLoggedIn] =
    useState(() => !!getAccessToken());

  const [authPage, setAuthPage] =
    useState("login");

  const [currentUser, setCurrentUser] =
    useState(() => getStoredUser());

  const handleLoginSuccess = (user) => {
    setCurrentUser(
      user || getStoredUser()
    );

    setIsLoggedIn(true);
  };

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
  // 사이드바 메뉴
  // ========================================

  const [activeMenu, setActiveMenu] =
    useState("record");

  const handleMenuChange = (menu) => {
    setActiveMenu(menu);
  };

  // ========================================
  // 녹음
  // ========================================

  const [isRecording, setIsRecording] =
    useState(false);

  const [elapsedTime, setElapsedTime] =
    useState(0);

  const mediaRecorderRef =
    useRef(null);

  const streamRef =
    useRef(null);

  const chunksRef =
    useRef([]);

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

  const [analysisId, setAnalysisId] =
    useState(null);

  // ========================================
  // 분석 결과
  // ========================================

  const [transcript, setTranscript] =
    useState("");

  const [contexts, setContexts] =
    useState([]);

  const [annotations, setAnnotations] =
    useState([]);

  const [
    selectedContextId,
    setSelectedContextId,
  ] = useState(null);

  const [error, setError] =
    useState("");

  // ========================================
  // 녹음 타이머
  // ========================================

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime(
        (current) => current + 1
      );
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isRecording]);

  // ========================================
  // 컴포넌트 종료 시 마이크 정리
  // ========================================

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });
      }
    };
  }, []);

  // ========================================
  // 녹음 시작
  // ========================================

  const startRecording = async () => {
    try {
      setError("");

      resetAnalysisResult();

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

      streamRef.current = stream;

      let options = {};

      if (
        MediaRecorder.isTypeSupported(
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

      recorder.ondataavailable = (
        event
      ) => {
        if (event.data.size > 0) {
          chunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(
          chunksRef.current,
          {
            type:
              recorder.mimeType ||
              "audio/webm",
          }
        );

        stopMicrophone();

        await sendAudio(blob);
      };

      recorder.start();

      setElapsedTime(0);
      setIsRecording(true);

      setAnalysisStatus(
        "RECORDING"
      );

      setAnalysisProgress(0);
    } catch (err) {
      console.error(err);

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
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }

    setIsRecording(false);
  };

  const handleRecordButton = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ========================================
  // 마이크 정리
  // ========================================

  const stopMicrophone = () => {
    if (!streamRef.current) {
      return;
    }

    streamRef.current
      .getTracks()
      .forEach((track) => {
        track.stop();
      });

    streamRef.current = null;
  };

  // ========================================
  // 음성 분석 요청
  // ========================================

  const sendAudio = async (blob) => {
    try {
      setError("");

      setAnalysisStatus(
        "UPLOADING"
      );

      setAnalysisProgress(0);

      const accessToken =
        getAccessToken();

      if (!accessToken) {
        throw new Error(
          "로그인이 필요합니다."
        );
      }

      const formData =
        new FormData();

      formData.append(
        "audio",
        blob,
        "recording.webm"
      );

      const response = await fetch(
        `${API_URL}/api/conversations/analyze`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          body: formData,
        }
      );

      if (
        response.status === 401
      ) {
        logout();

        setCurrentUser(null);
        setIsLoggedIn(false);

        throw new Error(
          "로그인이 만료되었습니다."
        );
      }

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      if (data.analysisId) {
        setAnalysisId(
          data.analysisId
        );

        setAnalysisStatus(
          data.status ||
            "UPLOADING"
        );

        await pollAnalysisStatus(
          data.analysisId
        );

        return;
      }

      applyFinalAnalysisResult(
        data
      );
    } catch (err) {
      console.error(
        "음성 분석 요청 실패:",
        err
      );

      setAnalysisStatus(
        "FAILED"
      );

      setAnalysisProgress(0);

      setError(
        err.message ===
          "로그인이 만료되었습니다."
          ? err.message
          : "아직 음성 분석 API가 연결되지 않았거나 분석 요청에 실패했습니다."
      );
    }
  };

  // ========================================
  // 분석 상태 polling
  // ========================================

  const pollAnalysisStatus =
    async (id) => {
      const accessToken =
        getAccessToken();

      while (true) {
        const response =
          await fetch(
            `${API_URL}/api/conversations/${id}/status`,
            {
              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
              },
            }
          );

        if (!response.ok) {
          throw new Error(
            `상태 조회 실패: HTTP ${response.status}`
          );
        }

        const data =
          await response.json();

        setAnalysisStatus(
          data.status ||
            "ANALYZING_CONTEXT"
        );

        setAnalysisProgress(
          Number(
            data.progress ?? 0
          )
        );

        if (
          data.status ===
          "COMPLETED"
        ) {
          if (
            data.transcript ||
            data.contexts ||
            data.annotations
          ) {
            applyFinalAnalysisResult(
              data
            );

            return;
          }

          await fetchAnalysisResult(
            id
          );

          return;
        }

        if (
          data.status ===
          "FAILED"
        ) {
          throw new Error(
            "AI 분석에 실패했습니다."
          );
        }

        await sleep(1000);
      }
    };

  // ========================================
  // 최종 분석 결과 조회
  // ========================================

  const fetchAnalysisResult =
    async (id) => {
      const accessToken =
        getAccessToken();

      const response =
        await fetch(
          `${API_URL}/api/conversations/${id}/result`,
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          `분석 결과 조회 실패: HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      applyFinalAnalysisResult(
        data
      );
    };

  // ========================================
  // 최종 분석 결과 적용
  // ========================================

  const applyFinalAnalysisResult =
    (data) => {
      setTranscript(
        data.transcript || ""
      );

      setContexts(
        Array.isArray(
          data.contexts
        )
          ? data.contexts
          : []
      );

      setAnnotations(
        Array.isArray(
          data.annotations
        )
          ? data.annotations
          : []
      );

      setSelectedContextId(null);

      setAnalysisStatus(
        "COMPLETED"
      );

      setAnalysisProgress(100);
    };

  // ========================================
  // 발언 수정
  // ========================================

  const handleTranscriptSave =
    (updatedTranscript) => {
      setTranscript(
        updatedTranscript
      );
    };

  // ========================================
  // 맥락 선택
  // ========================================

  const handleSelectContext =
    (contextId) => {
      setSelectedContextId(
        contextId
      );
    };

  // ========================================
  // 대화 기록 열기
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
        conversation.selectedContextId ??
          null
      );

      setElapsedTime(
        conversation.elapsedTime ??
          0
      );

      setAnalysisId(null);

      setAnalysisStatus(
        "COMPLETED"
      );

      setAnalysisProgress(100);

      setError("");

      setActiveMenu("record");
    };

  // ========================================
  // 분석 결과 초기화
  // ========================================

  const resetAnalysisResult = () => {
    setAnalysisId(null);

    setAnalysisStatus(
      "WAITING"
    );

    setAnalysisProgress(0);

    setTranscript("");

    setContexts([]);

    setAnnotations([]);

    setSelectedContextId(null);
  };

  // ========================================
  // 대화 전체 초기화
  // ========================================

  const resetConversation = () => {
    stopMicrophone();

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current
        .state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    setElapsedTime(0);

    resetAnalysisResult();

    setError("");
  };

  // ========================================
  // 인증 화면
  // ========================================

  if (!isLoggedIn) {
    if (
      authPage === "signup"
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
  // 메인 화면
  // ========================================

  return (
    <div className="dashboard-shell">
      <Sidebar
        activeMenu={activeMenu}
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
          {/* ==============================
              대화 기록
          ============================== */}

          {activeMenu ===
          "history" ? (
            <HistoryPage
              onOpenConversation={
                handleOpenConversation
              }
            />
          ) : activeMenu ===
            "help" ? (
            /* ==============================
                도움말
            ============================== */

            <HelpPage />
          ) : (
            /* ==============================
                녹음 / 분석 화면
            ============================== */

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
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function sleep(ms) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        ms
      )
  );
}

export default App;