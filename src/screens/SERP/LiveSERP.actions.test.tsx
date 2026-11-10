import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveSERP } from "./LiveSERP";
import { usePrototypeActivity } from "../activity/usePrototypeActivity";
import type { BookmarkEntry, HistoryEntry } from "../activity/types";
import type { IABFindRequest } from "../../services/webNavigation";

const requested = "https://publisher.example/start?story=1#intro";
const canonical = "https://publisher.example/article?story=1";
const favicon = "https://publisher.example/favicon.ico";
const fetchedAt = "2026-11-09T06:00:00Z";
const response = (body: object) => ({ ok: true, json: async () => body });
let fetcher: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetcher = vi.fn(async (value: string) => {
    const url = new URL(value, "https://app.example");
    if (url.pathname.endsWith("/api/bing-serp")) return response({ query: url.searchParams.get("query"),
      html: `<p>Weather weather results.</p><a href="${requested}">Read article</a>`, fetchedAt });
    const destination = url.searchParams.get("url");
    return response({ requestedUrl: destination, sourceUrl: canonical, title: destination === canonical ? "Refreshed article" : "Published article",
      faviconUrl: favicon, html: "<p>Weather in the published article. Weather details.</p>", fetchedAt });
  });
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function loadedFrame(title: string) {
  const frame = await screen.findByTitle(title) as HTMLIFrameElement;
  // Settle document load and its passive bridge listener before sending messages.
  await act(async () => { fireEvent.load(frame); });
  return frame;
}
const channel = (frame: HTMLIFrameElement) => frame.srcdoc.match(/nonce="([^"]+)"/)![1];
function navigate(frame: HTMLIFrameElement, url: string) {
  fireEvent(window, new MessageEvent("message", { source: frame.contentWindow, origin: "null",
    data: { type: "bing-iab-navigate", channel: channel(frame), url } }));
}
async function selectAction(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "More options" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("menuitem", { name }));
  await waitFor(() => expect(dialog.isConnected).toBe(false), { mutationObserverOptions: { childList: true, subtree: true } });
  expect(dialog).not.toBeInTheDocument();
  // Find starts on the next frame, after the exiting sheet releases its focus lock.
  if (name === "Find on page") await screen.findByRole("region", { name: "Find on page" });
}
function activityState(): { bookmarks: BookmarkEntry[]; history: HistoryEntry[]; tabs: string[] } {
  return JSON.parse(screen.getByLabelText("Activity state").textContent!);
}
function ActivityBrowser({ initialUrl }: { initialUrl?: string }) {
  const activity = usePrototypeActivity("empty");
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    activity.createResultSession(initialUrl ?? "Weather", { privateMode: false });
  }, [initialUrl]);
  const owner = activity.activeResult;
  return <>
    {owner && <LiveSERP query={owner.query} initialUrl={owner.initialUrl}
      onPageReady={(snapshot, navigationId) => activity.saveResultPage(owner, snapshot, navigationId)}
      isBookmarked={activity.isBookmarked} onToggleBookmark={page => activity.toggleBookmark(page)} />}
    <output aria-label="Activity state">{JSON.stringify({ bookmarks: activity.bookmarks, history: activity.browsingHistory, tabs: activity.tabs.map(tab => tab.id) })}</output>
  </>;
}
type PostedFind = IABFindRequest & { type: "bing-iab-find"; channel: string };
function latestFind(post: { mock: { calls: unknown[][] } }): PostedFind {
  return post.mock.calls.map(call => call[0] as PostedFind).filter(message => message.type === "bing-iab-find").at(-1)!;
}
function found(frame: HTMLIFrameElement, request: PostedFind, total: number, index: number) {
  fireEvent(window, new MessageEvent("message", { source: frame.contentWindow, origin: "null",
    data: { ...request, type: "bing-iab-find-result", total, index } }));
}

