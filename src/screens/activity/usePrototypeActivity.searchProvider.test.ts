import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePrototypeActivity } from "./usePrototypeActivity";

afterEach(cleanup);
describe("search-provider activity", () => {
  it("reopens fallback search URLs as queries and removes their last visit with search history", () => {
    const { result } = renderHook(() => usePrototypeActivity("empty"));
    let visit: ReturnType<typeof result.current.createResultSession>;
    act(() => { visit = result.current.createResultSession("https://duckduckgo.com/?q=baidu&kl=us-en", { privateMode: false }); });
    expect(visit).toMatchObject({ query: "baidu", initialUrl: undefined });
    act(() => { result.current.saveResultPage(visit!, { html: "<p>Results from DuckDuckGo</p>", sourceUrl: "https://duckduckgo.com/?q=baidu&kl=us-en",
      faviconUrl: null, fetchedAt: "2026-11-12T10:00:00Z", viewportWidth: 402, viewportHeight: 668, searchProvider: "duckduckgo" }); });
    expect(result.current.browsingHistory[0].subtitle).toBe("https://duckduckgo.com/?q=baidu&kl=us-en");
    expect(result.current.searchHistory[0].query).toBe("baidu");
    act(() => { result.current.deleteHistoryEntry(visit!.historyId!); });
    expect(result.current.searchHistory).toEqual([]);
    expect(result.current.browsingHistory).toEqual([]);
  });
});
