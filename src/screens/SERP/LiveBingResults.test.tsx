import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveBingResults } from "./LiveBingResults";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const response = (query: string) => ({ ok: true, json: async () => ({ query, html: `<p>${query} result</p>`, fetchedAt: "2026-10-15T06:00:00Z" }) });

describe("Live Bing result viewport", () => {
  it("keeps fallback attribution and history metadata with the actual search provider", async () => {
    const onPageReady = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ query: "baidu", provider: "duckduckgo",
      sourceUrl: "https://duckduckgo.com/?q=baidu&kl=us-en", faviconUrl: null, html: "<p>Results from DuckDuckGo</p>", fetchedAt: "2026-11-12T10:00:00Z" }) }));
    render(<LiveBingResults query="baidu" onPageReady={onPageReady} />);
    const frame = await screen.findByTitle("DuckDuckGo results for baidu");
    expect(frame).toHaveAttribute("data-results-source", "duckduckgo-html");
    expect(screen.queryByTitle("Bing results for baidu")).not.toBeInTheDocument();
    fireEvent.load(frame);
    expect(onPageReady).toHaveBeenCalledWith(expect.objectContaining({ sourceUrl: "https://duckduckgo.com/?q=baidu&kl=us-en", searchProvider: "duckduckgo" }));
  });
  it("loads both results and web destinations from the configured public backend", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://bing-backend.onrender.com/");
    vi.stubEnv("BASE_URL", "/Bing-app/");
    const destination = "https://example.com/article?topic=weather&lang=en";
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: "ok" }) })
      .mockResolvedValueOnce(response("Weather & news")).mockResolvedValueOnce({ ok: true, json: async () => ({
      requestedUrl: destination, sourceUrl: destination, html: "<p>Article</p>", fetchedAt: "2026-11-01T10:00:00Z",
    }) });
    vi.stubGlobal("fetch", fetcher);
    const { rerender } = render(<LiveBingResults query="Weather & news" />);
    await screen.findByTitle("Bing results for Weather & news");
    rerender(<LiveBingResults query="Weather & news" url={destination} />);
    await screen.findByTitle(`Web page: ${destination}`);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "https://bing-backend.onrender.com/health",
      "https://bing-backend.onrender.com/api/bing-serp?query=Weather+%26+news",
      `https://bing-backend.onrender.com/api/web-page?${new URLSearchParams({ url: destination })}`,
    ]);
    for (const [, options] of fetcher.mock.calls) {
      expect(options).toMatchObject({ credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", headers: { Accept: "application/json" } });
    }
  });

  it("shows a recoverable result error when the deployment backend URL is invalid", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://remote.example.com");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    render(<LiveBingResults query="Weather" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t load results");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("isolates the web document and allows retry after a fetch failure", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response("Weather"));
    vi.stubGlobal("fetch", fetcher);
    render(<LiveBingResults query="Weather" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t load results");
    expect(screen.queryByTitle("Bing results for Weather")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    const frame = await screen.findByTitle("Bing results for Weather");
    expect(frame).toHaveAttribute("srcdoc", "<p>Weather result</p>");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: "omit", cache: "no-store" });
  });

  it("aborts obsolete requests and never renders an older query over the current one", async () => {
    const onPageReady = vi.fn();
    let resolveOld!: (value: ReturnType<typeof response>) => void;
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce(response("News"));
    vi.stubGlobal("fetch", fetcher);
    const { rerender } = render(<LiveBingResults query="Weather" onPageReady={onPageReady} />);
    const signal = fetcher.mock.calls[0][1].signal as AbortSignal;
    rerender(<LiveBingResults query="News" onPageReady={onPageReady} />);
    expect(signal.aborted).toBe(true);
    const frame = await screen.findByTitle("Bing results for News");
    resolveOld(response("Weather"));
    await Promise.resolve();
    expect(frame).toHaveAttribute("srcdoc", "<p>News result</p>");
    expect(screen.queryByTitle("Bing results for Weather")).not.toBeInTheDocument();
    fireEvent.load(frame);
    expect(onPageReady).toHaveBeenCalledOnce();
    expect(onPageReady).toHaveBeenCalledWith(expect.objectContaining({ html: "<p>News result</p>", sourceUrl: "https://www.bing.com/search?q=News", faviconUrl: null }));
  });

  it("queues find until the document loads, searches without refetching, and clears covered or closed tasks", async () => {
    const fetcher = vi.fn().mockResolvedValue(response("Weather"));
    vi.stubGlobal("fetch", fetcher);
    const onFindResult = vi.fn(), onPageReady = vi.fn();
    const first = { query: "weather", index: 0, requestId: 1 };
    const { rerender } = render(<LiveBingResults query="Weather" findRequest={first} onFindResult={onFindResult} onPageReady={onPageReady} />);
    const frame = await screen.findByTitle("Bing results for Weather") as HTMLIFrameElement;
    const post = vi.spyOn(frame.contentWindow!, "postMessage").mockImplementation(() => {});
    const channel = frame.srcdoc.match(/nonce="([^"]+)"/)![1];
    expect(frame).toHaveAttribute("sandbox", "allow-scripts");
    expect(frame.getAttribute("sandbox")).not.toMatch(/same-origin|popups/);
    expect(post).not.toHaveBeenCalled();
    fireEvent.load(frame);
    expect(post).toHaveBeenLastCalledWith({ type: "bing-iab-find", channel, ...first }, "*");
    const srcdoc = frame.srcdoc;
    const next = { query: "result", index: -1, requestId: 2 };
    rerender(<LiveBingResults query="Weather" findRequest={next} onFindResult={onFindResult} onPageReady={onPageReady} />);
    expect(post).toHaveBeenLastCalledWith({ type: "bing-iab-find", channel, ...next }, "*");
    expect(frame.srcdoc).toBe(srcdoc);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(onPageReady).toHaveBeenCalledOnce();
    expect(onPageReady).toHaveBeenCalledWith(expect.objectContaining({ html: "<p>Weather result</p>" }));
    rerender(<LiveBingResults query="Weather" active={false} findRequest={next} onFindResult={onFindResult} />);
    expect(post).toHaveBeenLastCalledWith({ type: "bing-iab-find-clear", channel }, "*");
    rerender(<LiveBingResults query="Weather" findRequest={next} onFindResult={onFindResult} />);
    expect(post).toHaveBeenLastCalledWith({ type: "bing-iab-find", channel, ...next }, "*");
    rerender(<LiveBingResults query="Weather" onFindResult={onFindResult} />);
    expect(post).toHaveBeenLastCalledWith({ type: "bing-iab-find-clear", channel }, "*");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("accepts only the latest find result from the current opaque document", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response("Weather")));
    const onFindResult = vi.fn();
    const first = { query: "weather", index: 0, requestId: 1 };
    const { rerender } = render(<LiveBingResults query="Weather" findRequest={first} onFindResult={onFindResult} />);
    const frame = await screen.findByTitle("Bing results for Weather") as HTMLIFrameElement;
    vi.spyOn(frame.contentWindow!, "postMessage").mockImplementation(() => {});
    const channel = frame.srcdoc.match(/nonce="([^"]+)"/)![1];
    const emit = (data: Record<string, unknown>, override: Partial<MessageEventInit> = {}) => fireEvent(window,
      new MessageEvent("message", { source: frame.contentWindow, origin: "null", data: { type: "bing-iab-find-result", channel, ...data }, ...override }));
    fireEvent.load(frame);
    emit({ ...first, total: 3 });
    expect(onFindResult).toHaveBeenLastCalledWith({ ...first, total: 3 });
    onFindResult.mockClear();
    const latest = { query: "result", index: 1, requestId: 2 };
    rerender(<LiveBingResults query="Weather" findRequest={latest} onFindResult={onFindResult} />);
    emit({ ...first, total: 3 });
    emit({ ...latest, total: 3 }, { source: window });
    emit({ ...latest, total: 3 }, { origin: window.location.origin });
    emit({ ...latest, total: 3, channel: "previous-document" });
    emit({ ...latest, total: -1 });
    emit({ ...latest, total: 3.5 });
    emit({ ...latest, total: 3, index: 3 });
    emit({ ...latest, total: 0, index: 0 });
    emit({ ...latest, total: 3, query: "old query" });
    expect(onFindResult).not.toHaveBeenCalled();
    emit({ ...latest, total: 3 });
    expect(onFindResult).toHaveBeenCalledOnce();
    rerender(<LiveBingResults query="Weather" active={false} findRequest={latest} onFindResult={onFindResult} />);
    emit({ ...latest, total: 3 });
    expect(onFindResult).toHaveBeenCalledOnce();
  });

  it("uses a fresh document channel on reload and never applies an old document's results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response("Weather")).mockResolvedValueOnce(response("News")));
    const onFindResult = vi.fn();
    const findRequest = { query: "result", index: 0, requestId: 1 };
    const { rerender } = render(<LiveBingResults query="Weather" findRequest={findRequest} onFindResult={onFindResult} />);
    const previous = await screen.findByTitle("Bing results for Weather") as HTMLIFrameElement;
    fireEvent.load(previous);
    const oldChannel = previous.srcdoc.match(/nonce="([^"]+)"/)![1];
    rerender(<LiveBingResults query="News" findRequest={findRequest} onFindResult={onFindResult} />);
    const current = await screen.findByTitle("Bing results for News") as HTMLIFrameElement;
    fireEvent.load(current);
    const channel = current.srcdoc.match(/nonce="([^"]+)"/)![1];
    expect(channel).not.toBe(oldChannel);
    fireEvent(window, new MessageEvent("message", { source: current.contentWindow, origin: "null",
      data: { type: "bing-iab-find-result", channel: oldChannel, ...findRequest, total: 1 } }));
    expect(onFindResult).not.toHaveBeenCalled();
    fireEvent(window, new MessageEvent("message", { source: current.contentWindow, origin: "null",
      data: { type: "bing-iab-find-result", channel, ...findRequest, total: 1 } }));
    expect(onFindResult).toHaveBeenCalledWith({ ...findRequest, total: 1 });
  });
});
