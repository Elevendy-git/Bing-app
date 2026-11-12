import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } from "../src/services/searchSuggestions";
import { prepareBingSerpDocument } from "./bingSerpHtml";
import { MOBILE_USER_AGENT, sendJson } from "./http";
import { bingSearchUrl } from "../src/services/bingPage";

const MAX_HTML_BYTES = 4 * 1024 * 1024;

export async function handleBingSerp(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== "/api/bing-serp") return next();
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return sendJson(res, 405, { error: "Method not allowed" }); }
  const query = normalizeSearchQuery(url.searchParams.get("query") ?? "");
  if (!query || query.length > SEARCH_QUERY_MAX_LENGTH) return sendJson(res, 400, { error: "Invalid search query" });
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 8000);
  res.on("close", abort);
  try {
    const upstream = new URL(bingSearchUrl(query));
    const response = await fetch(upstream, { signal: controller.signal, redirect: "error",
      headers: { "User-Agent": MOBILE_USER_AGENT, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" } });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html") || !response.body) throw new Error("Unavailable");
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
    source += decoder.decode();
    const document = prepareBingSerpDocument(source, query);
    sendJson(res, 200, { query, ...document, sourceUrl: upstream.href, fetchedAt: new Date().toISOString() });
  } catch {
    sendJson(res, controller.signal.aborted ? 504 : 502, { error: "Bing results are unavailable" });
  } finally { clearTimeout(timeout); res.off("close", abort); }
}

export function bingSerpPlugin(): Plugin {
  return { name: "bing-mobile-serp", configureServer(server) { server.middlewares.use(handleBingSerp); },
    configurePreviewServer(server) { server.middlewares.use(handleBingSerp); } };
}
