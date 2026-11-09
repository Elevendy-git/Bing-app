import { parse, serializeOuter } from "parse5";
import { attr, cleanPreviewNode, cssUrls, isElement, resourceUrl, walk, type PreviewNode } from "./previewHtml";

const text = (node: PreviewNode) => walk(node).map(child => "value" in child ? child.value : "").join(" ").replace(/\s+/g, " ").trim();

/** Read-only mobile HTML, retaining the site's layout while removing executable content. */
export function prepareWebPageDocument(source: string, sourceUrl: string) {
  const doc = parse(source);
  const elements = walk(doc).filter(isElement);
  const titleNode = elements.find(node => node.tagName === "title");
  const title = (titleNode ? text(titleNode) : new URL(sourceUrl).hostname).slice(0, 240);
  const favicon = elements.find(node => node.tagName === "link" && attr(node, "rel")?.toLowerCase().split(/\s+/).includes("icon"));
  const faviconUrl = favicon ? resourceUrl(attr(favicon, "href") ?? "", false, sourceUrl) ?? null : null;
  const baseNode = elements.find(node => node.tagName === "base");
  const base = baseNode ? resourceUrl(attr(baseNode, "href") ?? "", false, sourceUrl) ?? sourceUrl : sourceUrl;
  const body = elements.find(node => node.tagName === "body");
  if (!body) throw new Error("No page content");
  const styles = elements.filter(node => node.tagName === "style" || node.tagName === "link" && attr(node, "rel")?.toLowerCase() === "stylesheet");
  styles.forEach(node => {
    cleanPreviewNode(node, base);
    if (node.tagName === "style") node.childNodes.forEach(child => { if ("value" in child) child.value = cssUrls(child.value, base); });
  });
  cleanPreviewNode(body, base);
  if (text(body).length < 30 || /^(just a moment|access denied|attention required)/i.test(title)) throw new Error("No previewable content");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src https: http: 'unsafe-inline'; font-src https: http: data:; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
${styles.map(node => serializeOuter(node)).join("\n")}
<style>html{overflow-x:hidden}html,body{min-width:0!important;margin:0}img,video{max-width:100%;height:auto}::-webkit-scrollbar{display:none}</style></head>${serializeOuter(body)}</html>`;
  return { html, title, faviconUrl };
}
