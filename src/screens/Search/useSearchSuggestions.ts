import { useEffect, useRef, useState } from "react";
import { fetchSearchSuggestions, normalizeSearchQuery, type SearchSuggestion } from "../../services/searchSuggestions";
import { getPreviewSearchSuggestions } from "./Search.suggestions";

export type SuggestionDataSource = "preview" | "loading" | "live" | "fallback";
interface SuggestionResult {
  query: string;
  items: SearchSuggestion[];
  source: SuggestionDataSource;
}

const CACHE_TTL_MS = 60_000;
const CACHE_LIMIT = 20;
interface CachedSuggestions { items: SearchSuggestion[]; expiresAt: number }
const cachedSuggestions = (cache: Map<string, CachedSuggestions>, query: string) => {
  const cached = cache.get(query.toLowerCase());
  return cached && cached.expiresAt > Date.now() ? cached.items : undefined;
};

// Retain the complete returned list during an edit, rather than shrinking it to
// the subset matching each keystroke. Never turn the input itself into an AS row.
const pendingSuggestions = (query: string, previous: SuggestionResult | null): SearchSuggestion[] => {
  if (!query || !previous) return [];
  const current = query.toLowerCase();
  const last = previous.query.toLowerCase();
  return current.startsWith(last) || last.startsWith(current) ? previous.items : [];
};

export function useSearchSuggestions(input: string, interactive: boolean, active = true): SuggestionResult {
  const query = normalizeSearchQuery(input);
  const [result, setResult] = useState<SuggestionResult>({ query: "", items: [], source: "loading" });
  // Only this mounted Search session can reuse results; never persist queries.
  const cache = useRef(new Map<string, CachedSuggestions>());
  const lastLive = useRef<SuggestionResult | null>(null);

  useEffect(() => {
    if (!interactive || !active) return;
    if (!query) {
      lastLive.current = null;
      setResult({ query, items: [], source: "loading" });
      return;
    }
    const cached = cachedSuggestions(cache.current, query);
    if (cached) {
      const next: SuggestionResult = { query, items: cached, source: "live" };
      lastLive.current = next;
      setResult(next);
      return;
    }
    let disposed = false;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const fallback = () => setResult({ query, items: [], source: "fallback" });
    setResult({ query, items: pendingSuggestions(query, lastLive.current), source: "loading" });
    const debounce = setTimeout(async () => {
      timeout = setTimeout(() => {
        controller.abort();
        if (!disposed) fallback();
      }, 5000);
      try {
        const items = await fetchSearchSuggestions(query, controller.signal);
        if (!disposed && !controller.signal.aborted) {
          const next: SuggestionResult = { query, items, source: "live" };
          cache.current.delete(query.toLowerCase());
          cache.current.set(query.toLowerCase(), { items, expiresAt: Date.now() + CACHE_TTL_MS });
          if (cache.current.size > CACHE_LIMIT) cache.current.delete(cache.current.keys().next().value!);
          lastLive.current = next;
          setResult(next);
        }
      } catch {
        if (!disposed) fallback();
      } finally {
        clearTimeout(timeout);
      }
    }, 80);
    return () => {
      disposed = true;
      clearTimeout(debounce);
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, interactive, active]);

  if (!interactive) return { query, items: getPreviewSearchSuggestions(query), source: "preview" };
  const cached = cachedSuggestions(cache.current, query);
  if (cached) return { query, items: cached, source: "live" };
  if (result.query === query) return result;
  return { query, items: pendingSuggestions(query, lastLive.current), source: "loading" };
}
