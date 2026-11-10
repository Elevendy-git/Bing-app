import type { BookmarkEntry, BookmarkSite, RecentEntry } from "./types";
import { webUrl } from "../../services/webNavigation";

export interface BookmarkPageMetadata {
  sourceUrl: string;
  title?: string;
  faviconUrl?: string | null;
}

/** A fragment selects a position in the same document; its path and query retain identity. */
export function bookmarkUrl(value: string): string | null {
  const valid = webUrl(value);
  if (!valid) return null;
  const url = new URL(valid);
  url.hash = "";
  return url.href;
}

export function findBookmark(entries: readonly BookmarkEntry[], value: string): BookmarkSite | undefined {
  const url = bookmarkUrl(value);
  if (!url) return;
  for (const entry of entries) {
    if (entry.kind === "site" && bookmarkUrl(entry.subtitle) === url) return entry;
    if (entry.kind === "folder") {
      const nested = findBookmark(entry.children ?? [], url);
      if (nested) return nested;
    }
  }
}

/** Toggle the document's star across the collection, including sites saved inside folders. */
export function toggleUrlBookmark(entries: readonly BookmarkEntry[], page: BookmarkPageMetadata, id: string) {
  const url = bookmarkUrl(page.sourceUrl);
  if (!url) return { entries, bookmarked: false };
  const matches = bookmarkSearchEntries(entries).filter(entry => bookmarkUrl(entry.subtitle) === url);
  if (matches.length) {
    return { entries: matches.reduce((remaining, entry) => deleteBookmark(remaining, entry.id), entries), bookmarked: false };
  }
  const logoSrc = webUrl(page.faviconUrl ?? "") ?? undefined;
  const site: BookmarkSite = {
    kind: "site", id, subtitle: url,
    title: page.title?.trim().slice(0, 240) || new URL(url).hostname,
    logoSrc, genericIcon: !logoSrc,
  };
  return { entries: [site, ...entries], bookmarked: true };
}

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