describe("LiveSERP browser actions", () => {
  it("refreshes only the current canonical webpage and keeps the retained SERP and visit identities", async () => {
    render(<ActivityBrowser />);
    const serp = await loadedFrame("Bing results for Weather");
    navigate(serp, requested);
    const article = await loadedFrame(`Web page: ${requested}`);
    const before = activityState();
    expect(before.history).toHaveLength(2);
    expect(before.history[0]).toMatchObject({ subtitle: canonical, title: "Published article", logoSrc: favicon });
    await selectAction("Refresh");
    const refreshed = await loadedFrame(`Web page: ${canonical}`);
    expect(refreshed).not.toBe(article);
    expect(article).not.toBeInTheDocument();
    expect(serp).toBeInTheDocument();
    expect(serp.closest("[inert]")).not.toBeNull();
    expect(activityState().history.map(entry => entry.id)).toEqual(before.history.map(entry => entry.id));
    expect(activityState().history[0]).toMatchObject({ title: "Refreshed article", subtitle: canonical });
    expect(activityState().tabs).toEqual(before.tabs);
    expect(fetcher.mock.calls.map(([value]) => new URL(value, "https://app.example").searchParams.get("url"))).toEqual([null, requested, canonical]);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByTitle("Bing results for Weather")).toBe(serp);
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    expect(screen.getByTitle(`Web page: ${canonical}`)).toBe(refreshed);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(activityState().history.map(entry => entry.id)).toEqual(before.history.map(entry => entry.id));
  });

  it("uses the loaded canonical webpage metadata for its bookmark star and removes the same saved site", async () => {
    render(<ActivityBrowser initialUrl={requested} />);
    const frame = await loadedFrame(`Web page: ${requested}`);
    expect(screen.getByRole("group", { name: "Webpage address" })).toHaveTextContent(canonical);
    const save = screen.getByRole("button", { name: "Save bookmark" });
    expect(save).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(save);
    expect(activityState().bookmarks).toMatchObject([{ title: "Published article", subtitle: canonical, logoSrc: favicon }]);
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Remove bookmark" }));
    expect(activityState().bookmarks).toEqual([]);
    expect(screen.getByRole("button", { name: "Save bookmark" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTitle(`Web page: ${requested}`)).toBe(frame);
    expect(activityState().history).toHaveLength(1);
    expect(activityState().tabs).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("steps current Find matches without flashing zero, ignores stale counts, and keeps requests in the loaded document", async () => {
    render(<LiveSERP query="Weather" />);
    const frame = await loadedFrame("Bing results for Weather");
    const post = vi.spyOn(frame.contentWindow!, "postMessage").mockImplementation(() => {});
    await selectAction("Find on page");
    const panel = screen.getByRole("region", { name: "Find on page" });
    const input = within(panel).getByRole("searchbox", { name: "Find text on page" });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "weather" } });
    const first = latestFind(post);
    expect(first).toMatchObject({ query: "weather", index: 0, channel: channel(frame) });
    found(frame, first, 2, 0);
    expect(within(panel).getByRole("status")).toHaveTextContent("1 of 2");
    fireEvent.click(within(panel).getByRole("button", { name: "Next match" }));
    const next = latestFind(post);
    expect(next).toMatchObject({ query: "weather", index: 1 });
    expect(next.requestId).toBeGreaterThan(first.requestId);
    expect(within(panel).getByRole("status")).toHaveTextContent("2 of 2");
    expect(within(panel).getByRole("button", { name: "Next match" })).toBeEnabled();
    found(frame, next, 2, 1);
    expect(within(panel).getByRole("status")).toHaveTextContent("2 of 2");
    fireEvent.click(within(panel).getByRole("button", { name: "Next match" }));
    expect(latestFind(post).index).toBe(2);
    found(frame, latestFind(post), 2, 0);
    fireEvent.click(within(panel).getByRole("button", { name: "Previous match" }));
    expect(latestFind(post).index).toBe(-1);
    found(frame, latestFind(post), 2, 1);
    expect(within(panel).getByRole("status")).toHaveTextContent("2 of 2");
    fireEvent.change(input, { target: { value: "missing" } });
    expect(within(panel).getByRole("status")).toHaveTextContent("No matches");
    found(frame, next, 2, 1);
    expect(within(panel).getByRole("status")).toHaveTextContent("No matches");
    found(frame, latestFind(post), 0, -1);
    expect(within(panel).getByRole("button", { name: "Next match" })).toBeDisabled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Find on page" })).not.toBeInTheDocument();
    expect(latestFind(post).query).toBe("");
    expect(screen.getByTitle("Bing results for Weather")).toBe(frame);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("clears Find on dismissal, hiding and navigation, then reopens without the previous query or count", async () => {
    const { rerender } = render(<LiveSERP query="Weather" />);
    const serp = await loadedFrame("Bing results for Weather");
    const post = vi.spyOn(serp.contentWindow!, "postMessage").mockImplementation(() => {});
    await selectAction("Find on page");
    let input = screen.getByRole("searchbox", { name: "Find text on page" });
    fireEvent.change(input, { target: { value: "weather" } });
    found(serp, latestFind(post), 2, 0);
    // The keyboard return key is also labelled Done; this is the task's toolbar.
    fireEvent.click(within(screen.getByRole("region", { name: "Find on page" })).getByText("Done", { selector: "button" }));
    expect(latestFind(post).query).toBe("");
    await selectAction("Find on page");
    input = screen.getByRole("searchbox", { name: "Find text on page" });
    expect(input).toHaveValue("");
    expect(within(screen.getByRole("region", { name: "Find on page" })).getByRole("status")).toHaveTextContent("Find in this page");
    fireEvent.change(input, { target: { value: "weather" } });
    rerender(<LiveSERP query="Weather" active={false} />);
    expect(screen.queryByRole("region", { name: "Find on page" })).not.toBeInTheDocument();
    expect(post).toHaveBeenLastCalledWith({ type: "bing-iab-find-clear", channel: channel(serp) }, "*");
    rerender(<LiveSERP query="Weather" />);
    await selectAction("Find on page");
    expect(screen.getByRole("searchbox", { name: "Find text on page" })).toHaveValue("");
    fireEvent.change(screen.getByRole("searchbox", { name: "Find text on page" }), { target: { value: "weather" } });
    navigate(serp, requested);
    await loadedFrame(`Web page: ${requested}`);
    expect(screen.queryByRole("region", { name: "Find on page" })).not.toBeInTheDocument();
    // The Find footer releases its place only after its keyboard finishes exiting.
    fireEvent.click(await screen.findByRole("button", { name: "Back" }));
    expect(screen.getByTitle("Bing results for Weather")).toBe(serp);
    await selectAction("Find on page");
    expect(screen.getByRole("searchbox", { name: "Find text on page" })).toHaveValue("");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
