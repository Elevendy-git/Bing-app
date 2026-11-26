import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserLoadError } from "./BrowserLoadError";

afterEach(cleanup);

describe("Browser load error", () => {
  it.each([false, true])("preserves the error copy and retry action for webPage=%s", webPage => {
    const onRetry = vi.fn();
    render(<BrowserLoadError webPage={webPage} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(webPage ? "This page can’t be previewed" : "Couldn’t load results");
    expect(Boolean(screen.queryByText("You can try again or go back to your results."))).toBe(webPage);
    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry).toBeEnabled();
    expect(retry).not.toHaveFocus();
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("keeps a design preview's retry control passive and unfocusable", () => {
    render(<BrowserLoadError />);
    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry).toBeDisabled();
    retry.focus();
    expect(retry).not.toHaveFocus();
    fireEvent.click(retry);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t load results");
  });
});
