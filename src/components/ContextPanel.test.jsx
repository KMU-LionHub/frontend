import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ContextResolutionType,
} from "../api/contextAnalysisApi";
import ContextPanel from "./ContextPanel";

afterEach(cleanup);

const analysis = {
  id: 55,
  ambiguityCount: 2,
  needsClarification: true,
  stale: false,
  fullyResolved: false,
  usableResolution: false,
  ambiguities: [
    {
      id: 501,
      order: 1,
      excerpt: "배를",
      startWordId: 102,
      endWordId: 102,
      startWordOrder: 1,
      endWordOrder: 1,
      candidateCount: 2,
      selection: null,
      candidates: [
        {
          id: 601,
          rank: 1,
          interpretation:
            "선박을 이용한다는 의미",
          inferredIntent:
            "배를 타고 이동하려 함",
          rationale:
            "뒤에 타러라는 표현이 이어집니다.",
          intentSimilarityScore: 0.87,
          selected: false,
        },
        {
          id: 602,
          rank: 2,
          interpretation:
            "과일 배를 가져간다는 의미",
          inferredIntent:
            "과일을 가지러 감",
          rationale:
            "배는 과일을 의미할 수도 있습니다.",
          intentSimilarityScore: 0.13,
          selected: false,
        },
      ],
    },
    {
      id: 502,
      order: 2,
      excerpt: "배가",
      startWordId: 105,
      endWordId: 105,
      startWordOrder: 4,
      endWordOrder: 4,
      candidateCount: 2,
      selection: null,
      candidates: [
        {
          id: 603,
          rank: 1,
          interpretation:
            "복부가 아프다는 의미",
          inferredIntent:
            "복통을 호소함",
          rationale:
            "아프다는 표현이 신체를 가리킵니다.",
          intentSimilarityScore: 0.91,
          selected: false,
        },
        {
          id: 604,
          rank: 2,
          interpretation:
            "과일 배의 상태가 나쁘다는 의미",
          inferredIntent:
            "과일 상태를 설명함",
          rationale:
            "문법상 가능한 다른 해석입니다.",
          intentSimilarityScore: 0.09,
          selected: false,
        },
      ],
    },
  ],
};

describe("ContextPanel", () => {
  it("keeps candidates grouped by ambiguous word span", () => {
    render(
      <ContextPanel
        analysis={analysis}
        analysisCompleted
        onResolveAmbiguity={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: "“배를”",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "“배가”",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("유사도 0.87")
    ).toBeInTheDocument();
    expect(
      screen.getByText("유사도 0.91")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("87%")
    ).not.toBeInTheDocument();
  });

  it("resolves each ambiguity independently", async () => {
    const onResolveAmbiguity = vi.fn()
      .mockResolvedValue({});

    render(
      <ContextPanel
        analysis={analysis}
        analysisCompleted
        onResolveAmbiguity={
          onResolveAmbiguity
        }
      />
    );

    const firstCard = screen
      .getByRole("heading", {
        name: "“배를”",
      })
      .closest("article");
    const secondCard = screen
      .getByRole("heading", {
        name: "“배가”",
      })
      .closest("article");

    fireEvent.click(
      within(firstCard).getByText(
        "선박을 이용한다는 의미"
      ).closest("button")
    );
    fireEvent.click(
      within(firstCard).getByRole(
        "button",
        {
          name: "선택한 후보로 확정",
        }
      )
    );

    await waitFor(() => {
      expect(
        onResolveAmbiguity
      ).toHaveBeenCalledWith(501, {
        type:
          ContextResolutionType.CANDIDATE,
        candidateId: 601,
      });
    });

    fireEvent.click(
      within(secondCard).getByRole(
        "button",
        {
          name: "직접 입력",
        }
      )
    );
    fireEvent.change(
      within(secondCard).getByLabelText(
        "화자가 의도한 실제 맥락"
      ),
      {
        target: {
          value:
            "점심을 잘못 먹어서 복부가 아프다",
        },
      }
    );
    fireEvent.click(
      within(secondCard).getByRole(
        "button",
        {
          name:
            "직접 입력한 맥락으로 확정",
        }
      )
    );

    await waitFor(() => {
      expect(
        onResolveAmbiguity
      ).toHaveBeenCalledWith(502, {
        type:
          ContextResolutionType.CUSTOM,
        text:
          "점심을 잘못 먹어서 복부가 아프다",
      });
    });
  });

  it("supports dismissing an unnecessary ambiguity", async () => {
    const onResolveAmbiguity = vi.fn()
      .mockResolvedValue({});

    render(
      <ContextPanel
        analysis={analysis}
        analysisCompleted
        onResolveAmbiguity={
          onResolveAmbiguity
        }
      />
    );

    const firstCard = screen
      .getByRole("heading", {
        name: "“배를”",
      })
      .closest("article");

    fireEvent.click(
      within(firstCard).getByRole(
        "button",
        { name: "무시" }
      )
    );
    fireEvent.click(
      within(firstCard).getByRole(
        "button",
        {
          name: "모호성 무시로 확정",
        }
      )
    );

    await waitFor(() => {
      expect(
        onResolveAmbiguity
      ).toHaveBeenCalledWith(501, {
        type:
          ContextResolutionType.DISMISSED,
      });
    });
  });

  it("shows canonical resolved selections", () => {
    const resolvedAnalysis = {
      ...analysis,
      fullyResolved: true,
      usableResolution: true,
      ambiguities:
        analysis.ambiguities.map(
          (ambiguity, index) => ({
            ...ambiguity,
            selection: {
              type:
                ContextResolutionType.CANDIDATE,
              candidateId:
                ambiguity.candidates[0].id,
              finalText:
                ambiguity.candidates[0]
                  .interpretation,
              edited: false,
              selectedAt:
                "2026-08-21T00:00:00",
              updatedAt:
                `2026-08-21T00:00:0${index}`,
            },
          })
        ),
    };

    render(
      <ContextPanel
        analysis={resolvedAnalysis}
        analysisCompleted
        onResolveAmbiguity={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        "모든 모호한 표현의 맥락이 확정되었습니다."
      )
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("확정 완료")
    ).toHaveLength(2);
  });

  it("disables resolution changes in server history view", () => {
    render(
      <ContextPanel
        analysis={analysis}
        analysisCompleted
        readOnly
        onResolveAmbiguity={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        /서버에 저장된 분석 결과를 읽기 전용으로/
      )
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", {
        name: "직접 입력",
      })[0]
    ).toBeDisabled();
  });
});
