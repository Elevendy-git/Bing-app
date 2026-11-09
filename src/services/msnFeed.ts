import { publicApiUrl } from "./apiUrl";

export const MSN_FEED_PATH = "/api/msn-feed";
export const MSN_FEED_LIMIT = 12;
// MSN may return more stories than newsTop; keep the page before following its cursor.
export const MSN_FEED_PAGE_LIMIT = 100;

export interface MsnArticle {
  id: string;
  title: string;
  url: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition?: string;
  publisher: string;
  publisherLogoSrc: string | null;
  publishedAt: string;
}

export interface MsnFeed {
  source: "msn";
  market: "en-us";
  fetchedAt: string;
  items: MsnArticle[];
  nextCursor: string | null;
}

export function newsElapsedTime(publishedAt: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(publishedAt)) / 60_000));
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
  return new Date(publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function fetchMsnFeed(signal: AbortSignal, cursor?: string): Promise<MsnFeed> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const response = await fetch(publicApiUrl(`${MSN_FEED_PATH}${query}`), {
    signal, credentials: "omit", referrerPolicy: "no-referrer", headers: { Accept: "application/json" },
  });
  // A long-idle preview may outlive the server's cursor cache. Resume with a new
  // public feed and let the caller deduplicate it against already visible stories.
  if (response.status === 410 && cursor) return fetchMsnFeed(signal);
  if (!response.ok) throw new Error("MSN news is unavailable");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("source" in data) || data.source !== "msn"
    || !("market" in data) || data.market !== "en-us" || !("fetchedAt" in data)
    || typeof data.fetchedAt !== "string" || !Number.isFinite(Date.parse(data.fetchedAt))
    || !("nextCursor" in data) || (data.nextCursor !== null && (typeof data.nextCursor !== "string" || data.nextCursor.length > 128))
    || !("items" in data) || !Array.isArray(data.items) || (!cursor && data.items.length === 0) || data.items.length > MSN_FEED_PAGE_LIMIT
    || data.items.some(item => !item || typeof item !== "object"
      || ["id", "title", "url", "imageSrc", "publisher", "publishedAt"].some(key => typeof item[key] !== "string" || !item[key])
      || !Number.isFinite(Date.parse(item.publishedAt)))) throw new Error("Invalid MSN feed");
  return data as MsnFeed;
}
