import { parse, serializeOuter } from "parse5";
import { webUrl } from "../src/services/webNavigation";
import { duckDuckGoSearchUrl } from "../src/services/bingPage";
import { prepareBingSerpDocument } from "./bingSerpHtml";
import { attr, cleanPreviewNode, isElement, walk, type PreviewElement, type PreviewNode } from "./previewHtml";

const FALLBACK_ORIGIN = "https://html.duckduckgo.com";
const hasClass = (node: PreviewElement, name: string) => attr(node, "class")?.split(/\s+/).includes(name) ?? false;
const escape = (value: string) => value.replace(/[&"<>']/g, character => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;", "'": "&#39;" })[character]!);

/** Fixed provider URLs, never supplied by a caller or copied from upstream markup. */
export const fallbackSearchUrl = duckDuckGoSearchUrl;
export const fallbackSearchRequestUrl = (query: string) => `https://html.duckduckgo.com/html/?${new URLSearchParams({ q: query, kl: "us-en" })}`;

function visibleText(node: PreviewNode): string {
  if (node.nodeName === "#text" && "value" in node) return node.value;
  if (isElement(node) && (["script", "style", "template", "noscript"].includes(node.tagName)
    || attr(node, "hidden") !== undefined || attr(node, "aria-hidden") === "true"
    || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attr(node, "style") ?? ""))) return "";
  return "childNodes" in node ? node.childNodes.map(visibleText).join(" ") : "";
}

function resultUrl(value: string): string | null {
  const resolved = webUrl(value, FALLBACK_ORIGIN);
  if (!resolved) return null;
  let url = new URL(resolved);
  const internal = (host: string) => host === "duckduckgo.com" || host.endsWith(".duckduckgo.com");
  if (internal(url.hostname) && url.pathname === "/l/") {
    const target = webUrl(url.searchParams.get("uddg") ?? "");
    if (!target) return null;
    url = new URL(target);
  }
  return internal(url.hostname) ? null : url.href;
}

/** Render actual organic results when Bing's mobile document is unavailable.
 * Remote markup, scripts, advertisements and navigation chrome are never copied.
 */
export function prepareSearchFallbackDocument(source: string, query: string): { html: string; faviconUrl: null; title: string } {
  const elements = walk(parse(source)).filter(isElement);
  if (elements.some(node => ["challenge-form", "anomaly-form"].includes(attr(node, "id") ?? "") || hasClass(node, "anomaly-modal"))) {
    throw new Error("Search provider requires verification");
  }
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const result of elements.filter(node => hasClass(node, "result") && !hasClass(node, "result--ad"))) {
    const children = walk(result).filter(isElement);
    const link = children.find(node => node.tagName === "a" && hasClass(node, "result__a"));
    const href = link && resultUrl(attr(link, "href") ?? "");
    const title = link && visibleText(link).replace(/\s+/g, " ").trim().slice(0, 512);
    if (!href || !title || seen.has(href)) continue;
    seen.add(href);
    const snippet = children.find(node => hasClass(node, "result__snippet"));
    const summary = snippet ? visibleText(snippet).replace(/\s+/g, " ").trim().slice(0, 2000) : "";
    const hostname = new URL(href).hostname.replace(/^www\./, "");
    rows.push(`<li class="b_algo"><div class="site">${escape(hostname)}</div><h2><a href="${escape(href)}">${escape(title)}</a></h2>${summary ? `<p>${escape(summary)}</p>` : ""}</li>`);
    if (rows.length === 10) break;
  }
  if (!rows.length) throw new Error("Search provider returned no usable results");
  const content = `<main id="b_content"><div class="attribution">Results from DuckDuckGo</div><ol id="b_results">${rows.join("")}</ol></main>`;
  // Share the primary provider's conservative relevance check. The generated
  // markup contains only plain extracted text and concrete result destinations.
  prepareBingSerpDocument(content, query);
  const main = walk(parse(content)).find((node): node is PreviewElement => isElement(node) && node.tagName === "main")!;
  cleanPreviewNode(main, FALLBACK_ORIGIN);
  const title = `${query} — Search results`;
  return { title, faviconUrl: null, html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(title)}</title><style>
*{box-sizing:border-box}html,body{margin:0;min-width:0;background:#fff;color:#242424;font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{padding:12px 16px 24px}.attribution{margin-bottom:18px;color:#666;font-size:12px}ol{list-style:none;padding:0;margin:0}li{margin:0 0 24px}.site{color:#555;font-size:13px;overflow-wrap:anywhere}h2{font-size:20px;line-height:1.3;font-weight:500;margin:5px 0 6px}a{color:#174ea6;text-decoration:none;overflow-wrap:anywhere}p{margin:0;color:#3c4043}::-webkit-scrollbar{display:none}
</style></head><body>${serializeOuter(main)}</body></html>` };
}
