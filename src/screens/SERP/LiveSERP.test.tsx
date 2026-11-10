import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveSERP } from "./LiveSERP";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const response = (query: string) => ({ ok: true, json: async () => ({ query, html: `<p>${query} result</p>`, fetchedAt: "2026-10-22T06:00:00Z" }) });

describe("IAB loading feedback", () => {
  it("shows progress in the search box through the request and document load, then completes", async () => {
    let resolve!: (value: ReturnType<typeof response>) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(done => { resolve = done; })));
    const { container } = render(<LiveSERP query="Weather" />);
    // JSDOM loads its blank iframe immediately; hold that event to simulate
    // a document whose subresources have not finished loading yet.
    const holdFrameLoad = (event: Event) => event.stopPropagation();
    container.addEventListener("load", holdFrameLoad, true);
    const searchBox = screen.getByRole("group", { name: "Search results search box" });
    expect(within(searchBox).getByRole("progressbar", { name: "Loading search results" })).toBeInTheDocument();
    expect(screen.queryByText("Searching Bing…")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Bing results" })).toHaveAttribute("aria-busy", "true");
    await act(async () => resolve(response("Weather")));
    const frame = screen.getByTitle("Bing results for Weather");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    container.removeEventListener("load", holdFrameLoad, true);
    fireEvent.load(frame);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Bing results" })).toHaveAttribute("aria-busy", "false");
  });

  it("removes progress on error and restarts it on retry without changing the query", async () => {
    let resolveRetry!: (value: ReturnType<typeof response>) => void;
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce(() => new Promise(done => { resolveRetry = done; })));
    render(<LiveSERP query="Weather" />);
    await screen.findByRole("alert");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText("Weather")).toBeInTheDocument();
    await act(async () => resolveRetry(response("Weather")));
    fireEvent.load(screen.getByTitle("Bing results for Weather"));
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("resets for a new query and ignores the obsolete navigation", async () => {
    let resolveOld!: (value: ReturnType<typeof response>) => void;
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise(done => { resolveOld = done; }))
      .mockImplementationOnce(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetcher);
    const { rerender, unmount } = render(<LiveSERP query="Weather" />);
    const signal = fetcher.mock.calls[0][1].signal as AbortSignal;
    rerender(<LiveSERP query="News" />);
    expect(signal.aborted).toBe(true);
    await act(async () => resolveOld(response("Weather")));
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByTitle("Bing results for Weather")).not.toBeInTheDocument();
    expect(screen.getByText("News")).toBeInTheDocument();
    unmount();
    expect((fetcher.mock.calls[1][1].signal as AbortSignal).aborted).toBe(true);
  });

  it("stops loading when the request times out", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetcher);
    render(<LiveSERP query="Weather" />);
    await act(async () => vi.advanceTimersByTime(22_000));
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t load results");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
