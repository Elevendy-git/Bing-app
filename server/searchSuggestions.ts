import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { normalizeSearchQuery, parseBingSuggestions, SEARCH_QUERY_MAX_LENGTH, SEARCH_SUGGESTIONS_PATH } from "../src/services/searchSuggestions";
import { sendJson } from "./http";

const UPSTREAM_TIMEOUT_MS = 4000;
const BING_TIMEOUT_MS = 2000;

async function fetchSuggestions(url: URL, signal: AbortSignal) {
  const response = await fetch(url, {
    signal, redirect: "error", credentials: "omit", headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Suggestions are unavailable");
  return parseBingSuggestions(await response.json());
}

async function bingSuggestions(query: string, market: string, signal: AbortSignal) {
  const upstream = new URL("https://api.bing.com/osjson.aspx");
  upstream.searchParams.set("query", query);
  upstream.searchParams.set("market", market);
  // Leave part of the shared request deadline for a second real provider.
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, BING_TIMEOUT_MS);
  if (signal.aborted) abort();
  try { return await fetchSuggestions(upstream, controller.signal); }
  finally { clearTimeout(timeout); signal.removeEventListener("abort", abort); }
}

/** Fixed providers, with no browser cookies, credentials, query logs or persisted history. */
export async function handleSearchSuggestions(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== SEARCH_SUGGESTIONS_PATH) return next();

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  const query = normalizeSearchQuery(url.searchParams.get("query") ?? "");
  if (query.length > SEARCH_QUERY_MAX_LENGTH) return sendJson(res, 400, { error: "Search query is too long" });
  if (!query) return sendJson(res, 200, ["", []]);

  const controller = new AbortController();
  const abort = () => controller.abort();
  res.on("close", abort);
  const timeout = setTimeout(abort, UPSTREAM_TIMEOUT_MS);
  try {
    const chinese = /\p{Script=Han}/u.test(query);
    let items;
    try { items = await bingSuggestions(query, chinese ? "zh-CN" : "en-US", controller.signal); }
    catch {
      if (controller.signal.aborted) throw new Error("Request cancelled");
      const upstream = new URL("https://suggestqueries.google.com/complete/search");
      upstream.searchParams.set("client", "firefox");
      upstream.searchParams.set("hl", chinese ? "zh-CN" : "en");
      upstream.searchParams.set("q", query);
      items = await fetchSuggestions(upstream, controller.signal);
    }
    if (controller.signal.aborted) throw new Error("Request cancelled");
    sendJson(res, 200, [query, items.map((item) => item.query)]);
  } catch {
    sendJson(res, controller.signal.aborted ? 504 : 502, { error: "Search suggestions are unavailable" });
  } finally {
    clearTimeout(timeout);
    res.off("close", abort);
  }
}

export function searchSuggestionsPlugin(): Plugin {
  return {
    name: "bing-search-suggestions",
    configureServer(server) { server.middlewares.use(handleSearchSuggestions); },
    configurePreviewServer(server) { server.middlewares.use(handleSearchSuggestions); },
  };
}
