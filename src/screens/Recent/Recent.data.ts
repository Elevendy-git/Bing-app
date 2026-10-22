import type { CSSProperties } from "react";

export interface RecentTab {
  id: string;
  title: string;
  previewSrc?: string | null;
  faviconSrc?: string | null;
  previewStyle?: CSSProperties;
  gridPreviewStyle?: CSSProperties;
}

/** Original image fills from C2 641:10440. The first uses TabsCard's shared asset. */
export const RECENT_TABS: readonly RecentTab[] = [
  { id: "spring", title: "Open ai" },
  { id: "gallery", title: "Open ai", previewSrc: new URL("./assets/open-ai-gallery.png", import.meta.url).href,
    previewStyle: { top: "-18.51%", left: "-5.35%", width: "106.6%", height: "139.76%", objectFit: "fill" } },
  { id: "chat", title: "Open ai", previewSrc: new URL("./assets/open-ai-chat.jpg", import.meta.url).href,
    previewStyle: { top: "-10.81%", left: 0, width: "100%", height: "523.23%", objectFit: "fill" } },
];

export interface RecentEntry {
  id: string;
  title: string;
  subtitle: string;
  logoSrc?: string;
  /** Preserve a supplied SVG's native dimensions inside the 32 px logo slot. */
  nativeLogo?: boolean;
}

export const RECENT_SITES: readonly RecentEntry[] = [
  { id: "medium", title: "Medium", subtitle: "https://medium.com/" },
  { id: "robinhood", title: "Robinhood", subtitle: "https://robinhood.com/",
    logoSrc: new URL("./assets/robinhood.png", import.meta.url).href },
  { id: "spotify", title: "Spotify", subtitle: "https://open.spotify.com/",
    logoSrc: new URL("./assets/spotify-32.svg", import.meta.url).href, nativeLogo: true },
];

export const RECENT_CONVERSATIONS: readonly RecentEntry[] = [
  { id: "project", title: "Create a project plan for the new app", subtitle: "Tuesday, Feb 10" },
  { id: "email", title: "Draft an email to the team about Q3 goals", subtitle: "Tuesday, Feb 10" },
  { id: "meeting", title: "Summarize the key points from the meeting", subtitle: "Tuesday, Feb 10" },
];

export const RECENT_BOOKMARKS = RECENT_SITES.map(entry => entry.id === "robinhood"
  ? { ...entry, subtitle: "https://robinhood.com/us/en/" }
  : entry);
