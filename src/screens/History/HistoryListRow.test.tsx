import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryListRow } from "./HistoryListRow";
import listStyles from "../../components/AppList/AppList.module.css";

afterEach(cleanup);

describe("History site identity", () => {
  it("opens the URL's decoded query and keeps the overflow area separate", () => {
    const onOpenSearch = vi.fn();
    const entry = { id: "visit", title: "Display title", subtitle: "https://www.bing.com/search?q=cats+%26+dogs&setlang=en" };
    const { container, rerender } = render(<HistoryListRow entry={entry} onOpenSearch={onOpenSearch} />);
    fireEvent.click(container.querySelector(`.${listStyles.passiveControl}`)!);
    expect(onOpenSearch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Display title" }));
    expect(onOpenSearch).toHaveBeenCalledWith("cats & dogs");
    rerender(<HistoryListRow entry={entry} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each(["https://medium.com/", "https://www.bing.com/search", "https://www.bing.com/search?q=", "https://other.example/search?q=weather", "not a URL"])
    ("does not turn an unsupported record into a guessed query: %s", subtitle => {
      render(<HistoryListRow entry={{ id: "fixture", title: "Medium", subtitle }} onOpenSearch={vi.fn()} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

  it("uses the page icon and falls back to a neutral symbol if it fails or is missing", () => {
    const entry = { id: "bing", title: "baidu", subtitle: "https://www.bing.com/search?q=baidu", logoSrc: "https://www.bing.com/favicon.ico" };
    const { container, rerender } = render(<HistoryListRow entry={entry} />);
    expect(container.querySelector("img")).toHaveAttribute("src", entry.logoSrc);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(entry.subtitle)).toBeVisible();
    rerender(<HistoryListRow entry={{ ...entry, logoSrc: undefined }} />);
    expect(container.querySelector("img")).toBeNull();
    rerender(<HistoryListRow entry={{ ...entry, logoSrc: "https://www.bing.com/new-icon.ico" }} />);
    expect(container.querySelector("img")).toHaveAttribute("src", "https://www.bing.com/new-icon.ico");
  });
});
