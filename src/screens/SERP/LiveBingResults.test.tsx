import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveBingResults } from "./LiveBingResults";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const response = (query: string) => ({ ok: true, json: async () => ({ query, html: `<p>${query} result</p>`, fetchedAt: "2026-10-15T06:00:00Z" }) });

describe("Live Bing result viewport", () => {
  it("loads both results and web destinations from the configured public backend", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://bing-backend.onrender.com/");
    vi.stubEnv("BASE_URL", "/Bing-app/");
    const destination = "https://example.com/article?topic=weather&lang=en";
    const fetcher = vi.fn().mockResolvedValueOnce(response("Weather & news")).mockResolvedValueOnce({ ok: true, json: async () => ({
      requestedUrl: destination, sourceUrl: destination, html: "<p>Article</p>", fetchedAt: "2026-11-01T10:00:00Z",
    }) });
    vi.stubGlobal("fetch", fetcher);
    const { rerender } = render(<LiveBingResults query="Weather & news" />);
    await screen.findByTitle("Bing results for Weather & news");
    rerender(<LiveBingResults query="Weather & news" url={destination} />);
    await screen.findByTitle(`Web page: ${destination}`);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
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
});
