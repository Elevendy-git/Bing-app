import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { Plugin } from "vite";
import { MSN_FEED_PATH, MSN_FEED_LIMIT, type MsnFeed } from "../src/services/msnFeed";
import { parseMsnArticles } from "./msnFeedData";
import { msnPublicWebKey } from "./msnPublicClient";

const CACHE_MS = 5 * 60_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_PAGES = 256;

/** Only follow MSN's own continuation endpoint, never a requester-supplied URL. */
function nextPageUrl(value: unknown): URL | undefined {
  if (typeof value !== "string" || value.length > 8192) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port
      || !((url.hostname === "api.msn.com" && url.pathname === "/news/feed/pages/weblayout")
        || (url.hostname === "assets.msn.com" && url.pathname === "/service/news/feed/pages/weblayout"))) return;
    for (const key of [...url.searchParams.keys()]) {
      if (["user", "activityid"].includes(key.toLowerCase())) url.searchParams.delete(key);
    }
    if (process.env.MSN_FEED_API_KEY) url.searchParams.set("apikey", process.env.MSN_FEED_API_KEY);
    url.hash = "";
    return url;
  } catch { return; }
}

interface Page {
  upstream?: URL;
  feed?: MsnFeed;
  pending?: Promise<MsnFeed>;
}

export function createMsnFeedHandler() {
  const first: Page = {};
  const pages = new Map<string, Page>();
  const load = async (page: Page): Promise<MsnFeed> => {
    const upstream = page.upstream ?? new URL("https://assets.msn.com/service/news/feed/pages/weblayout");
    if (!page.upstream) upstream.search = new URLSearchParams({ apikey: msnPublicWebKey(),
      ocid: "Peregrine", market: "en-us", newsTop: String(MSN_FEED_LIMIT), newsSkip: "0", contentType: "article",
      queryType: "myfeed", timeOut: "4000", wrapodata: "false", DisableTypeSerialization: "true" }).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(upstream, { signal: controller.signal, redirect: "error", headers: { Accept: "application/json" } });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json") || !response.body) throw new Error("Unavailable");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let body = "", bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) { await reader.cancel(); throw new Error("Feed too large"); }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
      const payload = JSON.parse(body);
      const items = parseMsnArticles(payload, Boolean(page.upstream));
      const next = nextPageUrl(payload.nextPageUrl);
      let nextCursor: string | null = null;
      if (next && next.href !== upstream.href) {
        nextCursor = randomUUID();
        pages.set(nextCursor, { upstream: next });
        // Bound the anonymous cache without exposing upstream tokens to the client.
        while (pages.size > MAX_PAGES) pages.delete(pages.keys().next().value!);
      }
      const feed: MsnFeed = { source: "msn", market: "en-us", fetchedAt: new Date().toISOString(), items, nextCursor };
      page.feed = feed;
      return feed;
    } finally { clearTimeout(timeout); }
  };
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== MSN_FEED_PATH) return next();
    const send = (status: number, body: unknown) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify(body));
    };
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return send(405, { error: "Method not allowed" }); }
    const cursor = url.searchParams.get("cursor");
    const page = cursor ? pages.get(cursor) : first;
    if (!page) return send(410, { error: "News cursor expired" });
    if (cursor) { pages.delete(cursor); pages.set(cursor, page); }
    try {
      if (page.feed && Date.now() - Date.parse(page.feed.fetchedAt) < CACHE_MS
        && (!page.feed.nextCursor || pages.has(page.feed.nextCursor))) return send(200, page.feed);
      // Share only public news data across requests, never a user's identity, cookies or history.
      page.pending ??= load(page).finally(() => { page.pending = undefined; });
      send(200, await page.pending);
    } catch { send(502, { error: "MSN news is unavailable" }); }
  };
}

export function msnFeedPlugin(): Plugin {
  const handler = createMsnFeedHandler();
  return { name: "msn-news-feed", configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); } };
}
