import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } from "../src/services/searchSuggestions";
import { prepareBingSerpDocument } from "./bingSerpHtml";
import { MOBILE_USER_AGENT, sendJson } from "./http";
import { bingSearchUrl } from "../src/services/bingPage";
import { fallbackSearchRequestUrl, fallbackSearchUrl, prepareSearchFallbackDocument } from "./searchFallbackHtml";

const MAX_HTML_BYTES = 4 * 1024 * 1024;
const PRIMARY_TIMEOUT_MS = 4000;
const REQUEST_TIMEOUT_MS = 12000;

async function fetchHtml(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal, redirect: "error", credentials: "omit",
    headers: { "User-Agent": MOBILE_USER_AGENT, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" } });
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html") || !response.body) {
    await response.body?.cancel();
    throw new Error("Unavailable");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0, source = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_HTML_BYTES) { await reader.cancel(); throw new Error("Document too large"); }
    source += decoder.decode(value, { stream: true });
  }
  return source + decoder.decode();
}

export async function handleBingSerp(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== "/api/bing-serp") return next();
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return sendJson(res, 405, { error: "Method not allowed" }); }
  const query = normalizeSearchQuery(url.searchParams.get("query") ?? "");
  if (!query || query.length > SEARCH_QUERY_MAX_LENGTH) return sendJson(res, 400, { error: "Invalid search query" });
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, REQUEST_TIMEOUT_MS);
  res.on("close", abort);
  try {
    const primary = new AbortController();
    const cancelPrimary = () => primary.abort();
    controller.signal.addEventListener("abort", cancelPrimary, { once: true });
    const primaryTimeout = setTimeout(cancelPrimary, PRIMARY_TIMEOUT_MS);
    try {
      const sourceUrl = bingSearchUrl(query);
      const source = await fetchHtml(sourceUrl, primary.signal);
      if (controller.signal.aborted || primary.signal.aborted) throw new Error("Cancelled");
      const document = prepareBingSerpDocument(source, query);
      return sendJson(res, 200, { query, ...document, provider: "bing", sourceUrl, fetchedAt: new Date().toISOString() });
    } catch (error) {
      if (controller.signal.aborted) throw error;
      // A malformed/challenged/unrelated document is not a successful search.
      // Try a fixed public provider instead of returning it under another query.
    } finally {
      clearTimeout(primaryTimeout);
      controller.signal.removeEventListener("abort", cancelPrimary);
    }
    const source = await fetchHtml(fallbackSearchRequestUrl(query), controller.signal);
    if (controller.signal.aborted) throw new Error("Cancelled");
    const document = prepareSearchFallbackDocument(source, query);
    sendJson(res, 200, { query, ...document, provider: "duckduckgo", sourceUrl: fallbackSearchUrl(query), fetchedAt: new Date().toISOString() });
  } catch {
    sendJson(res, controller.signal.aborted ? 504 : 502, { error: "Bing results are unavailable" });
  } finally { clearTimeout(timeout); res.off("close", abort); }
}

export function bingSerpPlugin(): Plugin {
  return { name: "bing-mobile-serp", configureServer(server) { server.middlewares.use(handleBingSerp); },
    configurePreviewServer(server) { server.middlewares.use(handleBingSerp); } };
}
