import { RECENT_BOOKMARKS, type RecentEntry } from "../Recent/Recent.data";

export interface BookmarkSite extends RecentEntry {
  kind: "site";
  genericIcon?: boolean;
}
export interface BookmarkFolder {
  kind: "folder";
  id: string;
  title: string;
  favoriteCount: number;
  /** Only folders whose contents were supplied have a destination. */
  children?: readonly BookmarkEntry[];
}
export type BookmarkEntry = BookmarkSite | BookmarkFolder;

const spotify = RECENT_BOOKMARKS.find(entry => entry.id === "spotify")!;
const robinhood: BookmarkSite = { kind: "site", id: "robinhood", title: "Robinhood", subtitle: "https://robinhood.com/", genericIcon: true };
const newYorker: BookmarkSite = { kind: "site", id: "new-yorker", title: "The New Yorker", subtitle: "https://thenewyorker.com/",
  logoSrc: new URL("./assets/new-yorker.png", import.meta.url).href };
const genspark: BookmarkSite = { kind: "site", id: "genspark", title: "Genspark", subtitle: "https://www.genspark.ai/", genericIcon: true };

/** Preserve the supplied demo rows and folder-count copy from the five frames. */
export const BOOKMARK_ENTRIES: readonly BookmarkEntry[] = [
  { kind: "folder", id: "travel", title: "Travel to Paris", favoriteCount: 4, children: [
    { kind: "folder", id: "travel-article", title: "Article", favoriteCount: 3 },
    { ...robinhood, id: "travel-robinhood" },
    { ...spotify, kind: "site", id: "travel-spotify" },
    { ...robinhood, id: "travel-robinhood-2" },
    { ...newYorker, id: "travel-new-yorker" },
    { ...genspark, id: "travel-genspark" },
  ] },
  { kind: "folder", id: "article", title: "Article", favoriteCount: 3 },
  robinhood,
  { ...spotify, kind: "site" },
  { kind: "folder", id: "movies", title: "Best movies", favoriteCount: 12 },
  { kind: "site", id: "medium", title: "Medium", subtitle: "https://medium.com/" },
  { ...robinhood, id: "robinhood-2" },
  newYorker,
  genspark,
  { kind: "site", id: "wise", title: "International Money Transfer | Send money", subtitle: "wise.com/gb/send-money", genericIcon: true },
];

/** Recent keeps the supplied preview order and brand artwork. */
export function recentBookmarkPreview(entries: readonly BookmarkEntry[]): readonly RecentEntry[] {
  return RECENT_BOOKMARKS.filter(preview => entries.some(entry => entry.kind === "site" && entry.id === preview.id));
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
