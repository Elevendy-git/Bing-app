import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BingSearchBox } from "./BingSearchBox";

afterEach(cleanup);

describe("BingSearchBox", () => {
  it("renders the complete default search experience", () => {
    render(<BingSearchBox />);

    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search Bing" })).toHaveAttribute(
      "placeholder",
      "Ask anything",
    );
    expect(screen.getByRole("button", { name: "Start visual search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start voice search" })).toBeInTheDocument();
  });

  it("accepts copy and accessible-label overrides without adding visual states", () => {
    render(<BingSearchBox placeholder="Search the web" ariaLabel="Search the web" />);

    expect(screen.getByRole("searchbox", { name: "Search the web" })).toHaveAttribute(
      "placeholder",
      "Search the web",
    );
  });

  it("opens voice without focusing or activating the text-search entry", () => {
    const voice = vi.fn(), search = vi.fn(), parentClick = vi.fn();
    render(<div onClick={parentClick}><BingSearchBox onVoiceSearch={voice} onOpenSearch={search} /></div>);
    const microphone = screen.getByRole("button", { name: "Start voice search" });
    expect(fireEvent.pointerDown(microphone)).toBe(false);
    expect(fireEvent.mouseDown(microphone)).toBe(false);
    fireEvent.click(microphone);
    expect(voice).toHaveBeenCalledOnce();
    expect(search).not.toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
    expect(screen.getByRole("searchbox")).not.toHaveFocus();
  });
});

