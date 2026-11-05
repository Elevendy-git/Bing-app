import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } from "../src/services/searchSuggestions";
import { prepareBingSerpDocument } from "./bingSerpHtml";

const MAX_HTML_BYTES = 4 * 1024 * 1024;
const MOBILE_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

export async function handleBingSerp(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== "/api/bing-serp") return next();
  const send = (status: number, body: unknown) => {
    if (res.destroyed || res.writableEnded) return;
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  };
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return send(405, { error: "Method not allowed" }); }
  const query = normalizeSearchQuery(url.searchParams.get("query") ?? "");
  if (!query || query.length > SEARCH_QUERY_MAX_LENGTH) return send(400, { error: "Invalid search query" });
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 8000);
  res.on("close", abort);
  try {
    const upstream = new URL("https://www.bing.com/search");
    upstream.searchParams.set("q", query);
    const chinese = /\p{Script=Han}/u.test(query);
    upstream.searchParams.set("setlang", chinese ? "zh-Hans" : "en");
    const response = await fetch(upstream, { signal: controller.signal, redirect: "error",
      headers: { "User-Agent": MOBILE_USER_AGENT, Accept: "text/html", "Accept-Language": chinese ? "zh-CN,zh;q=0.9,en;q=0.8" : "en-US,en;q=0.9" } });
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
    const document = prepareBingSerpDocument(source);
    send(200, { query, ...document, sourceUrl: upstream.href, fetchedAt: new Date().toISOString() });
  } catch {
    send(controller.signal.aborted ? 504 : 502, { error: "Bing results are unavailable" });
  } finally { clearTimeout(timeout); res.off("close", abort); }
}

export function bingSerpPlugin(): Plugin {
  return { name: "bing-mobile-serp", configureServer(server) { server.middlewares.use(handleBingSerp); },
    configurePreviewServer(server) { server.middlewares.use(handleBingSerp); } };
}
