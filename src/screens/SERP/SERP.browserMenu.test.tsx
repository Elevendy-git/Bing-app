import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SERP } from "./SERP";
import type { FindOnPageState } from "./FindOnPage";

const motionPreference = vi.hoisted(() => ({ reduced: true }));
vi.mock("motion/react", async original => ({
  ...await original<typeof import("motion/react")>(), useReducedMotion: () => motionPreference.reduced,
}));

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const shareDescriptor = Object.getOwnPropertyDescriptor(navigator, "share");
const pageUrl = "https://example.com/final/article?q=actual%20result#details";
const loadedTitle = "The loaded page title";

function browserApis({ share, writeText = vi.fn().mockResolvedValue(undefined) }: {
  share?: ReturnType<typeof vi.fn>; writeText?: ReturnType<typeof vi.fn>;
} = {}) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  Object.defineProperty(navigator, "share", { configurable: true, value: share });
  return { share, writeText };
}

beforeEach(() => { motionPreference.reduced = true; browserApis(); vi.spyOn(window, "open").mockReturnValue(null); });
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor); else Reflect.deleteProperty(navigator, "clipboard");
  if (shareDescriptor) Object.defineProperty(navigator, "share", shareDescriptor); else Reflect.deleteProperty(navigator, "share");
});

const documentContent = <p>Real document content</p>;
const refresh = () => undefined;

function FindExample({ active = true, onFind }: { active?: boolean; onFind: () => void }) {
  const [find, setFind] = useState(false);
  const [query, setQuery] = useState("");
  const state: FindOnPageState = { query, total: 0, index: -1, onQueryChange: setQuery,
    onPrevious: () => undefined, onNext: () => undefined, onDismiss: () => setFind(false) };
  return <SERP active={active} onRefresh={refresh} webContent={documentContent}
    onFindOnPage={() => { onFind(); setFind(true); }} find={find ? state : undefined} />;
}

async function waitForSheetRemoval(dialog: HTMLElement) {
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
}

