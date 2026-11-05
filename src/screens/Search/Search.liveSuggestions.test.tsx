import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSearchSuggestions, markSearchHistorySuggestions, parseBingSuggestions, type SearchSuggestion } from "../../services/searchSuggestions";
import { useSearchSuggestions } from "./useSearchSuggestions";

const response = (query: string, items: unknown[]) => ({ ok: true, json: async () => [query, items] }) as Response;
const advance = async (ms = 80) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response("weather", ["weather today"])));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("Live suggestion data", () => {
  it("annotates only received exact history matches, preserving order, artwork and the five-item limit", () => {
    const items: SearchSuggestion[] = [
      { query: "Weather tomorrow", source: "prediction" },
      { query: "weather TODAY", source: "prediction", logoUrl: "https://example.com/weather.png" },
      { query: "Weather", source: "prediction" },
      { query: "Weather radar", source: "prediction" },
      { query: "Weather forecast", source: "prediction" },
      { query: "Weather channel", source: "prediction" },
    ];
    const history = [" WEATHER  today ", "Weather channel", "Unreturned history"];
    const marked = markSearchHistorySuggestions(items, history);
    expect(marked.map(item => item.query)).toEqual(items.slice(0, 5).map(item => item.query));
    expect(marked.map(item => item.source)).toEqual(["prediction", "history", "prediction", "prediction", "prediction"]);
    expect(marked[1].logoUrl).toBe(items[1].logoUrl);
    expect(items.every(item => item.source === "prediction")).toBe(true);
    expect(markSearchHistorySuggestions(marked, history, true).every(item => item.source === "prediction")).toBe(true);
    expect(markSearchHistorySuggestions([], history)).toEqual([]);
  });

  it("validates, normalizes and deduplicates Bing results, limiting to five without inventing metadata", () => {
    expect(parseBingSuggestions(["We", [null, {}, "", " Weather  forecast ", "WEATHER forecast", "weather", "weather today", "weather tomorrow", "weather radar", "weather hk"]]))
      .toEqual(["Weather forecast", "weather", "weather today", "weather tomorrow", "weather radar"].map((query) => ({ query, source: "prediction" })));
    expect(parseBingSuggestions(["unusual query", []])).toEqual([]);
    expect(() => parseBingSuggestions({ error: "unavailable" })).toThrow();
    expect(() => parseBingSuggestions(["weather", "invalid"])).toThrow();
  });

  it("encodes the current query and omits browser credentials and caching", async () => {
    const signal = new AbortController().signal;
    await fetchSearchSuggestions(" C++ & 天气 ", signal);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(new URL(String(url), "http://localhost").searchParams.get("query")).toBe("C++ & 天气");
    expect(options).toMatchObject({ signal, credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" });
  });

  it("debounces typing without introducing an entered-query placeholder", async () => {
    const { result, rerender } = renderHook(({ query }) => useSearchSuggestions(query, true), { initialProps: { query: "W" } });
    await advance(30);
    rerender({ query: "We" });
    await advance(30);
    rerender({ query: "Weather" });
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([]);
    await advance();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.source).toBe("live");
    expect(result.current.items.map((item) => item.query)).toEqual(["weather today"]);
  });

  it("aborts superseded queries and ignores stale replies even when transport ignores abort", async () => {
    let resolveOld!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const { result, rerender } = renderHook(({ query }) => useSearchSuggestions(query, true), { initialProps: { query: "old" } });
    await advance();
    const oldSignal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    vi.mocked(fetch).mockResolvedValueOnce(response("new", ["new result"]) as Response);
    rerender({ query: "new" });
    expect(oldSignal?.aborted).toBe(true);
    await advance();
    await act(async () => { resolveOld(response("old", ["old result"])); });
    expect(result.current.items.map((item) => item.query)).toEqual(["new result"]);
  });

  it("retains the complete list during an edit instead of shrinking to matching rows", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response("we", ["weather", "weather today", "weather tomorrow", "weather radar", "weather map"]));
    const { result, rerender } = renderHook(({ query }) => useSearchSuggestions(query, true), { initialProps: { query: "we" } });
    await advance();
    rerender({ query: "weather t" });
    expect(result.current.source).toBe("loading");
    expect(result.current.items).toHaveLength(5);
    rerender({ query: "football" });
    expect(result.current.items).toEqual([]);
  });

  it("reuses recent successful queries immediately, including after clearing or backspacing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response("12", ["123", "1234", "120", "125", "129"]));
    const { result, rerender } = renderHook(({ query }) => useSearchSuggestions(query, true), { initialProps: { query: "12" } });
    await advance();
    const original = result.current.items;
    rerender({ query: "123" });
    expect(result.current.items).toEqual(original);
    rerender({ query: "12" });
    expect(result.current).toMatchObject({ source: "live", items: original });
    rerender({ query: "" });
    expect(result.current.items).toEqual([]);
    rerender({ query: "12" });
    expect(result.current).toMatchObject({ source: "live", items: original });
    await advance();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("expires cached results and does not share queries across Search mounts", async () => {
    const { rerender, unmount } = renderHook(({ query }) => useSearchSuggestions(query, true), { initialProps: { query: "weather" } });
    await advance();
    rerender({ query: "" });
    await advance(60_001);
    rerender({ query: "weather" });
    await advance();
    expect(fetch).toHaveBeenCalledTimes(2);
    unmount();
    const { result } = renderHook(() => useSearchSuggestions("weather", true));
    expect(result.current.items).toEqual([]);
    await advance();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("clears results immediately and cancels work on empty input, exit and unmount", async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    const { result, rerender, unmount } = renderHook(({ query, active }) => useSearchSuggestions(query, true, active), {
      initialProps: { query: "weather", active: true },
    });
    await advance();
    const firstSignal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    rerender({ query: "   ", active: true });
    expect(result.current.items).toEqual([]);
    expect(firstSignal?.aborted).toBe(true);
    await advance();
    expect(fetch).toHaveBeenCalledTimes(1);
    rerender({ query: "weather", active: true });
    await advance();
    const exitSignal = vi.mocked(fetch).mock.calls[1][1]?.signal;
    rerender({ query: "weather", active: false });
    expect(exitSignal?.aborted).toBe(true);
    rerender({ query: "weather", active: true });
    await advance();
    const finalSignal = vi.mocked(fetch).mock.calls[2][1]?.signal;
    unmount();
    expect(finalSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["network", "http", "invalid"])("does not invent an AS row after %s failure and recovers", async (failure) => {
    if (failure === "network") vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    if (failure === "http") vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    if (failure === "invalid") vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ error: "invalid" }) } as Response);
    const { result, rerender } = renderHook(({ query }) => useSearchSuggestions(query, true), { initialProps: { query: "Weather" } });
    await advance();
    expect(result.current.source).toBe("fallback");
    expect(result.current.items).toEqual([]);
    rerender({ query: "weather today" });
    await advance();
    expect(result.current.source).toBe("live");
  });

  it("times out a stalled request without accepting its late response", async () => {
    let resolveRequest!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { resolveRequest = resolve; }));
    const { result } = renderHook(() => useSearchSuggestions("weather", true));
    await advance();
    await advance(5000);
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(result.current.source).toBe("fallback");
    await act(async () => { resolveRequest(response("weather", ["late result"])); });
    expect(result.current.source).toBe("fallback");
  });

  it("preserves empty live results without filling them with fabricated suggestions", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response("unusual query", []) as Response);
    const { result } = renderHook(() => useSearchSuggestions("unusual query", true));
    await advance();
    expect(result.current).toMatchObject({ source: "live", items: [] });
  });

  it("keeps Figma fixtures in passive Key screens without any network request", async () => {
    const { result } = renderHook(() => useSearchSuggestions("Weather", false));
    await advance(6000);
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.source).toBe("preview");
    expect(result.current.items).toHaveLength(5);
    expect(result.current.items.filter(({ source }) => source === "history")).toHaveLength(2);
    expect(result.current.items.filter(({ logoUrl }) => logoUrl)).toHaveLength(2);
  });
});
