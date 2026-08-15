import { useRef, useState } from "react";
import {
  Mic,
  Square,
  BrainCircuit,
  Check,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import "./App.css";

const API_URL = "http://localhost:8080";

function App() {
  // 0 = 녹음
  // 1 = 분석
  // 2 = 결과
  const [step, setStep] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("녹음 준비");

  const [transcript, setTranscript] = useState("");
  const [contexts, setContexts] = useState([]);
  const [annotations, setAnnotations] = useState([]);

  const [selectedContextId, setSelectedContextId] = useState(null);

  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // =========================
  // 녹음 시작
  // =========================

  const startRecording = async () => {
    try {
      setError("");
      setTranscript("");
      setContexts([]);
      setAnnotations([]);

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      streamRef.current = stream;

      const mediaRecorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current =
        mediaRecorder;

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (
        event
      ) => {
        if (event.data.size > 0) {
          chunksRef.current.push(
            event.data
          );
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(
          chunksRef.current,
          {
            type:
              mediaRecorder.mimeType ||
              "audio/webm",
          }
        );

        stopMicrophone();

        await sendAudio(blob);
      };

      mediaRecorder.start();

      setIsRecording(true);
      setStatus("녹음 중");
    } catch (err) {
      console.error(err);

      setError(
        "마이크를 사용할 수 없습니다. 브라우저 마이크 권한을 확인해주세요."
      );
    }
  };

  // =========================
  // 녹음 종료
  // =========================

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        "inactive"
    ) {
      mediaRecorderRef.current.stop();
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

  const stopMicrophone = () => {
    if (!streamRef.current) return;

    streamRef.current
      .getTracks()
      .forEach((track) =>
        track.stop()
      );

    streamRef.current = null;
  };

  // =========================
  // Spring 서버 전송
  // =========================

  const sendAudio = async (blob) => {
    try {
      setStep(1);
      setStatus("음성 업로드 중");
      setError("");

      const formData =
        new FormData();

      /*
        Spring에서

        @RequestParam("audio")

        로 받을 것이기 때문에
        반드시 이름을 audio로 맞춤.
      */

      formData.append(
        "audio",
        blob,
        "recording.webm"
      );

      setStatus("STT 및 AI 분석 중");

      const response = await fetch(
        `${API_URL}/api/conversations/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      console.log(
        "백엔드 응답:",
        data
      );

      /*
        Spring 응답 형식:

        {
          transcript: "...",
          contexts: [...],
          annotations: [...]
        }
      */

      setTranscript(
        data.transcript || ""
      );

      setContexts(
        data.contexts || []
      );

      setAnnotations(
        data.annotations || []
      );

      setStatus("분석 완료");
      setStep(2);
    } catch (err) {
      console.error(err);

      setStatus("분석 실패");

      setError(
        "Spring 백엔드 서버에 연결하지 못했거나 분석 요청에 실패했습니다."
      );

      setStep(0);
    }
  };

  // =========================
  // 처음부터 다시
  // =========================

  const reset = () => {
    stopMicrophone();

    setStep(0);
    setIsRecording(false);
    setStatus("녹음 준비");

    setTranscript("");
    setContexts([]);
    setAnnotations([]);

    setSelectedContextId(null);

    setError("");
  };

  return (
    <div className="app">
      <header>
        <div>
          <p>ITDA</p>
          <h1>
            정보 손실 없는
            대화 도우미
          </h1>
        </div>

        <div className="status">
          {status}
        </div>
      </header>

      <div className="stepper">
        <Step
          number="1"
          title="녹음"
          active={step >= 0}
        />

        <div className="line" />

        <Step
          number="2"
          title="AI 분석"
          active={step >= 1}
        />

        <div className="line" />

        <Step
          number="3"
          title="맥락 확인"
          active={step >= 2}
        />
      </div>

      {error && (
        <div className="error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <main>
        {step === 0 && (
          <RecordingScreen
            isRecording={
              isRecording
            }
            handleRecordButton={
              handleRecordButton
            }
          />
        )}

        {step === 1 && (
          <LoadingScreen
            status={status}
          />
        )}

        {step === 2 && (
          <ResultScreen
            transcript={
              transcript
            }
            contexts={
              contexts
            }
            annotations={
              annotations
            }
            selectedContextId={
              selectedContextId
            }
            setSelectedContextId={
              setSelectedContextId
            }
            reset={reset}
          />
        )}
      </main>
    </div>
  );
}

function Step({
  number,
  title,
  active,
}) {
  return (
    <div
      className={
        active
          ? "step active"
          : "step"
      }
    >
      <span>{number}</span>
      {title}
    </div>
  );
}

function RecordingScreen({
  isRecording,
  handleRecordButton,
}) {
  return (
    <section className="card recording">
      <div className="icon-box">
        <Mic size={22} />
      </div>

      <h2>
        대화를 녹음해주세요
      </h2>

      <p>
        녹음이 끝나면 음성을
        Spring 서버로 전송하여
        STT와 AI 분석을 시작합니다.
      </p>

      <button
        className={
          isRecording
            ? "record-button recording-button"
            : "record-button"
        }
        onClick={
          handleRecordButton
        }
      >
        {isRecording ? (
          <Square size={34} />
        ) : (
          <Mic size={38} />
        )}
      </button>

      <h3>
        {isRecording
          ? "녹음 중입니다"
          : "녹음 준비"}
      </h3>

      <p>
        {isRecording
          ? "버튼을 다시 누르면 녹음을 종료합니다."
          : "마이크 버튼을 눌러 시작하세요."}
      </p>

      {isRecording && (
        <div className="wave">
          {[
            20, 45, 32, 62, 30,
            55, 75, 36, 50, 67,
            29, 53, 72, 40, 58,
          ].map(
            (height, index) => (
              <span
                key={index}
                style={{
                  height,
                }}
              />
            )
          )}
        </div>
      )}
    </section>
  );
}

function LoadingScreen({
  status,
}) {
  return (
    <section className="card loading">
      <div className="brain">
        <BrainCircuit
          size={42}
        />
      </div>

      <h2>
        대화를 분석하고 있습니다
      </h2>

      <p>{status}</p>

      <div className="loader" />

      <div className="loading-steps">
        <div>
          <Check size={16} />
          음성 녹음 완료
        </div>

        <div>
          <BrainCircuit
            size={16}
          />
          STT 및 맥락 분석
        </div>
      </div>
    </section>
  );
}

function ResultScreen({
  transcript,
  contexts,
  annotations,
  selectedContextId,
  setSelectedContextId,
  reset,
}) {
  return (
    <div className="result-layout">
      <section className="card result-main">
        <p className="label">
          STT RESULT
        </p>

        <h2>
          실제 발언 전문
        </h2>

        <div className="transcript">
          {transcript ||
            "백엔드에서 transcript가 전달되지 않았습니다."}
        </div>

        <div className="result-title">
          <div>
            <p className="label">
              AI CONTEXT
            </p>

            <h2>
              실제 의도와 가까운
              맥락을 선택해주세요
            </h2>
          </div>
        </div>

        <div className="contexts">
          {contexts.length ===
          0 ? (
            <p>
              백엔드에서 맥락
              후보가 전달되지
              않았습니다.
            </p>
          ) : (
            contexts.map(
              (context) => (
                <button
                  key={
                    context.id
                  }
                  className={
                    selectedContextId ===
                    context.id
                      ? "context selected"
                      : "context"
                  }
                  onClick={() =>
                    setSelectedContextId(
                      context.id
                    )
                  }
                >
                  <div>
                    <strong>
                      {
                        context.title
                      }
                    </strong>

                    <p>
                      {
                        context.description
                      }
                    </p>
                  </div>

                  <span>
                    {formatConfidence(
                      context
                    )}
                  </span>
                </button>
              )
            )
          )}
        </div>
      </section>

      <aside>
        <section className="card annotation-panel">
          <p className="label">
            ANNOTATIONS
          </p>

          <h2>
            AI 정보 주석
          </h2>

          {annotations.length ===
          0 ? (
            <p>
              생성된 주석이
              없습니다.
            </p>
          ) : (
            annotations.map(
              (annotation) => (
                <div
                  className="annotation"
                  key={
                    annotation.id
                  }
                >
                  <strong>
                    {
                      annotation.word
                    }
                  </strong>

                  <span>
                    {
                      annotation.type
                    }
                  </span>

                  <p>
                    {
                      annotation.description
                    }
                  </p>
                </div>
              )
            )
          )}
        </section>

        <button
          className="reset-button"
          onClick={reset}
        >
          <RotateCcw size={16} />
          새로운 대화
        </button>
      </aside>
    </div>
  );
}

function formatConfidence(
  context
) {
  if (
    context.confidence != null
  ) {
    return `${Math.round(
      context.confidence * 100
    )}%`;
  }

  if (
    context.score != null
  ) {
    return `${context.score}%`;
  }

  return "-";
}

export default App;