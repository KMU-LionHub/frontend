import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  login,
  signup,
} from "../api/authApi";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";

vi.mock("../api/authApi", () => ({
  login: vi.fn(),
  signup: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("authentication pages", () => {
  it("submits accessible login fields", async () => {
    const user = {
      id: 1,
      email: "user@example.com",
      nickname: "사용자",
    };
    const onLoginSuccess = vi.fn();

    login.mockResolvedValue({ user });

    render(
      <LoginPage
        onLoginSuccess={onLoginSuccess}
        onGoSignup={vi.fn()}
      />
    );

    const emailInput =
      screen.getByLabelText("이메일");
    const passwordInput =
      screen.getByLabelText("비밀번호");

    expect(emailInput).toHaveAttribute(
      "autocomplete",
      "email"
    );
    expect(passwordInput).toHaveAttribute(
      "autocomplete",
      "current-password"
    );

    fireEvent.change(emailInput, {
      target: {
        value: "user@example.com",
      },
    });
    fireEvent.change(passwordInput, {
      target: {
        value: "password1",
      },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "로그인",
      })
    );

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith(
        "user@example.com",
        "password1"
      );
      expect(
        onLoginSuccess
      ).toHaveBeenCalledWith(user);
    });
  });

  it("exposes signup constraints and navigation", () => {
    const onGoLogin = vi.fn();

    render(
      <SignupPage
        onGoLogin={onGoLogin}
      />
    );

    expect(
      screen.getByLabelText("이메일")
    ).toHaveAttribute(
      "autocomplete",
      "email"
    );
    expect(
      screen.getByLabelText("비밀번호")
    ).toHaveAttribute(
      "minlength",
      "8"
    );
    expect(
      screen.getByLabelText("닉네임")
    ).toHaveAttribute(
      "maxlength",
      "20"
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "이미 계정이 있으신가요? 로그인",
      })
    );

    expect(onGoLogin).toHaveBeenCalledOnce();
    expect(signup).not.toHaveBeenCalled();
  });
});
