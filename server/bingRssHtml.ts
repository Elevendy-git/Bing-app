import { XMLParser, XMLValidator } from "fast-xml-parser";
import { parseFragment } from "parse5";
import { resultDestination, webUrl } from "../src/services/webNavigation";
import { attr, isElement, type PreviewNode } from "./previewHtml";
import { renderSearchResultsDocument, type SearchResultRow } from "./searchFallbackHtml";

const MAX_XML_BYTES = 4 * 1024 * 1024;
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value)
  ? value as Record<string, unknown> : null;

/** Anonymous RSS recovery keeps the requested query intact, without forced markets. */
export const bingRssRequestUrl = (query: string) => `https://www.bing.com/search?${new URLSearchParams({ format: "rss", q: query })}`;

function visibleText(node: PreviewNode): string {
  if (node.nodeName === "#text" && "value" in node) return node.value;
  if (isElement(node) && (["script", "style", "template", "noscript", "iframe", "object", "embed", "input", "textarea"].includes(node.tagName)
    || attr(node, "hidden") !== undefined || attr(node, "aria-hidden") === "true"
    || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attr(node, "style") ?? ""))) return "";
  return "childNodes" in node ? node.childNodes.map(visibleText).join(" ") : "";
}

const plainText = (value: unknown, limit: number) => typeof value === "string"
  ? visibleText(parseFragment(value)).replace(/\s+/g, " ").trim().slice(0, limit) : "";

/** Parse real Bing feed entries; no DTDs, external entities, invented results or
 * permissive XML recovery. Shared rendering still rejects unrelated documents.
 */
export function prepareBingRssDocument(source: string, query: string): { html: string; faviconUrl: null; title: string } {
  const declarations = source.toUpperCase();
  if (Buffer.byteLength(source, "utf8") > MAX_XML_BYTES || declarations.includes("<!DOCTYPE") || declarations.includes("<!ENTITY")) {
    throw new Error("Unsupported search feed");
  }
  if (XMLValidator.validate(source, { allowBooleanAttributes: false }) !== true) throw new Error("Invalid search feed XML");
  const parser = new XMLParser({
    ignoreAttributes: true, parseTagValue: false, trimValues: true, maxNestedTags: 32,
    isArray: (_name, path) => path === "rss.channel.item",
    // Standard XML entities remain readable. DTD/entity declarations are
    // rejected before parsing; these limits also bound ordinary expansions.
    processEntities: { enabled: true, maxTotalExpansions: 10000, maxExpandedLength: MAX_XML_BYTES },
  });
  const payload: unknown = parser.parse(source);
  const items = record(record(record(payload)?.rss)?.channel)?.item;
  if (!Array.isArray(items)) throw new Error("Search feed returned no usable results");
  const seen = new Set<string>();
  const rows: SearchResultRow[] = [];
  for (const value of items) {
    const item = record(value);
    const receivedUrl = item && typeof item.link === "string" ? webUrl(item.link) : null;
    const url = receivedUrl && resultDestination(receivedUrl);
    const title = plainText(item?.title, 512);
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    rows.push({ url, title, summary: plainText(item?.description, 2000) });
    if (rows.length === 10) break;
  }
  return renderSearchResultsDocument(rows, query, "Bing");
}
