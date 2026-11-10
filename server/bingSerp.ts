import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } from "../src/services/searchSuggestions";
import { prepareBingSerpDocument } from "./bingSerpHtml";
import { assertBingSerpQuery, BingSerpQueryMismatchError } from "./bingSerpValidation";
import { MOBILE_USER_AGENT, sendJson } from "./http";
import { renderBingSearch } from "./bingBrowser";

const MAX_HTML_BYTES = 4 * 1024 * 1024;

export async function handleBingSerp(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== "/api/bing-serp") return next();
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return sendJson(res, 405, { error: "Method not allowed" }); }
  const query = normalizeSearchQuery(url.searchParams.get("query") ?? "");
  if (!query || query.length > SEARCH_QUERY_MAX_LENGTH) return sendJson(res, 400, { error: "Invalid search query" });
  const controller = new AbortController();
  const browserRendering = process.env.BING_SERP_RENDERER !== "http";
  const budgetMs = browserRendering ? 18_000 : 8000;
  const deadline = Date.now() + budgetMs;
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, budgetMs);
  res.on("close", abort);
  try {
    const upstream = new URL("https://www.bing.com/search");
    upstream.searchParams.set("q", query);
    const chinese = /\p{Script=Han}/u.test(query);
    upstream.searchParams.set("setlang", chinese ? "zh-Hans" : "en");
    for (let attempt = 0; attempt < 2; attempt++) {
      const requestUrl = new URL(upstream);
      if (attempt) requestUrl.searchParams.set("cvid", crypto.randomUUID().replaceAll("-", ""));
      let source = "";
      if (browserRendering) {
        source = await renderBingSearch(query, { signal: controller.signal, locale: chinese ? "zh-CN" : "en-US", timeoutMs: Math.max(1, deadline - Date.now()) });
        if (Buffer.byteLength(source, "utf8") > MAX_HTML_BYTES) throw new Error("Document too large");
      } else {
        const response = await fetch(requestUrl, { signal: controller.signal, redirect: "error", cache: "no-store",
          headers: { "User-Agent": MOBILE_USER_AGENT, Accept: "text/html", "Cache-Control": "no-cache", "Accept-Language": chinese ? "zh-CN,zh;q=0.9,en;q=0.8" : "en-US,en;q=0.9" } });
        if (!response.ok || !response.headers.get("content-type")?.includes("text/html") || !response.body) throw new Error("Unavailable");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let bytes = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > MAX_HTML_BYTES) { await reader.cancel(); throw new Error("Document too large"); }
          source += decoder.decode(value, { stream: true });
        }
        source += decoder.decode();
      }
      try { assertBingSerpQuery(source, query); }
      catch (error) {
        if (attempt === 0 && error instanceof BingSerpQueryMismatchError && !controller.signal.aborted) continue;
        throw error;
      }
      const document = prepareBingSerpDocument(source);
      return sendJson(res, 200, { query, ...document, sourceUrl: upstream.href, fetchedAt: new Date().toISOString(), renderMode: browserRendering ? "browser" : "http" });
    }
  } catch (error) {
    if (error instanceof BingSerpQueryMismatchError && !controller.signal.aborted) {
      return sendJson(res, 502, { error: "Bing returned unrelated results", code: "RESULT_QUERY_MISMATCH" });
    }
    sendJson(res, controller.signal.aborted ? 504 : 502, { error: "Bing results are unavailable" });
  } finally { clearTimeout(timeout); res.off("close", abort); }
}

export function bingSerpPlugin(): Plugin {
  return { name: "bing-mobile-serp", configureServer(server) { server.middlewares.use(handleBingSerp); },
    configurePreviewServer(server) { server.middlewares.use(handleBingSerp); } };
}
