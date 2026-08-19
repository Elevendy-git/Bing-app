import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppFooter } from "./AppFooter";

afterEach(cleanup);

describe("AppFooter", () => {
  it("renders the exact three-destination footer with Home selected", () => {
    render(<AppFooter />);

    const footer = screen.getByRole("contentinfo", {
      name: "Bing app navigation",
    });
    expect(footer).toBeInTheDocument();
    expect(footer.children).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "data-destination",
      "home",
    );
    expect(
      screen.getByRole("button", { name: "Home" }).querySelector("svg"),
    ).toHaveAttribute("data-icon-variant", "filled");
    expect(screen.queryByRole("button", { name: "Copilot" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Copilot" })).toHaveAttribute(
      "data-state",
      "single",
    );
    expect(screen.getByRole("img", { name: "Copilot" })).toHaveAttribute(
      "data-destination",
      "copilot",
    );
    expect(
      screen.getByRole("img", { name: "Copilot" }).querySelector("img"),
    ).toHaveAttribute("data-icon-variant", "single");
    expect(screen.getByRole("button", { name: "Collections" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collections" }).querySelector("svg"),
    ).toHaveAttribute("data-icon-variant", "regular");
  });

  it("switches the selected state when an action is clicked", () => {
    render(<AppFooter />);

    fireEvent.click(screen.getByRole("button", { name: "Collections" }));

    expect(screen.getByRole("button", { name: "Collections" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("button", { name: "Collections" }).querySelector("svg"),
    ).toHaveAttribute("data-icon-variant", "filled");
    expect(screen.getByRole("button", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(
      screen.getByRole("button", { name: "Home" }).querySelector("svg"),
    ).toHaveAttribute("data-icon-variant", "regular");
  });

  it("supports controlled selection", () => {
    const onSelectedTabChange = vi.fn();
    render(
      <AppFooter selectedTab="collections" onSelectedTabChange={onSelectedTabChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    expect(onSelectedTabChange).toHaveBeenCalledWith("home");
    expect(screen.getByRole("button", { name: "Collections" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("button", { name: "Collections" }).querySelector("svg"),
    ).toHaveAttribute("data-icon-variant", "filled");
  });
});
