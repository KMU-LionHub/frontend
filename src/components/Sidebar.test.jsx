import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import Sidebar from "./Sidebar";

afterEach(cleanup);

describe("Sidebar", () => {
  it("identifies the active view and changes menus", () => {
    const onMenuChange = vi.fn();

    render(
      <Sidebar
        activeMenu="history"
        onMenuChange={onMenuChange}
        onLogout={vi.fn()}
      />
    );

    expect(
      screen.getByRole("navigation", {
        name: "주요 메뉴",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "대화 기록",
      })
    ).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      screen.getByRole("button", {
        name: "녹음",
      })
    ).not.toHaveAttribute(
      "aria-current"
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "도움말",
      })
    );

    expect(onMenuChange).toHaveBeenCalledWith(
      "help"
    );
  });
});
