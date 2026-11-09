import { RECENT_BOOKMARKS } from "../Recent/Recent.data";
import type { BookmarkEntry, BookmarkSite } from "../activity/types";
export type { BookmarkEntry, BookmarkFolder, BookmarkSite } from "../activity/types";
export { recentBookmarkPreview, bookmarkSearchEntries, deleteBookmark } from "../activity/bookmarks";

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
