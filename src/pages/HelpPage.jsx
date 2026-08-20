import {
  Mic,
  BrainCircuit,
  MessageSquareText,
  History,
  ShieldCheck,
  CircleHelp,
} from "lucide-react";

function HelpPage() {
  const guides = [
    {
      icon: Mic,
      title: "1. 대화 녹음",
      description:
        "녹음 화면의 마이크 버튼을 눌러 대화를 녹음합니다. 다시 누르면 녹음이 종료됩니다.",
    },
    {
      icon: MessageSquareText,
      title: "2. 전사 검토",
      description:
        "녹음이 종료되면 STT 결과를 확인합니다. 잘못 인식된 단어를 선택해 수정하거나 전체 발언을 다시 녹음할 수 있습니다.",
    },
    {
      icon: BrainCircuit,
      title: "3. AI 분석",
      description:
        "전사를 검토한 뒤 AI 분석 시작 버튼을 누르면 발언의 가능한 맥락 후보를 확인할 수 있습니다.",
    },
    {
      icon: ShieldCheck,
      title: "4. 실제 맥락 선택",
      description:
        "AI가 제시한 후보 중 실제 발언 의도와 가장 가까운 맥락을 선택합니다.",
    },
    {
      icon: History,
      title: "5. 대화 기록",
      description:
        "저장된 분석 결과는 왼쪽의 대화 기록 메뉴에서 다시 확인할 수 있습니다.",
    },
  ];

  return (
    <div className="help-page">
      <div className="help-header">
        <div className="help-title-icon">
          <CircleHelp size={22} />
        </div>

        <div>
          <h2>도움말</h2>

          <p>
            Context STT의 기본 사용 방법을 확인할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="help-guide-grid">
        {guides.map((guide) => {
          const Icon = guide.icon;

          return (
            <section
              key={guide.title}
              className="help-guide-card"
            >
              <div className="help-guide-icon">
                <Icon size={20} />
              </div>

              <div>
                <h3>{guide.title}</h3>

                <p>{guide.description}</p>
              </div>
            </section>
          );
        })}
      </div>

      <section className="help-notice">
        <h3>마이크가 작동하지 않을 때</h3>

        <p>
          브라우저에서 마이크 사용 권한이 허용되어 있는지
          확인해주세요. 주소창의 사이트 설정에서 마이크 권한을
          다시 허용할 수 있습니다.
        </p>
      </section>

      <section className="help-notice">
        <h3>분석이 실패할 때</h3>

        <p>
          백엔드 서버 연결 상태와 로그인 상태를 확인해주세요.
          음성 분석 API가 연결되지 않은 경우 분석 결과가 표시되지
          않을 수 있습니다.
        </p>
      </section>
    </div>
  );
}

export default HelpPage;
