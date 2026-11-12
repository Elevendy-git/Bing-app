import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSearchSuggestions, normalizeSearchQuery, type SearchSuggestion } from "../../services/searchSuggestions";
import { awaitPublicApiReady } from "../../services/publicApiReady";
import { getPreviewSearchSuggestions } from "./Search.suggestions";

export type SuggestionDataSource = "preview" | "loading" | "live" | "fallback";
interface SuggestionResult {
  query: string;
  items: SearchSuggestion[];
  source: SuggestionDataSource;
}
type LiveSuggestionResult = SuggestionResult & { retry: () => void };

const CACHE_TTL_MS = 60_000;
const CACHE_LIMIT = 20;
const REQUEST_TIMEOUT_MS = 10_000;
const NETWORK_RETRY_DELAY_MS = 300;
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

function waitForNetworkRetry(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); reject(signal.reason ?? new DOMException("Cancelled", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, NETWORK_RETRY_DELAY_MS);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

async function fetchWithNetworkRetry(query: string, signal: AbortSignal): Promise<SearchSuggestion[]> {
  try { return await fetchSearchSuggestions(query, signal); }
  catch (error) {
    // A brief transport failure gets one retry inside the same provider deadline.
    // Valid empty results and HTTP/provider errors retain their original meaning.
    if (!(error instanceof TypeError) || signal.aborted) throw error;
    await waitForNetworkRetry(signal);
    return fetchSearchSuggestions(query, signal);
  }
}

export function useSearchSuggestions(input: string, interactive: boolean, active = true): LiveSuggestionResult {
  const query = normalizeSearchQuery(input);
  const [result, setResult] = useState<SuggestionResult>({ query: "", items: [], source: "loading" });
  const [attempt, setAttempt] = useState(0);
  // Only this mounted Search session can reuse results; never persist queries.
  const cache = useRef(new Map<string, CachedSuggestions>());
  const lastLive = useRef<SuggestionResult | null>(null);
  const currentQuery = useRef(query); currentQuery.current = query;
  const retry = useCallback(() => {
    cache.current.delete(currentQuery.current.toLowerCase());
    setAttempt(current => current + 1);
  }, []);

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
      try {
        if (import.meta.env.VITE_API_BASE_URL?.trim()) await awaitPublicApiReady(controller.signal);
        if (disposed || controller.signal.aborted) return;
        timeout = setTimeout(() => {
          controller.abort();
          if (!disposed) fallback();
        }, REQUEST_TIMEOUT_MS);
        const items = await fetchWithNetworkRetry(query, controller.signal);
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
  }, [query, interactive, active, attempt]);

  if (!interactive) return { query, items: getPreviewSearchSuggestions(query), source: "preview", retry };
  const cached = cachedSuggestions(cache.current, query);
  if (cached) return { query, items: cached, source: "live", retry };
  if (result.query === query) return { ...result, retry };
  return { query, items: pendingSuggestions(query, lastLive.current), source: "loading", retry };
}
