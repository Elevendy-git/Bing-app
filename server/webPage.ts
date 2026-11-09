import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { fetchWebPage, publicWebUrl } from "./webPageFetch";
import { prepareWebPageDocument } from "./webPageHtml";
import { fetchMsnArticle, msnArticleRequest } from "./msnArticle";
import { sendJson } from "./http";

let pending = 0;
export async function handleWebPage(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== "/api/web-page") return next();
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return sendJson(res, 405, { error: "Method not allowed" }); }
  const requestedUrl = url.searchParams.get("url") ?? "";
  try { publicWebUrl(requestedUrl); } catch { return sendJson(res, 400, { error: "Invalid destination" }); }
  if (pending >= 6) return sendJson(res, 503, { error: "Preview busy" });
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(() => { abort(); sendJson(res, 504, { error: "Page preview timed out" }); }, 8000);
  res.on("close", abort); pending++;
  try {
    const msnArticle = msnArticleRequest(requestedUrl);
    const { source, sourceUrl } = await (msnArticle
      ? fetchMsnArticle(msnArticle, controller.signal) : fetchWebPage(requestedUrl, controller.signal));
    sendJson(res, 200, { ...prepareWebPageDocument(source, sourceUrl), requestedUrl, sourceUrl, fetchedAt: new Date().toISOString() });
  } catch { sendJson(res, 502, { error: "This page cannot be previewed" }); }
  finally { clearTimeout(timeout); res.off("close", abort); pending--; }
}

export function webPagePlugin(): Plugin {
  return { name: "iab-web-preview", configureServer(server) { server.middlewares.use(handleWebPage); },
    configurePreviewServer(server) { server.middlewares.use(handleWebPage); } };
}
