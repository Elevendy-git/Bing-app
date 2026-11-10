import { parse } from "parse5";
import { resultDestination } from "../src/services/webNavigation";
import { attr, isElement, walk, type PreviewElement, type PreviewNode } from "./previewHtml";

const BING_ORIGIN = "https://www.bing.com";
const stopwords = new Set(("a an the and or but if then than that this these those to of in on for from at by with without about into over under between as "
  + "how what where when why which who whose is are was were be been being am do does did have has had can could will would should may might must "
  + "it its my your our their me you we they he she them us his her not no yes all any some").split(" "));
const excludedTextTags = new Set(["script", "style", "template", "noscript", "input", "textarea", "select", "button", "cite"]);
const hasClass = (node: PreviewElement, name: string) => attr(node, "class")?.split(/\s+/u).includes(name) ?? false;
const queryKey = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
const lexicalKey = (value: string) => value.normalize("NFKD").replace(/\p{Mark}/gu, "").toLowerCase();
const latinWords = (value: string) => lexicalKey(value).match(/\p{Script=Latin}[\p{Script=Latin}\p{Number}]*/gu) ?? [];

export class BingSerpQueryMismatchError extends Error {
  constructor() {
    super("Bing returned results for a different query");
    this.name = "BingSerpQueryMismatchError";
  }
}

function ancestors(node: PreviewNode): PreviewElement[] {
  const result: PreviewElement[] = [];
  let current = "parentNode" in node ? node.parentNode : null;
  while (current) {
    if (isElement(current)) result.push(current);
    current = "parentNode" in current ? current.parentNode : null;
  }
  return result;
}

function hidden(node: PreviewElement) {
  return attr(node, "hidden") !== undefined || attr(node, "aria-hidden")?.toLowerCase() === "true"
    || /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse))\s*(?:!important\s*)?(?:;|$)/iu.test(attr(node, "style") ?? "");
}

function searchForm(node: PreviewElement) {
  if (node.tagName !== "form") return false;
  if (attr(node, "role")?.toLowerCase() === "search" || attr(node, "id") === "sb_form") return true;
  try {
    const action = new URL(attr(node, "action") ?? "", BING_ORIGIN);
    return action.origin === BING_ORIGIN && action.pathname === "/search";
  } catch { return false; }
}

function queryEchoLink(node: PreviewElement) {
  if (node.tagName !== "a") return false;
  try {
    const url = new URL(attr(node, "href") ?? "", BING_ORIGIN);
    return (url.hostname === "bing.com" || url.hostname.endsWith(".bing.com")) && url.pathname === "/search";
  } catch { return false; }
}

/** Only text that could appear in an organic title or snippet can support the check. */
function visibleText(node: PreviewNode): string {
  if (isElement(node) && (excludedTextTags.has(node.tagName) || hidden(node) || queryEchoLink(node))) return "";
  if (node.nodeName === "#text" && "value" in node) return node.value;
  return "childNodes" in node ? node.childNodes.map(visibleText).join(" ") : "";
}

function organicEvidence(row: PreviewElement): string[] {
  const elements = walk(row).filter(isElement).filter(node => !hidden(node) && !ancestors(node).some(hidden));
  const titles = elements.filter(node => node.tagName === "h2" || hasClass(node, "b_title"));
  const snippets = elements.filter(node => node.tagName === "p" || hasClass(node, "b_snippet")
    || attr(node, "class")?.split(/\s+/u).some(name => /^b_lineclamp\d+$/u.test(name)));
  const evidence = [...titles, ...snippets].map(visibleText);
  for (const title of titles) for (const anchor of walk(title).filter(isElement)) {
    if (anchor.tagName !== "a" || hidden(anchor) || ancestors(anchor).some(hidden) || queryEchoLink(anchor)) continue;
    const rawHref = attr(anchor, "href")?.trim();
    if (!rawHref) continue;
    try {
      const href = new URL(rawHref, BING_ORIGIN).href;
      const destination = resultDestination(href);
      if (destination) evidence.push(new URL(destination).hostname);
    } catch { /* Invalid navigation metadata contributes no evidence. */ }
  }
  return evidence;
}

/**
 * Check the source before its search controls are stripped from the preview.
 * The organic-content gate is a conservative lexical sanity check, not a
 * relevance score or semantic proof. Non-Latin/short queries and answer-only
 * pages are left to Bing; chrome, query-echo links and URL paths cannot pass it.
 */
export function assertBingSerpQuery(source: string, query: string): void {
  const elements = walk(parse(source)).filter(isElement);
  for (const node of elements) {
    if (node.tagName !== "input" && node.tagName !== "textarea") continue;
    const recognized = attr(node, "id") === "sb_form_q"
      || attr(node, "name") === "q" && ancestors(node).some(searchForm);
    if (!recognized) continue;
    const value = node.tagName === "textarea" ? node.childNodes.map(child => child.nodeName === "#text" && "value" in child ? child.value : "").join("") : attr(node, "value") ?? "";
    if (queryKey(value) !== queryKey(query)) throw new BingSerpQueryMismatchError();
  }

  const results = elements.find(node => attr(node, "id") === "b_results");
  if (!results) return; // Structural availability is checked by the preview sanitizer.
  if (hidden(results) || ancestors(results).some(hidden)) throw new Error("Bing result document is not visible");
  const significant = new Set(latinWords(query).filter(word => word.length >= 3 && !stopwords.has(word)));
  if (!significant.size) return;
  const rows = walk(results).filter(isElement).filter(node => node.tagName === "li" && hasClass(node, "b_algo")
    && !hidden(node) && !ancestors(node).some(hidden));
  if (!rows.length) return;
  const actualWords = new Set(rows.flatMap(organicEvidence).flatMap(latinWords));
  if (![...significant].some(word => actualWords.has(word))) throw new BingSerpQueryMismatchError();
}
