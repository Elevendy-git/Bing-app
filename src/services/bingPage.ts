import { normalizeSearchQuery } from "./searchSuggestions";

/** A script-free copy of a document returned by the search or webpage endpoint. */
export interface BingPageSnapshot {
  title?: string;
  html: string;
  sourceUrl: string;
  faviconUrl: string | null;
  fetchedAt: string;
  viewportWidth: number;
  viewportHeight: number;
}

/** Use Bing's canonical query URL. The server requests English through its
 * Accept-Language header: forced market parameters can return unrelated results
 * for anonymous requests from the hosted backend. */
export const bingSearchUrl = (query: string) => `https://www.bing.com/search?${new URLSearchParams({ q: query })}`;

/** Reopen the recorded query, rather than searching for a display title or URL. */
export function bingSearchQuery(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    if (url.origin !== "https://www.bing.com" || url.pathname !== "/search" || url.username || url.password) return null;
    return normalizeSearchQuery(url.searchParams.get("q") ?? "") || null;
  } catch { return null; }
}

/** Metadata must describe the result we requested, not a destination mentioned by it. */
export function bingPageIdentity(query: string, sourceUrl: unknown, faviconUrl: unknown) {
  let url = bingSearchUrl(query);
  try {
    const candidate = new URL(String(sourceUrl));
    if (candidate.origin === "https://www.bing.com" && candidate.pathname === "/search"
      && bingSearchQuery(candidate.href) === normalizeSearchQuery(query) && !candidate.username && !candidate.password) url = candidate.href;
  } catch { /* Keep the known requested page URL when metadata is missing. */ }
  let favicon: string | null = null;
  try {
    const candidate = new URL(String(faviconUrl));
    if (candidate.origin === "https://www.bing.com" && !candidate.username && !candidate.password) favicon = candidate.href;
  } catch { /* Missing icons use the host's neutral fallback. */ }
  return { sourceUrl: url, faviconUrl: favicon };
}
