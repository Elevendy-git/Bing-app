import { parse, serializeOuter } from "parse5";
import {
  attr, isElement, walk, type PreviewNode,
  cleanPreviewNode as cleanDocumentNode, cssUrls as rewriteCssUrls, resourceUrl as previewResourceUrl,
} from "./previewHtml";

const BING_ORIGIN = "https://www.bing.com";

// Preserve the existing exports and their Bing default while sharing generic cleaning logic.
export function resourceUrl(value: string, image = false, base = BING_ORIGIN): string | undefined {
  return previewResourceUrl(value, image, base);
}

export function cssUrls(css: string, base = BING_ORIGIN) {
  return rewriteCssUrls(css, base);
}

export function cleanPreviewNode(node: PreviewNode, base = BING_ORIGIN) {
  return cleanDocumentNode(node, base);
}

/** Preserve Bing's mobile HTML/CSS, excluding its site search chrome and executable code. */
export function prepareBingSerpDocument(source: string): { html: string; faviconUrl: string | null } {
  const document = parse(source);
  const elements = walk(document).filter(isElement);
  const icon = elements.find(node => node.tagName === "link" && attr(node, "rel")?.toLowerCase().split(/\s+/).includes("icon"));
  const iconHref = icon && attr(icon, "href")?.trim();
  const iconUrl = iconHref ? resourceUrl(iconHref) : undefined;
  const faviconUrl = iconUrl && new URL(iconUrl).origin === BING_ORIGIN ? iconUrl : null;
  const content = elements.find((node) => attr(node, "id") === "b_content");
  const results = elements.find((node) => attr(node, "id") === "b_results");
  const scope = elements.find((node) => attr(node, "id") === "ScopeRow");
  const body = elements.find((node) => node.tagName === "body");
  if (!content || !results || !results.childNodes.some(isElement)) throw new Error("Bing did not return a usable result document");

  const sheets = elements.filter((node) => node.tagName === "style" || (node.tagName === "link" && attr(node, "rel") === "stylesheet"));
  for (const sheet of sheets) {
    cleanPreviewNode(sheet);
    if (sheet.tagName === "style") for (const child of sheet.childNodes) if (child.nodeName === "#text" && "value" in child) child.value = cssUrls(child.value);
  }
  cleanPreviewNode(content);
  if (scope) cleanPreviewNode(scope);
  const bodyId = attr(body!, "id") ?? "bpage";
  const bodyClass = attr(body!, "class") ?? "";
  // Attributes originate in Bing but still need HTML escaping at the composition boundary.
  const escape = (value: string) => value.replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c]!);
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src https: 'unsafe-inline'; font-src https: data:; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
${sheets.map((sheet) => serializeOuter(sheet)).join("\n")}
<style>html,body{margin:0!important;min-width:0!important;width:100%!important}body{padding:0!important}#b_header{position:static!important;top:auto!important;height:auto!important;margin:0!important;padding:0!important}#ScopeRow{position:static!important;top:auto!important;margin-top:0!important}#b_content{padding-top:0!important}::-webkit-scrollbar{display:none}</style>
</head><body id="${escape(bodyId)}" class="${escape(bodyClass)}">${scope ? `<header id="b_header">${serializeOuter(scope)}</header>` : ""}${serializeOuter(content)}</body></html>`;
  return { html, faviconUrl };
}

export const prepareBingSerpHtml = (source: string) => prepareBingSerpDocument(source).html;
