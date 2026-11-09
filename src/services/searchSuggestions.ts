import { publicApiUrl } from "./apiUrl";

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

/** Annotate received suggestions without adding, reordering or persisting queries. */
export function markSearchHistorySuggestions(items: readonly SearchSuggestion[], historyQueries: readonly string[], privateMode = false): SearchSuggestion[] {
  const history = new Set((privateMode ? [] : historyQueries).map(query => normalizeSearchQuery(query).toLocaleLowerCase()));
  return items.slice(0, SEARCH_SUGGESTION_LIMIT).map(item => ({
    ...item,
    source: history.has(normalizeSearchQuery(item.query).toLocaleLowerCase()) ? "history" : "prediction",
  }));
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
  const response = await fetch(publicApiUrl(`${SEARCH_SUGGESTIONS_PATH}?${params}`), {
    signal,
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Search suggestions are unavailable");
  return parseBingSuggestions(await response.json());
}
