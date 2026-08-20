import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import App from "./App";
import { apiRequest } from "./api/apiClient";
import { storeAuthSession } from "./api/authStorage";
import {
  getAllConversations,
  saveConversation,
} from "./db/conversationDb";

vi.mock("./db/conversationDb", () => ({
  saveConversation: vi.fn()
    .mockResolvedValue({}),
  getAllConversations: vi.fn()
    .mockResolvedValue([]),
  getConversation: vi.fn()
    .mockResolvedValue(null),
  deleteConversation: vi.fn()
    .mockResolvedValue(),
  clearConversations: vi.fn()
    .mockResolvedValue(),
}));

const originalMediaDevices =
  Object.getOwnPropertyDescriptor(
    navigator,
    "mediaDevices"
  );

describe("App workflows", () => {
  beforeEach(() => {
    window.localStorage.clear();
    storeAuthSession({
      accessToken: "expired-token",
      user: {
        id: 1,
        email: "user@example.com",
        nickname: "사용자",
      },
    });
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();

    if (originalMediaDevices) {
      Object.defineProperty(
        navigator,
        "mediaDevices",
        originalMediaDevices
      );
    } else {
      delete navigator.mediaDevices;
    }
  });

  it("returns to login when an authenticated request expires", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "Unauthorized",
          }),
          {
            status: 401,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token: {
              accessToken:
                "new-access-token",
            },
            user: {
              id: 1,
              email:
                "user@example.com",
              nickname: "사용자",
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "정보 손실 없는 대화 도우미",
      })
    ).toBeInTheDocument();

    await expect(
      apiRequest("/api/protected")
    ).rejects.toMatchObject({
      status: 401,
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: "Context STT",
        })
      ).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByLabelText("이메일"),
      {
        target: {
          value: "user@example.com",
        },
      }
    );
    fireEvent.change(
      screen.getByLabelText("비밀번호"),
      {
        target: {
          value: "password1",
        },
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "로그인",
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: "정보 손실 없는 대화 도우미",
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText("분석 대기")
      ).toBeInTheDocument();
    });
  });

  it("waits for transcript review before starting context analysis", async () => {
    const getUserMedia = vi.fn()
      .mockResolvedValue({
        getTracks: () => [
          {
            stop: vi.fn(),
          },
        ],
      });
    const fetchMock = vi.fn(
      async (input) => {
        const url = String(input);

        if (url.endsWith("/re-record")) {
          return jsonResponse(201, {
            id: 12,
            replacesTranscriptionId: 11,
            originalText:
              "다시 말한 문장",
            currentText:
              "다시 말한 문장",
            words: [
              {
                id: 201,
                order: 0,
                originalText:
                  "다시 말한",
                correctedText: null,
                currentText:
                  "다시 말한",
                confidence: 0.97,
              },
              {
                id: 202,
                order: 1,
                originalText: "문장",
                correctedText: null,
                currentText: "문장",
                confidence: 0.96,
              },
            ],
          });
        }

        if (url.includes("/words/101")) {
          return jsonResponse(200, {
            id: 11,
            originalText:
              "의사소퉁 도우미",
            currentText:
              "의사소통 도우미",
            words: [
              {
                id: 101,
                order: 0,
                originalText:
                  "의사소퉁",
                correctedText:
                  "의사소통",
                currentText:
                  "의사소통",
                confidence: 0.62,
              },
              {
                id: 102,
                order: 1,
                originalText: "도우미",
                correctedText: null,
                currentText: "도우미",
                confidence: 0.95,
              },
            ],
          });
        }

        if (
          url.endsWith(
            "/api/stt/transcriptions"
          )
        ) {
          return jsonResponse(201, {
            id: 11,
            originalText:
              "의사소퉁 도우미",
            currentText:
              "의사소퉁 도우미",
            words: [
              {
                id: 101,
                order: 0,
                originalText:
                  "의사소퉁",
                correctedText: null,
                currentText:
                  "의사소퉁",
                confidence: 0.62,
              },
              {
                id: 102,
                order: 1,
                originalText: "도우미",
                correctedText: null,
                currentText: "도우미",
                confidence: 0.95,
              },
            ],
          });
        }

        if (
          url.endsWith(
            "/api/conversations"
          )
        ) {
          return jsonResponse(201, {
            id: 22,
            participants: [
              {
                id: 33,
                type: "SELF",
                userId: 1,
              },
            ],
          });
        }

        if (url.includes("/utterances")) {
          return jsonResponse(201, {
            id: 44,
          });
        }

        if (
          url.endsWith(
            "/api/context-analyses"
          )
        ) {
          return jsonResponse(201, {
            id: 55,
            ambiguities: [],
          });
        }

        return jsonResponse(404, {
          message: "Not found",
        });
      }
    );

    Object.defineProperty(
      navigator,
      "mediaDevices",
      {
        configurable: true,
        value: {
          getUserMedia,
        },
      }
    );
    vi.stubGlobal(
      "MediaRecorder",
      FakeMediaRecorder
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "녹음 시작",
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "녹음 종료",
        })
      ).toBeEnabled();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "녹음 종료",
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "AI 분석 시작",
        })
      ).toBeEnabled();
      expect(
        screen.getByRole("button", {
          name: "의사소퉁 단어 수정",
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "전사 내용을 먼저 검토해주세요"
        )
      ).toBeInTheDocument();
    });

    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          String(url).endsWith(
            "/api/context-analyses"
          )
      )
    ).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(
      3
    );
    expect(
      saveConversation
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        transcriptionId: 11,
        analysisId: null,
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "AI 분석 시작",
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "분석 완료",
        })
      ).toBeDisabled();
    });

    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          String(url).endsWith(
            "/api/context-analyses"
          )
      )
    ).toBe(true);

    fireEvent.click(
      screen.getByRole("button", {
        name: "의사소퉁 단어 수정",
      })
    );
    fireEvent.change(
      screen.getByLabelText(
        "교정할 단어"
      ),
      {
        target: {
          value: "의사소통",
        },
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "단어 저장",
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "의사소통 단어 수정",
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: "AI 분석 시작",
        })
      ).toBeEnabled();
    });

    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          String(url).endsWith(
            "/api/stt/transcriptions/11/words/101"
          )
      )
    ).toBe(true);

    fireEvent.click(
      screen.getByRole("button", {
        name: "전체 재발언",
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "재발언 녹음 종료",
        })
      ).toBeEnabled();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "재발언 녹음 종료",
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "다시 말한 단어 수정",
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: "AI 분석 시작",
        })
      ).toBeEnabled();
    });

    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          String(url).endsWith(
            "/api/stt/transcriptions/11/re-record"
          )
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          String(url).endsWith(
            "/api/conversations/22/utterances/44/transcription"
          )
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.filter(
        ([url]) =>
          String(url).endsWith(
            "/api/context-analyses"
          )
      )
    ).toHaveLength(1);
  });

  it("restores an unanalyzed history item to transcript review", async () => {
    getAllConversations.mockResolvedValueOnce([
      {
        id: "conversation-22",
        conversationId: 22,
        transcriptionId: 11,
        utteranceId: 44,
        analysisId: null,
        transcript: "초안 발언",
        contexts: [],
        annotations: [
          {
            id: 101,
            order: 0,
            originalText: "초안",
            currentText: "초안",
            correctedText: null,
            confidence: 0.95,
          },
          {
            id: 102,
            order: 1,
            originalText: "발언",
            currentText: "발언",
            correctedText: null,
            confidence: 0.94,
          },
        ],
        selectedContextId: null,
        elapsedTime: 4,
        createdAt:
          "2026-08-21T00:00:00.000Z",
      },
    ]);

    render(<App />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "대화 기록",
      })
    );

    await waitFor(() => {
      expect(
        screen.getAllByText("초안 발언")
          .length
      ).toBeGreaterThan(0);
    });

    fireEvent.click(
      screen
        .getAllByText("초안 발언")[0]
        .closest(".history-item")
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "AI 분석 시작",
        })
      ).toBeEnabled();
      expect(
        screen.getByText("전사 검토")
      ).toBeInTheDocument();
    });
  });
});

class FakeMediaRecorder {
  static isTypeSupported() {
    return true;
  }

  constructor(_stream, options = {}) {
    this.mimeType =
      options.mimeType ||
      "audio/webm";
    this.state = "inactive";
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";

    queueMicrotask(() => {
      this.ondataavailable?.({
        data: new Blob(
          ["audio"],
          {
            type: this.mimeType,
          }
        ),
      });
      this.onstop?.();
    });
  }
}

function jsonResponse(status, body) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type":
          "application/json",
      },
    }
  );
}
