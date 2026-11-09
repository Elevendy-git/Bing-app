import type { BookmarkEntry, BookmarkSite, RecentEntry } from "./types";

/** Project actual saved sites, in collection order, without joining demo records. */
export function recentBookmarkPreview(entries: readonly BookmarkEntry[]): readonly BookmarkSite[] {
  return entries.filter((entry): entry is BookmarkSite => entry.kind === "site").slice(0, 3);
}

/** Search includes saved sites beyond the preview and inside supplied folders. */
export function bookmarkSearchEntries(entries: readonly BookmarkEntry[]): readonly RecentEntry[] {
  return entries.flatMap(entry => entry.kind === "site" ? [entry] : bookmarkSearchEntries(entry.children ?? []));
}

/** IDs identify individual saved entries, including duplicate URLs in different folders. */
export function deleteBookmark(entries: readonly BookmarkEntry[], id: string): readonly BookmarkEntry[] {
  let changed = false;
  const next = entries.flatMap(entry => {
    if (entry.kind === "site" && entry.id === id) { changed = true; return []; }
    if (entry.kind === "folder" && entry.children) {
      const children = deleteBookmark(entry.children, id);
      if (children !== entry.children) {
        changed = true;
        return [{ ...entry, children, favoriteCount: Math.max(0, entry.favoriteCount - 1) }];
      }
    }
    return [entry];
  });
  return changed ? next : entries;
}