describe("SERP browser-menu host", () => {
  it.each([false, true])("opens the matching menu for webPage=%s and keeps the document inert", webPage => {
    render(<SERP webPage={webPage} query={webPage ? pageUrl : "Weather"} pageUrl={pageUrl}
      onRefresh={refresh} webContent={documentContent} />);
    const document = screen.getByText("Real document content");
    const trigger = screen.getByRole("button", { name: "More options" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: webPage ? "Webpage options" : "Search results options" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.closest("[inert]")).not.toBeNull();
    expect(within(dialog).getByRole("menuitem", { name: "Refresh" })).toHaveFocus();
    expect(within(dialog).queryByRole("menuitem", { name: "Search settings" }) !== null).toBe(!webPage);
    expect(within(dialog).getByRole("menuitem", { name: "Cancel" })).toBeInTheDocument();
  });

  it.each(["Cancel", "outside", "Escape"])("dismisses with %s and restores the More trigger without navigating", async method => {
    const onBack = vi.fn();
    const onEditQuery = vi.fn();
    const onRefresh = vi.fn();
    render(<SERP onBack={onBack} onEditQuery={onEditQuery} onRefresh={onRefresh} webContent={documentContent} />);
    const trigger = screen.getByRole("button", { name: "More options" });
    const document = screen.getByText("Real document content");
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    if (method === "Cancel") fireEvent.click(within(dialog).getByRole("menuitem", { name: "Cancel" }));
    else if (method === "outside") fireEvent.click(dialog.parentElement!);
    else fireEvent.keyDown(dialog, { key: "Escape" });
    await waitForSheetRemoval(dialog);
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.closest("[inert]")).toBeNull();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(onBack).not.toHaveBeenCalled();
    expect(onEditQuery).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("copies the loaded final URL rather than the search-field text", async () => {
    const { writeText } = browserApis();
    render(<SERP query="Previous query" pageUrl={pageUrl} pageTitle={loadedTitle} onRefresh={refresh} webContent={documentContent} />);
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledExactlyOnceWith(pageUrl));
    expect(await screen.findByRole("status")).toHaveTextContent("Link copied");
    expect(window.open).not.toHaveBeenCalled();
  });

  it("opens the final URL in the default browser without sharing app credentials", async () => {
    render(<SERP webPage query="Original location" pageUrl={pageUrl} onRefresh={refresh} webContent={documentContent} />);
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("menuitem", { name: "Open in default browser" }));
    expect(window.open).toHaveBeenCalledExactlyOnceWith(pageUrl, "_blank", "noopener,noreferrer");
    await waitForSheetRemoval(dialog);
  });

  it("uses native share with loaded metadata and closes without a fabricated success notice", async () => {
    const { share, writeText } = browserApis({ share: vi.fn().mockResolvedValue(undefined) });
    render(<SERP webPage query="Original URL" pageUrl={pageUrl} pageTitle={loadedTitle} onRefresh={refresh} webContent={documentContent} />);
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("menuitem", { name: "Share" }));
    await waitFor(() => expect(share).toHaveBeenCalledExactlyOnceWith({ url: pageUrl, title: loadedTitle }));
    await waitForSheetRemoval(dialog);
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("labels the copy fallback honestly when native sharing is unavailable", async () => {
    const { writeText } = browserApis();
    render(<SERP webPage query={pageUrl} pageUrl={pageUrl} onRefresh={refresh} webContent={documentContent} />);
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Share" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Link copied. You can share it.");
    expect(writeText).toHaveBeenCalledExactlyOnceWith(pageUrl);
  });

  it("silently closes a cancelled native share without copying or showing an error", async () => {
    const { writeText } = browserApis({ share: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")) });
    render(<SERP pageUrl={pageUrl} onRefresh={refresh} webContent={documentContent} />);
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("menuitem", { name: "Share" }));
    await waitForSheetRemoval(dialog);
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reports a failed copy without displaying the success notice", async () => {
    browserApis({ writeText: vi.fn().mockRejectedValue(new Error("Permission denied")) });
    render(<SERP pageUrl={pageUrl} onRefresh={refresh} webContent={documentContent} />);
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy link" }));
    expect(await screen.findByRole("status")).toHaveTextContent("This action couldn’t finish. Please try again.");
    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
  });

  it.each([false, true])("opens and focuses Find only after the sheet releases its background (reduced=%s)", async reduced => {
    motionPreference.reduced = reduced;
    const onFind = vi.fn();
    render(<FindExample onFind={onFind} />);
    const document = screen.getByText("Real document content");
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    const dialog = screen.getByRole("dialog");
    if (!reduced) await waitFor(() => expect(dialog.style.transform).toBe("none"));
    fireEvent.click(within(dialog).getByRole("menuitem", { name: "Find on page" }));
    expect(onFind).not.toHaveBeenCalled();
    expect(document.closest("[inert]")).not.toBeNull();
    expect(screen.queryByRole("searchbox", { name: "Find text on page" })).not.toBeInTheDocument();
    const input = await screen.findByRole("searchbox", { name: "Find text on page" });
    expect(dialog).not.toBeInTheDocument();
    expect(document.closest("[inert]")).toBeNull();
    expect(input).toHaveFocus();
    expect(onFind).toHaveBeenCalledTimes(1);
  });

  it("cancels pending Find and menu focus restoration when its page becomes inactive", async () => {
    const onFind = vi.fn();
    const { rerender } = render(<><button>Other page control</button><FindExample onFind={onFind} /></>);
    const other = screen.getByRole("button", { name: "Other page control" });
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("menuitem", { name: "Find on page" }));
    rerender(<><button>Other page control</button><FindExample active={false} onFind={onFind} /></>);
    act(() => other.focus());
    await waitForSheetRemoval(dialog);
    await act(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); });
    expect(other).toHaveFocus();
    expect(onFind).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Find on page" })).not.toBeInTheDocument();
  });

  it("closes an open sheet on inactivity and leaves the active page's focus alone", async () => {
    const { rerender } = render(<><button>Other page control</button><SERP onRefresh={refresh} webContent={documentContent} /></>);
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    const dialog = screen.getByRole("dialog");
    const other = screen.getByRole("button", { name: "Other page control" });
    rerender(<><button>Other page control</button><SERP active={false} onRefresh={refresh} webContent={documentContent} /></>);
    act(() => other.focus());
    await waitForSheetRemoval(dialog);
    await act(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); });
    expect(other).toHaveFocus();
    rerender(<><button>Other page control</button><SERP onRefresh={refresh} webContent={documentContent} /></>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More options" })).toHaveAttribute("aria-expanded", "false");
  });

  it("drops a late URL-action notice after leaving the page", async () => {
    let finish!: () => void;
    const { writeText } = browserApis({ writeText: vi.fn(() => new Promise<void>(resolve => { finish = resolve; })) });
    const { rerender } = render(<SERP pageUrl={pageUrl} onRefresh={refresh} webContent={documentContent} />);
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledExactlyOnceWith(pageUrl);
    rerender(<SERP active={false} pageUrl={pageUrl} onRefresh={refresh} webContent={documentContent} />);
    await act(async () => finish());
    rerender(<SERP pageUrl={pageUrl} onRefresh={refresh} webContent={documentContent} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument());
  });

  it("toggles the webpage star independently of editing and reports saved/removed state", async () => {
    const onToggleBookmark = vi.fn().mockReturnValue(true);
    const onEditQuery = vi.fn();
    const { rerender } = render(<SERP webPage query={pageUrl} onRefresh={refresh} onEditQuery={onEditQuery}
      onToggleBookmark={onToggleBookmark} bookmarked={false} webContent={documentContent} />);
    const star = screen.getByRole("button", { name: "Save bookmark" });
    expect(star).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(star);
    expect(await screen.findByRole("status")).toHaveTextContent("Saved to bookmarks");
    expect(onToggleBookmark).toHaveBeenCalledTimes(1);
    expect(onEditQuery).not.toHaveBeenCalled();
    onToggleBookmark.mockReturnValue(false);
    rerender(<SERP webPage query={pageUrl} onRefresh={refresh} onEditQuery={onEditQuery}
      onToggleBookmark={onToggleBookmark} bookmarked webContent={documentContent} />);
    const remove = screen.getByRole("button", { name: "Remove bookmark" });
    expect(remove).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(remove);
    await waitFor(() => expect(screen.getAllByRole("status").some(status => status.textContent?.includes("Bookmark removed"))).toBe(true));
    expect(onToggleBookmark).toHaveBeenCalledTimes(2);
    expect(onEditQuery).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Start voice search" })).not.toBeInTheDocument();
  });

  it("shows the private bookmark notice without saving or claiming success", async () => {
    const onToggleBookmark = vi.fn();
    render(<SERP webPage privateMode query={pageUrl} onRefresh={refresh} onToggleBookmark={onToggleBookmark} webContent={documentContent} />);
    fireEvent.click(screen.getByRole("button", { name: "Save bookmark" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Bookmarks aren’t saved in InPrivate");
    expect(onToggleBookmark).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save bookmark" })).toHaveAttribute("aria-pressed", "false");
  });
});
