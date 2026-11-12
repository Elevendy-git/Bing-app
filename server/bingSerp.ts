import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } from "../src/services/searchSuggestions";
import { prepareBingSerpDocument } from "./bingSerpHtml";
import { MOBILE_USER_AGENT, sendJson } from "./http";
import { bingSearchUrl } from "../src/services/bingPage";
import { fallbackSearchRequestUrl, fallbackSearchUrl, prepareSearchFallbackDocument } from "./searchFallbackHtml";
import { bingRssRequestUrl, prepareBingRssDocument } from "./bingRssHtml";

const MAX_HTML_BYTES = 4 * 1024 * 1024;
const PRIMARY_TIMEOUT_MS = 8000;
const RSS_TIMEOUT_MS = 4000;
const REQUEST_TIMEOUT_MS = 20000;

class SearchUpstreamError extends Error {
  constructor(readonly code: string) { super("Search upstream unavailable"); }
}

function failureCode(error: unknown, signal: AbortSignal): string {
  if (signal.aborted) return "timeout";
  if (error instanceof SearchUpstreamError) return error.code;
  const cause = error instanceof Error ? error.cause : undefined;
  const code = cause && typeof cause === "object" && "code" in cause ? cause.code : undefined;
  // Allowlisted labels only; never publish exception messages, addresses or URLs.
  if (code === "UND_ERR_CONNECT_TIMEOUT" || code === "ETIMEDOUT") return "connect-timeout";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "dns";
  if (code === "ECONNREFUSED") return "connection-refused";
  if (code === "ECONNRESET" || code === "UND_ERR_SOCKET") return "connection-reset";
  if (typeof code === "string" && /^(?:ERR_TLS_|CERT_|DEPTH_ZERO_SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE)/.test(code)) return "tls";
  if (cause instanceof Error && cause.message === "unexpected redirect") return "redirect";
  if (error instanceof Error && error.message === "Bing returned unrelated results") return "unrelated";
  if (error instanceof Error && error.message === "Bing returned a different query") return "query-mismatch";
  return error instanceof TypeError ? "connection" : "document";
}

async function fetchDocument(url: string, signal: AbortSignal, format: "html" | "xml" = "html"): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { signal, redirect: "error", credentials: "omit",
      headers: { "User-Agent": MOBILE_USER_AGENT, Accept: format === "xml" ? "application/rss+xml,application/xml,text/xml" : "text/html", "Accept-Language": "en-US,en;q=0.9" } });
  } catch (error) { throw new SearchUpstreamError(failureCode(error, signal)); }
  const validContentType = format === "xml" ? /^(?:application\/(?:rss\+xml|xml)|text\/xml)(?:;|$)/i : /^text\/html(?:;|$)/i;
  if (!response.ok || !validContentType.test(response.headers.get("content-type") ?? "") || !response.body) {
    await response.body?.cancel();
    throw new SearchUpstreamError(!response.ok ? `http-${response.status}` : "content-type");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0, source = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_HTML_BYTES) { await reader.cancel(); throw new SearchUpstreamError("body-limit"); }
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
  let provider = "bing";
  let primaryFailure: string | undefined;
  let rssFailure: string | undefined;
  try {
    const primary = new AbortController();
    const cancelPrimary = () => primary.abort();
    controller.signal.addEventListener("abort", cancelPrimary, { once: true });
    const primaryTimeout = setTimeout(cancelPrimary, PRIMARY_TIMEOUT_MS);
    try {
      const sourceUrl = bingSearchUrl(query);
      const source = await fetchDocument(sourceUrl, primary.signal);
      if (controller.signal.aborted || primary.signal.aborted) throw new Error("Cancelled");
      const document = prepareBingSerpDocument(source, query);
      return sendJson(res, 200, { query, ...document, provider: "bing", sourceUrl, fetchedAt: new Date().toISOString() });
    } catch (error) {
      if (controller.signal.aborted) throw error;
      primaryFailure = failureCode(error, primary.signal);
      // A malformed/challenged/unrelated document is not a successful search.
      // Try a fixed public provider instead of returning it under another query.
    } finally {
      clearTimeout(primaryTimeout);
      controller.signal.removeEventListener("abort", cancelPrimary);
    }
    // RSS is a separate Bing result format, not a trusted substitute. Reject
    // malformed or unrelated items with the same guard as the HTML provider.
    const rss = new AbortController();
    const cancelRss = () => rss.abort();
    controller.signal.addEventListener("abort", cancelRss, { once: true });
    const rssTimeout = setTimeout(cancelRss, RSS_TIMEOUT_MS);
    try {
      const source = await fetchDocument(bingRssRequestUrl(query), rss.signal, "xml");
      if (controller.signal.aborted || rss.signal.aborted) throw new Error("Cancelled");
      const document = prepareBingRssDocument(source, query);
      return sendJson(res, 200, { query, ...document, provider: "bing", sourceUrl: bingSearchUrl(query), fetchedAt: new Date().toISOString() });
    } catch (error) {
      if (controller.signal.aborted) throw error;
      rssFailure = failureCode(error, rss.signal);
    } finally {
      clearTimeout(rssTimeout);
      controller.signal.removeEventListener("abort", cancelRss);
    }
    provider = "duckduckgo";
    const source = await fetchDocument(fallbackSearchRequestUrl(query), controller.signal);
    if (controller.signal.aborted) throw new Error("Cancelled");
    const document = prepareSearchFallbackDocument(source, query);
    sendJson(res, 200, { query, ...document, provider: "duckduckgo", sourceUrl: fallbackSearchUrl(query), fetchedAt: new Date().toISOString() });
  } catch (error) {
    // These fixed diagnostic labels contain no queries, destinations or cookies.
    res.setHeader("X-Search-Provider", provider);
    res.setHeader("X-Search-Failure", failureCode(error, controller.signal));
    if (primaryFailure) res.setHeader("X-Search-Primary-Failure", primaryFailure);
    if (rssFailure) res.setHeader("X-Search-RSS-Failure", rssFailure);
    sendJson(res, controller.signal.aborted ? 504 : 502, { error: "Bing results are unavailable" });
  } finally { clearTimeout(timeout); res.off("close", abort); }
}

export function bingSerpPlugin(): Plugin {
  return { name: "bing-mobile-serp", configureServer(server) { server.middlewares.use(handleBingSerp); },
    configurePreviewServer(server) { server.middlewares.use(handleBingSerp); } };
}
