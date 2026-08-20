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

describe("App authentication expiration", () => {
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
});
