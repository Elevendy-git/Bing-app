export interface SearchSuggestion {
  query: string;
  source: "history" | "prediction";
  logoUrl?: string | null;
}

export const SEARCH_SUGGESTION_LIMIT = 5;
export const SEARCH_QUERY_MAX_LENGTH = 256;
export const SEARCH_SUGGESTIONS_PATH = "/api/search-suggestions";

export function normalizeSearchQuery(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/** Bing's public autocomplete response contains queries, not personal history or logos. */
export function parseBingSuggestions(payload: unknown): SearchSuggestion[] {
  if (!Array.isArray(payload) || typeof payload[0] !== "string" || !Array.isArray(payload[1])) {
    throw new Error("Invalid search suggestion response");
  }
  const seen = new Set<string>();
  const items: SearchSuggestion[] = [];
  for (const value of payload[1]) {
    if (typeof value !== "string") continue;
    const query = normalizeSearchQuery(value);
    const key = query.toLowerCase();
    if (!query || query.length > SEARCH_QUERY_MAX_LENGTH || seen.has(key)) continue;
    seen.add(key);
    items.push({ query, source: "prediction" });
    if (items.length === SEARCH_SUGGESTION_LIMIT) break;
  }
  return items;
}

export async function fetchSearchSuggestions(input: string, signal: AbortSignal): Promise<SearchSuggestion[]> {
  const query = normalizeSearchQuery(input);
  if (!query) return [];
  if (query.length > SEARCH_QUERY_MAX_LENGTH) throw new Error("Search query is too long");
  const params = new URLSearchParams({ query });
  const response = await fetch(`${import.meta.env.BASE_URL}${SEARCH_SUGGESTIONS_PATH.slice(1)}?${params}`, {
    signal,
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Search suggestions are unavailable");
  return parseBingSuggestions(await response.json());
}
