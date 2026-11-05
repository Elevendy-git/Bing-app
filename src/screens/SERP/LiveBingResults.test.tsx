import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveBingResults } from "./LiveBingResults";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const response = (query: string) => ({ ok: true, json: async () => ({ query, html: `<p>${query} result</p>`, fetchedAt: "2026-10-15T06:00:00Z" }) });

describe("Live Bing result viewport", () => {
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
