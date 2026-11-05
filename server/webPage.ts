import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { fetchWebPage, publicWebUrl } from "./webPageFetch";
import { prepareWebPageDocument } from "./webPageHtml";
import { fetchMsnArticle, msnArticleRequest } from "./msnArticle";

let pending = 0;
export async function handleWebPage(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== "/api/web-page") return next();
  const send = (status: number, body: unknown) => {
    if (res.destroyed || res.writableEnded) return;
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  };
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return send(405, { error: "Method not allowed" }); }
  const requestedUrl = url.searchParams.get("url") ?? "";
  try { publicWebUrl(requestedUrl); } catch { return send(400, { error: "Invalid destination" }); }
  if (pending >= 6) return send(503, { error: "Preview busy" });
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(() => { abort(); send(504, { error: "Page preview timed out" }); }, 8000);
  res.on("close", abort); pending++;
  try {
    const msnArticle = msnArticleRequest(requestedUrl);
    const { source, sourceUrl } = await (msnArticle
      ? fetchMsnArticle(msnArticle, controller.signal) : fetchWebPage(requestedUrl, controller.signal));
    send(200, { ...prepareWebPageDocument(source, sourceUrl), requestedUrl, sourceUrl, fetchedAt: new Date().toISOString() });
  } catch { send(502, { error: "This page cannot be previewed" }); }
  finally { clearTimeout(timeout); res.off("close", abort); pending--; }
}

export function webPagePlugin(): Plugin {
  return { name: "iab-web-preview", configureServer(server) { server.middlewares.use(handleWebPage); },
    configurePreviewServer(server) { server.middlewares.use(handleWebPage); } };
}
