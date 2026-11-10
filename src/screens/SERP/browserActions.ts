import { webUrl } from "../../services/webNavigation";

export const BING_SEARCH_SETTINGS_URL = "https://www.bing.com/account/general";
export const BING_FEEDBACK_URL = "https://www.bing.com/feedback/windows";

export function openBrowserLink(value: string) {
  const url = webUrl(value);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

export async function copyBrowserLink(value: string) {
  const url = webUrl(value);
  if (!url || !navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
  await navigator.clipboard.writeText(url);
}

/** Native sharing where supported; a copy fallback never claims a message was sent. */
export async function shareBrowserLink(value: string, title?: string): Promise<"shared" | "copied"> {
  const url = webUrl(value);
  if (!url) throw new Error("Invalid URL");
  if (navigator.share) { await navigator.share({ url, ...(title ? { title } : {}) }); return "shared"; }
  await copyBrowserLink(url);
  return "copied";
}
