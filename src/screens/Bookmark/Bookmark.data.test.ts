import { describe, expect, it } from "vitest";
import { bookmarkSearchEntries, deleteBookmark, recentBookmarkPreview, type BookmarkEntry, type BookmarkSite } from "./Bookmark.data";

const saved = (id: string): BookmarkSite => ({ kind: "site", id, title: `Saved ${id}`, subtitle: `https://${id}.example/`, logoSrc: `https://${id}.example/icon.png` });

describe("Bookmark summary uses the saved collection", () => {
  it("keeps current metadata for existing and previously unseen IDs without substituting demo content", () => {
    const medium = { ...saved("medium"), title: "Updated title" };
    const newSite = saved("new-site");
    expect(recentBookmarkPreview([medium, newSite])).toEqual([medium, newSite]);
    expect(recentBookmarkPreview([medium])[0]).toBe(medium);
  });

  it("previews three root sites in collection order and searches all supplied folders", () => {
    const sites = [saved("first"), saved("second"), saved("third"), saved("fourth")];
    const nested = saved("nested");
    const entries: readonly BookmarkEntry[] = [{ kind: "folder", id: "folder", title: "Folder", favoriteCount: 1, children: [nested] }, ...sites];
    expect(recentBookmarkPreview(entries)).toEqual(sites.slice(0, 3));
    expect(bookmarkSearchEntries(entries)).toEqual([nested, ...sites]);
    const remaining = deleteBookmark(entries, "second");
    expect(recentBookmarkPreview(remaining)).toEqual([sites[0], sites[2], sites[3]]);
    expect(bookmarkSearchEntries(remaining)).not.toContain(sites[1]);
    expect(recentBookmarkPreview([])).toEqual([]);
  });
});
