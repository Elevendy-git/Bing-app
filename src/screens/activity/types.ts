import type { CSSProperties } from "react";
import type { BingPageSnapshot } from "../../services/bingPage";

export interface SearchHistoryItem { id: string; query: string }

export interface RecentTab {
  id: string;
  title: string;
  /** Navigation identity, separate from the display title and thumbnail. */
  query?: string;
  previewSrc?: string | null;
  pageSnapshot?: BingPageSnapshot;
  faviconSrc?: string | null;
  previewStyle?: CSSProperties;
  gridPreviewStyle?: CSSProperties;
}

export interface RecentEntry {
  id: string;
  title: string;
  subtitle: string;
  logoSrc?: string;
  /** Preserve a supplied SVG's native dimensions inside the 32 px logo slot. */
  nativeLogo?: boolean;
}

export interface HistoryEntry extends RecentEntry {
  groupId: string;
  groupLabel: string;
  /** Real Prototype visits are regrouped by their local date when History is rendered. */
  visitedAt?: number;
}

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

export interface ResultSession {
  id: string;
  query: string;
  privateMode: boolean;
  tabId: string | null;
  historyId: string | null;
  initialUrl?: string;
}
