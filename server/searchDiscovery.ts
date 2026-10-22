import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { SEARCH_DISCOVERY_PATH, type DiscoveryPage, type DiscoverySection } from "../src/services/searchDiscovery";
import { msnPublicWebKey } from "./msnPublicClient";
import { parseGoogleTrending, parseMsnRecommendations } from "./searchDiscoveryData";

const CACHE_MS = 5 * 60_000;
const EMPTY_CACHE_MS = 30_000;

export function createSearchDiscoveryHandler() {
  const cache = new Map<DiscoverySection, DiscoveryPage>();
  const pending = new Map<DiscoverySection, Promise<DiscoveryPage>>();
  const load = async (section: DiscoverySection): Promise<DiscoveryPage> => {
    const upstream = new URL(section === "recommendations"
      ? "https://assets.msn.com/service/news/feed/segments/autosuggest"
      : "https://trends.google.com/trending/rss");
    upstream.search = new URLSearchParams(section === "recommendations"
      ? { apikey: msnPublicWebKey(), market: "en-us", fdhead: "1s-autosuggestnpt2" }
      : { geo: "US" }).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(upstream, { signal: controller.signal, redirect: "error", headers: {
        Accept: section === "recommendations" ? "application/json" : "application/rss+xml, application/xml, text/xml",
      } });
      if (!response.ok || !response.body) throw new Error("Unavailable");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let body = "", bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 1024 * 1024) { await reader.cancel(); throw new Error("Response too large"); }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
      const items = section === "recommendations" ? parseMsnRecommendations(JSON.parse(body)) : parseGoogleTrending(body);
      const page: DiscoveryPage = { section, source: section === "recommendations" ? "msn" : "google-trends", fetchedAt: new Date().toISOString(), items };
      cache.set(section, page);
      return page;
    } finally { clearTimeout(timeout); }
  };
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== SEARCH_DISCOVERY_PATH) return next();
    const send = (status: number, body: unknown) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify(body));
    };
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return send(405, { error: "Method not allowed" }); }
    const section = url.searchParams.get("section");
    if (section !== "recommendations" && section !== "trending") return send(400, { error: "Unknown discovery section" });
    try {
      const cached = cache.get(section);
      if (cached && Date.now() - Date.parse(cached.fetchedAt) < (cached.items.length ? CACHE_MS : EMPTY_CACHE_MS)) return send(200, cached);
      let request = pending.get(section);
      if (!request) {
        request = load(section).finally(() => pending.delete(section));
        pending.set(section, request);
      }
      send(200, await request);
    } catch { send(502, { error: "Search discovery is unavailable" }); }
  };
}

export function searchDiscoveryPlugin(): Plugin {
  const handler = createSearchDiscoveryHandler();
  return { name: "search-discovery", configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); } };
}
