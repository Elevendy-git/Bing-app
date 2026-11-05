import { RECENT_TABS, type RecentTab } from "../Recent/Recent.data";

/** Original Shareout 1:20742 image fills. Thumbnails are design fixtures. */
const sports = {
  title: "Open ai", query: "Open ai", previewSrc: new URL("./assets/sports.png", import.meta.url).href,
  previewStyle: { top: "-6.25%", left: 0, width: "100%", height: "196.14%", objectFit: "fill" },
} as const;
const results = {
  title: "Open ai", query: "Open ai", previewSrc: new URL("./assets/results.png", import.meta.url).href,
  previewStyle: { top: "-9%", left: 0, width: "100%", height: "390.92%", objectFit: "fill" },
} as const;

export const OPEN_TABS: readonly RecentTab[] = [
  { ...sports, id: "sports" },
  { ...results, id: "results" },
  { id: "biography", title: "Open ai", query: "Open ai", previewSrc: new URL("./assets/biography.png", import.meta.url).href,
    previewStyle: { top: "-39.98%", left: 0, width: "100%", height: "173.14%", objectFit: "fill" } },
  { ...RECENT_TABS[2], gridPreviewStyle: { top: "-11.3%", left: 0, width: "100%", height: "523.23%", objectFit: "fill" } },
  RECENT_TABS[0],
  { ...RECENT_TABS[1], gridPreviewStyle: { top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" } },
  { ...sports, id: "sports-2" },
  { ...results, id: "results-2" },
];

/** Keep the source Recent strip's ordering while sharing the same tab identities. */
export function recentTabPreview(tabs: readonly RecentTab[]) {
  const preferred = RECENT_TABS.map(tab => tabs.find(item => item.id === tab.id)).filter((tab): tab is RecentTab => Boolean(tab));
  return [...preferred, ...tabs.filter(tab => !preferred.some(item => item.id === tab.id))].slice(0, 3);
}
