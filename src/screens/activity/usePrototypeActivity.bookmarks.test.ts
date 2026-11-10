import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePrototypeActivity } from "./usePrototypeActivity";
import { findBookmark } from "./bookmarks";

afterEach(cleanup);
const page = { sourceUrl: "https://publisher.example/article?story=1#details", title: "Real article title", faviconUrl: "https://publisher.example/favicon.ico" };

describe("prototype webpage bookmarks", () => {
  it("saves and removes an actual webpage without adding search history, visits or tabs", () => {
    const { result } = renderHook(() => usePrototypeActivity("empty"));
    act(() => { expect(result.current.toggleBookmark(page)).toBe(true); });
    expect(result.current.isBookmarked("https://publisher.example/article?story=1#other")).toBe(true);
    expect(result.current.bookmarks).toMatchObject([{ id: "bookmark-1", title: page.title,
      subtitle: "https://publisher.example/article?story=1", logoSrc: page.faviconUrl }]);
    expect(result.current.searchHistory).toEqual([]);
    expect(result.current.browsingHistory).toEqual([]);
    expect(result.current.tabs).toEqual([]);
    act(() => { expect(result.current.toggleBookmark({ ...page, sourceUrl: "https://publisher.example/article?story=1#other" })).toBe(false); });
    expect(result.current.bookmarks).toEqual([]);
    expect(result.current.isBookmarked(page.sourceUrl)).toBe(false);
  });

  it("recognizes existing nested bookmarks and clears all URL copies with their folder counts", () => {
    const { result } = renderHook(() => usePrototypeActivity());
    const url = "https://robinhood.com/#read";
    const before = result.current.bookmarks;
    expect(result.current.isBookmarked(url)).toBe(true);
    act(() => { expect(result.current.toggleBookmark({ sourceUrl: url })).toBe(false); });
    expect(result.current.isBookmarked(url)).toBe(false);
    expect(findBookmark(result.current.bookmarks, url)).toBeUndefined();
    expect(result.current.bookmarks.find(entry => entry.id === "travel")).toMatchObject({ favoriteCount: 2 });
    expect(before.find(entry => entry.id === "travel")).toMatchObject({ favoriteCount: 4 });
  });

  it("uses the shared activity sequence for stable unique IDs and starts empty on remount", () => {
    const mounted = renderHook(() => usePrototypeActivity("empty"));
    act(() => { mounted.result.current.createResultSession("weather", { privateMode: false }); });
    act(() => { mounted.result.current.toggleBookmark(page); });
    expect(mounted.result.current.bookmarks[0].id).toBe("bookmark-2");
    act(() => { mounted.result.current.deleteBookmarkEntry("bookmark-2"); });
    expect(mounted.result.current.isBookmarked(page.sourceUrl)).toBe(false);
    act(() => { mounted.result.current.toggleBookmark(page); });
    expect(mounted.result.current.bookmarks[0].id).toBe("bookmark-3");
    mounted.unmount();
    const reset = renderHook(() => usePrototypeActivity("empty"));
    expect(reset.result.current.bookmarks).toEqual([]);
    expect(reset.result.current.isBookmarked(page.sourceUrl)).toBe(false);
  });

  it("never adds or removes normal bookmarks in private mode, and rejects invalid destinations", () => {
    const { result } = renderHook(() => usePrototypeActivity("empty"));
    act(() => { expect(result.current.toggleBookmark(page, true)).toBe(false); });
    act(() => { expect(result.current.toggleBookmark({ sourceUrl: "javascript:alert(1)" })).toBe(false); });
    expect(result.current.bookmarks).toEqual([]);
    act(() => { expect(result.current.toggleBookmark(page)).toBe(true); });
    expect(result.current.bookmarks[0].id).toBe("bookmark-1");
    const saved = result.current.bookmarks;
    act(() => { expect(result.current.toggleBookmark(page, true)).toBe(true); });
    expect(result.current.bookmarks).toBe(saved);
    expect(result.current.isBookmarked(page.sourceUrl)).toBe(true);
  });
});
