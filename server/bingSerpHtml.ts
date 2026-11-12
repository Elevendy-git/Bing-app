import { parse, serializeOuter } from "parse5";
import {
  attr, isElement, walk, type PreviewNode,
  cleanPreviewNode as cleanDocumentNode, cssUrls as rewriteCssUrls, resourceUrl as previewResourceUrl,
} from "./previewHtml";

const BING_ORIGIN = "https://www.bing.com";
const queryStopwords = new Set("a an and are as at be best by can could do does for free from has have how i in into is it its me my near of on or our should that the their there these this to top us was we were what when where which who why will with would you your com www".split(" "));
const singularTerm = (word: string) => word.length > 4 && word.endsWith("ies") ? `${word.slice(0, -3)}y`
  : word.length > 4 && /(?:ches|shes|xes|zes|sses)$/.test(word) ? word.slice(0, -2)
  : word.length > 4 && word.endsWith("s") && !/(ss|us|is)$/.test(word) ? word.slice(0, -1) : word;
const terms = (text: string) => (text.toLowerCase().match(/[a-z][a-z0-9]*/g) ?? []).map(singularTerm);

/** A conservative lexical check catches obviously unrelated anonymous upstream pages.
 * It is not a relevance ranking: one informative term is enough, unknown scripts/
 * short queries and unrecognized result layouts are left to Bing. Never inspect
 * the search field/chrome, whose query echo can coexist with unrelated results.
 */
function assertRelatedResults(results: PreviewNode, query?: string) {
  if (!query || /[^\u0000-\u007f]/.test(query)) return;
  const significant = terms(query).filter(term => term.length >= 3 && !queryStopwords.has(term));
  if (significant.length === 0) return;
  const rows = walk(results).filter(node => isElement(node) && attr(node, "class")?.split(/\s+/).includes("b_algo"));
  if (rows.length === 0) return;
  const visibleText = (node: PreviewNode): string => {
    if (node.nodeName === "#text" && "value" in node) return node.value;
    if (isElement(node)) {
      if (["script", "style", "template", "noscript", "input", "textarea", "select"].includes(node.tagName)
        || attr(node, "hidden") !== undefined || attr(node, "aria-hidden") === "true"
        || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attr(node, "style") ?? "")) return "";
      if (node.tagName === "a") {
        try {
          const target = new URL(attr(node, "href") ?? "", BING_ORIGIN);
          // Result destination identity is useful; query/tracking parameters are not.
          if (/^https?:$/.test(target.protocol) && target.origin !== BING_ORIGIN) {
            return `${target.hostname} ${decodeURIComponent(target.pathname)} ${node.childNodes.map(visibleText).join(" ")}`;
          }
        } catch { /* Continue with the visible label when the destination is malformed. */ }
      }
    }
    return "childNodes" in node ? node.childNodes.map(visibleText).join(" ") : "";
  };
  const received = new Set(terms(rows.map(visibleText).join(" ")));
  if (!significant.some(term => received.has(term))) throw new Error("Bing returned unrelated results");
}

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
export function prepareBingSerpDocument(source: string, query?: string): { html: string; faviconUrl: string | null } {
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
  assertRelatedResults(results, query);

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

export const prepareBingSerpHtml = (source: string, query?: string) => prepareBingSerpDocument(source, query).html;
