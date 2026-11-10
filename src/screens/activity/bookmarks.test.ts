import { describe, expect, it } from "vitest";
import { bookmarkUrl, findBookmark, toggleUrlBookmark } from "./bookmarks";
import type { BookmarkEntry, BookmarkSite } from "./types";

const saved = (id: string, subtitle = "https://example.com/article?story=1"): BookmarkSite => ({ kind: "site", id, title: id, subtitle });

describe("URL bookmark identity and toggle", () => {
  it("normalizes HTTP(S) identity and fragments while preserving meaningful paths and queries", () => {
    expect(bookmarkUrl("https://EXAMPLE.com:443/article?story=1#part-two")).toBe("https://example.com/article?story=1");
    expect(bookmarkUrl("http://EXAMPLE.com:80")).toBe("http://example.com/");
    expect(bookmarkUrl("https://example.com/Article?story=2&lang=en#details")).toBe("https://example.com/Article?story=2&lang=en");
    for (const value of ["javascript:alert(1)", "file:///tmp/page", "https://user:pass@example.com/", "example.com", ""]) expect(bookmarkUrl(value)).toBeNull();
    expect(findBookmark([saved("first")], "https://example.com/article?story=1#new")).toHaveProperty("id", "first");
    expect(findBookmark([saved("first")], "https://example.com/article?story=2")).toBeUndefined();
    expect(findBookmark([saved("first")], "http://example.com/article?story=1")).toBeUndefined();
  });

  it("saves the actual site's metadata and uses its hostname and a generic icon only when metadata is missing", () => {
    const previous = saved("previous", "https://other.example/");
    const result = toggleUrlBookmark([previous], { sourceUrl: "https://EXAMPLE.com/article?story=1#read",
      title: "  Published article title  ", faviconUrl: "https://example.com/favicon.ico" }, "bookmark-1");
    expect(result.bookmarked).toBe(true);
    expect(result.entries[0]).toEqual({ kind: "site", id: "bookmark-1", title: "Published article title",
      subtitle: "https://example.com/article?story=1", logoSrc: "https://example.com/favicon.ico", genericIcon: false });
    expect(result.entries[1]).toBe(previous);
    const fallback = toggleUrlBookmark([], { sourceUrl: "https://www.publisher.example/story", title: " ", faviconUrl: "javascript:alert(1)" }, "bookmark-2");
    expect(fallback.entries[0]).toMatchObject({ title: "www.publisher.example", genericIcon: true, logoSrc: undefined });
  });

  it("recognizes nested and duplicate URLs, removes every matching star, and updates each affected folder count", () => {
    const untouched = saved("different", "https://other.example/article");
    const entries: readonly BookmarkEntry[] = [saved("root"), { kind: "folder", id: "outer", title: "Outer", favoriteCount: 3, children: [
      saved("nested", "https://EXAMPLE.com:443/article?story=1#section"),
      { kind: "folder", id: "inner", title: "Inner", favoriteCount: 1, children: [saved("deep")] }, untouched,
    ] }];
    expect(findBookmark(entries.slice(1), "https://example.com/article?story=1#read")).toHaveProperty("id", "nested");
    const next = toggleUrlBookmark(entries, { sourceUrl: "https://example.com/article?story=1#read" }, "unused");
    expect(next.bookmarked).toBe(false);
    expect(findBookmark(next.entries, "https://example.com/article?story=1")).toBeUndefined();
    expect(next.entries).toEqual([{ kind: "folder", id: "outer", title: "Outer", favoriteCount: 1, children: [
      { kind: "folder", id: "inner", title: "Inner", favoriteCount: 0, children: [] }, untouched,
    ] }]);
  });

  it("toggles fragment variants instead of creating duplicate bookmarks, while different queries remain separate", () => {
    const first = toggleUrlBookmark([], { sourceUrl: "https://example.com/article?story=1#top" }, "first");
    const second = toggleUrlBookmark(first.entries, { sourceUrl: "https://example.com/article?story=2" }, "second");
    expect(second.entries).toHaveLength(2);
    const removed = toggleUrlBookmark(second.entries, { sourceUrl: "https://example.com/article?story=1#bottom" }, "unused");
    expect(removed.bookmarked).toBe(false);
    expect(removed.entries).toEqual([second.entries[0]]);
  });

  it("leaves the collection untouched for invalid document URLs", () => {
    const entries = [saved("existing")];
    expect(toggleUrlBookmark(entries, { sourceUrl: "javascript:alert(1)" }, "unused")).toEqual({ entries, bookmarked: false });
    expect(toggleUrlBookmark(entries, { sourceUrl: "" }, "unused").entries).toBe(entries);
  });
});
