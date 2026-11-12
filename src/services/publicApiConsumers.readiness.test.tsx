import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveHomepageFeed } from "../screens/Homepage/LiveHomepageFeed";
import { LiveBingResults } from "../screens/SERP/LiveBingResults";
import { useSearchSuggestions } from "../screens/Search/useSearchSuggestions";
import { awaitPublicApiReady } from "./publicApiReady";

vi.mock("./publicApiReady", () => ({ awaitPublicApiReady: vi.fn() }));

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const settle = async (callback: () => void) => { await act(async () => { callback(); }); };
const results = (query: string) => ({ ok: true, json: async () => ({ query, html: `<p>${query}</p>`, fetchedAt: "2026-11-10T06:00:00Z" }) });
const suggestions = (query: string) => ({ ok: true, json: async () => [query, [`${query} today`]] });
const news = () => ({ ok: true, json: async () => ({ source: "msn", market: "en-us", fetchedAt: "2026-11-10T06:00:00Z", nextCursor: null,
  items: [{ id: "news", title: "A live news story", publisher: "Publisher", url: "https://www.msn.com/news/article",
    imageSrc: "https://example.com/news.jpg", imageAlt: "News", publisherLogoSrc: null, publishedAt: "2026-11-10T05:00:00Z" }],
}) });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("VITE_API_BASE_URL", "https://backend.onrender.com");
  vi.mocked(awaitPublicApiReady).mockReset();
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise(() => {})));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Public backend readiness at consumer boundaries", () => {
  it.each([undefined, "https://example.com/article"])("keeps SERP or webpage loading during a long wake, then gives the provider its full deadline (%s)", async (url) => {
    const wake = deferred();
    vi.mocked(awaitPublicApiReady).mockReturnValue(wake.promise);
    const onLoadStateChange = vi.fn();
    render(<LiveBingResults query="weather" url={url} onLoadStateChange={onLoadStateChange} />);
    await advance(20_000);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onLoadStateChange).toHaveBeenLastCalledWith("loading", 0);
    await settle(wake.resolve);
    expect(fetch).toHaveBeenCalledOnce();
    await advance((url ? 10_000 : 20_000) - 1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await advance(1);
    expect(screen.getByRole("alert")).toHaveTextContent(url ? "This page can’t be previewed" : "Couldn’t load results");
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("never fetches a superseded SERP after wake resolves, and cancels unmounted waits", async () => {
    const first = deferred(), current = deferred(), last = deferred();
    vi.mocked(awaitPublicApiReady).mockReturnValueOnce(first.promise).mockReturnValueOnce(current.promise).mockReturnValueOnce(last.promise);
    vi.mocked(fetch).mockResolvedValue(results("news") as Response);
    const { rerender, unmount } = render(<LiveBingResults query="weather" />);
    const firstSignal = vi.mocked(awaitPublicApiReady).mock.calls[0][0];
    rerender(<LiveBingResults query="news" />);
    expect(firstSignal.aborted).toBe(true);
    await settle(() => { first.resolve(); current.resolve(); });
    expect(fetch).toHaveBeenCalledOnce();
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("query=news");
    expect(screen.getByTitle("Bing results for news")).toBeInTheDocument();
    rerender(<LiveBingResults query="sports" />);
    const lastSignal = vi.mocked(awaitPublicApiReady).mock.calls[2][0];
    unmount();
    expect(lastSignal.aborted).toBe(true);
    await settle(last.resolve);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("allows retry after readiness fails without issuing a provider request first", async () => {
    vi.mocked(awaitPublicApiReady).mockRejectedValueOnce(new Error("startup failed")).mockResolvedValueOnce();
    vi.mocked(fetch).mockResolvedValue(results("weather") as Response);
    render(<LiveBingResults query="weather" />);
    await settle(() => {});
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t load results");
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await settle(() => {});
    expect(screen.getByTitle("Bing results for weather")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("keeps local requests immediate without a readiness probe", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    render(<LiveBingResults query="weather" />);
    expect(awaitPublicApiReady).not.toHaveBeenCalled();
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/bing-serp?query=weather");
  });

  it("keeps AS pending beyond its old deadline and starts the ten-second deadline after wake", async () => {
    const wake = deferred();
    vi.mocked(awaitPublicApiReady).mockReturnValue(wake.promise);
    const { result } = renderHook(() => useSearchSuggestions("weather", true));
    await advance(20_080);
    expect(result.current).toMatchObject({ source: "loading", items: [] });
    expect(fetch).not.toHaveBeenCalled();
    await settle(wake.resolve);
    expect(fetch).toHaveBeenCalledOnce();
    await advance(9_999);
    expect(result.current.source).toBe("loading");
    await advance(1);
    expect(result.current).toMatchObject({ source: "fallback", items: [] });
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("requests only the newest AS query if typing replaces a pending wake", async () => {
    const old = deferred(), current = deferred();
    vi.mocked(awaitPublicApiReady).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    vi.mocked(fetch).mockResolvedValue(suggestions("news") as Response);
    const { result, rerender } = renderHook(({ query }) => useSearchSuggestions(query, true), { initialProps: { query: "weather" } });
    await advance(80);
    const oldSignal = vi.mocked(awaitPublicApiReady).mock.calls[0][0];
    rerender({ query: "news" });
    expect(oldSignal.aborted).toBe(true);
    await advance(80);
    await settle(() => { old.resolve(); current.resolve(); });
    expect(fetch).toHaveBeenCalledOnce();
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("query=news");
    expect(result.current).toMatchObject({ source: "live", items: [{ query: "news today" }] });
  });

  it.each(["empty", "inactive", "unmount"])("cancels the AS readiness wait on %s and ignores its late resolution", async (reason) => {
    const wake = deferred();
    vi.mocked(awaitPublicApiReady).mockReturnValue(wake.promise);
    const { rerender, unmount } = renderHook(({ query, active }) => useSearchSuggestions(query, true, active), {
      initialProps: { query: "weather", active: true },
    });
    await advance(80);
    const signal = vi.mocked(awaitPublicApiReady).mock.calls[0][0];
    if (reason === "unmount") unmount();
    else rerender({ query: reason === "empty" ? "" : "weather", active: reason !== "inactive" });
    expect(signal.aborted).toBe(true);
    await settle(wake.resolve);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("leaves AS empty on readiness failure and recovers for a new query", async () => {
    vi.mocked(awaitPublicApiReady).mockRejectedValueOnce(new Error("startup failed")).mockResolvedValueOnce();
    vi.mocked(fetch).mockResolvedValue(suggestions("news") as Response);
    const { result, rerender } = renderHook(({ query }) => useSearchSuggestions(query, true), { initialProps: { query: "weather" } });
    await advance(80);
    expect(result.current).toMatchObject({ source: "fallback", items: [] });
    expect(fetch).not.toHaveBeenCalled();
    rerender({ query: "news" });
    await advance(80);
    expect(result.current).toMatchObject({ source: "live", items: [{ query: "news today" }] });
  });

  it("keeps news skeletons during wake and shows real articles after readiness", async () => {
    const wake = deferred();
    vi.mocked(awaitPublicApiReady).mockReturnValue(wake.promise);
    vi.mocked(fetch).mockResolvedValue(news() as Response);
    render(<LiveHomepageFeed />);
    await advance(20_000);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getAllByRole("article", { name: "Loading feed card" })).toHaveLength(3);
    expect(screen.queryByText("News couldn’t load")).not.toBeInTheDocument();
    await settle(wake.resolve);
    expect(screen.getByRole("heading", { name: "A live news story" })).toBeVisible();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("cancels the news readiness wait on unmount without a late fetch", async () => {
    const wake = deferred();
    vi.mocked(awaitPublicApiReady).mockReturnValue(wake.promise);
    const { unmount } = render(<LiveHomepageFeed />);
    const signal = vi.mocked(awaitPublicApiReady).mock.calls[0][0];
    unmount();
    expect(signal.aborted).toBe(true);
    await settle(wake.resolve);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("can retry news after readiness fails without fabricating a feed", async () => {
    vi.mocked(awaitPublicApiReady).mockRejectedValueOnce(new Error("startup failed")).mockResolvedValueOnce();
    vi.mocked(fetch).mockResolvedValue(news() as Response);
    render(<LiveHomepageFeed />);
    await settle(() => {});
    expect(screen.getByText("News couldn’t load")).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await settle(() => {});
    expect(screen.getByRole("heading", { name: "A live news story" })).toBeVisible();
    expect(fetch).toHaveBeenCalledOnce();
  });
});
