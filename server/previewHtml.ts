import type { DefaultTreeAdapterMap } from "parse5";
import { webUrl } from "../src/services/webNavigation";

export type PreviewNode = DefaultTreeAdapterMap["node"];
export type PreviewElement = DefaultTreeAdapterMap["element"];

const blocked = new Set(["script", "iframe", "object", "embed", "base", "meta", "form", "input", "textarea", "select", "foreignObject", "animate", "set"]);
export const isElement = (node: PreviewNode): node is PreviewElement => "tagName" in node;
export const attr = (node: PreviewElement, name: string) => node.attrs.find(item => item.name === name)?.value;
export const walk = (node: PreviewNode): PreviewNode[] => [node, ...("childNodes" in node ? node.childNodes.flatMap(walk) : [])];

/** Local SVG paint/shape references belong to this document, not the upstream page. */
function localFragment(value: string): string | undefined {
  const fragment = value.trim();
  return /^#[^\s\u0000-\u001f\u007f"'()<>\\]+$/u.test(fragment) ? fragment : undefined;
}

function setAttr(node: PreviewElement, name: string, value: string) {
  node.attrs = node.attrs.filter(item => item.name !== name);
  node.attrs.push({ name, value });
}

/** Resource policies follow the source page's protocol; navigation links use webUrl separately. */
export function resourceUrl(value: string, image: boolean, base: string): string | undefined {
  if (image && /^data:image\/(?:png|gif|jpe?g|webp|svg\+xml);/i.test(value)) return value;
  try {
    const url = new URL(value, base);
    return (url.protocol === "https:" || url.protocol === "http:" && new URL(base).protocol === "http:") && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function cssUrls(css: string, base: string) {
  return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_, _quote: string, value: string) => {
    const url = localFragment(value) ?? resourceUrl(value, true, base);
    return url ? `url(${JSON.stringify(url)})` : "none";
  });
}

/** Remove executable content and hand normal links to the app's IAB navigation bridge. */
export function cleanPreviewNode(node: PreviewNode, base: string) {
  if (isElement(node)) {
    node.attrs = node.attrs.filter(({ name }) => !/^on/i.test(name)
      && !["srcdoc", "srcset", "action", "formaction", "ping", "nonce", "autofocus", "contenteditable", "data-iab-href", "download"].includes(name));
    const fragment = node.tagName === "a" && attr(node, "href")?.startsWith("#") ? attr(node, "href") : undefined;
    for (const item of [...node.attrs]) {
      if (item.name === "style") item.value = cssUrls(item.value, base);
      if (item.name === "href" || item.name === "src") {
        const svgReference = node.namespaceURI === "http://www.w3.org/2000/svg" && item.name === "href" ? localFragment(item.value) : undefined;
        const url = svgReference ?? (node.tagName === "a" && item.name === "href" ? webUrl(item.value, base) : resourceUrl(item.value, item.name === "src", base));
        if (url) item.value = url;
        else node.attrs = node.attrs.filter(candidate => candidate !== item);
      }
    }
    if (node.tagName === "img") {
      const lazySrc = attr(node, "data-src") ?? attr(node, "data-src-hq");
      const url = lazySrc && resourceUrl(lazySrc, true, base);
      if (url) setAttr(node, "src", url);
      setAttr(node, "referrerpolicy", "no-referrer");
    }
    if (node.tagName === "a") {
      const href = attr(node, "href");
      if (href && !fragment) setAttr(node, "data-iab-href", href);
      setAttr(node, "href", fragment ?? "#");
      setAttr(node, "target", "_self");
      setAttr(node, "rel", "noopener noreferrer");
    }
    // Snapshot controls retain their artwork; only normal links work without remote scripts.
    if (node.tagName === "button") setAttr(node, "inert", "");
  }
  if ("childNodes" in node) {
    node.childNodes = node.childNodes.filter(child => !isElement(child) || !blocked.has(child.tagName));
    node.childNodes.forEach(child => cleanPreviewNode(child, base));
  }
}
