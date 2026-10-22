import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { normalizeSearchQuery, parseBingSuggestions, SEARCH_QUERY_MAX_LENGTH, SEARCH_SUGGESTIONS_PATH } from "../src/services/searchSuggestions";

const UPSTREAM_TIMEOUT_MS = 4000;

/** A fixed upstream, with no browser cookies, credentials, query logs or persisted history. */
export async function handleSearchSuggestions(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== SEARCH_SUGGESTIONS_PATH) return next();

  const send = (status: number, body: unknown) => {
    if (res.destroyed || res.writableEnded) return;
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  };
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(405, { error: "Method not allowed" });
  }
  const query = normalizeSearchQuery(url.searchParams.get("query") ?? "");
  if (query.length > SEARCH_QUERY_MAX_LENGTH) return send(400, { error: "Search query is too long" });
  if (!query) return send(200, ["", []]);

  const controller = new AbortController();
  const abort = () => controller.abort();
  res.on("close", abort);
  const timeout = setTimeout(abort, UPSTREAM_TIMEOUT_MS);
  try {
    const upstreamUrl = new URL("https://api.bing.com/osjson.aspx");
    upstreamUrl.searchParams.set("query", query);
    upstreamUrl.searchParams.set("market", /\p{Script=Han}/u.test(query) ? "zh-CN" : "en-US");
    const upstream = await fetch(upstreamUrl, {
      signal: controller.signal,
      redirect: "error",
      headers: { Accept: "application/json" },
    });
    if (!upstream.ok) throw new Error("Bing suggestions are unavailable");
    const items = parseBingSuggestions(await upstream.json());
    send(200, [query, items.map((item) => item.query)]);
  } catch {
    send(controller.signal.aborted ? 504 : 502, { error: "Search suggestions are unavailable" });
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
