import { parse, serializeOuter, type DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
const BING_ORIGIN = "https://www.bing.com";
const blocked = new Set(["script", "iframe", "object", "embed", "base", "meta", "form", "input", "textarea", "select", "foreignObject", "animate", "set"]);
const isElement = (node: Node): node is Element => "tagName" in node;
const attr = (node: Element, name: string) => node.attrs.find((item) => item.name === name)?.value;
const setAttr = (node: Element, name: string, value: string) => {
  node.attrs = node.attrs.filter((item) => item.name !== name);
  node.attrs.push({ name, value });
};
const walk = (node: Node): Node[] => [node, ...("childNodes" in node ? node.childNodes.flatMap(walk) : [])];

function resourceUrl(value: string, image = false): string | undefined {
  if (image && /^data:image\/(?:png|gif|jpe?g|webp|svg\+xml);/i.test(value)) return value;
  try {
    const url = new URL(value, BING_ORIGIN);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

function cssUrls(css: string) {
  return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_, _quote: string, value: string) => {
    const url = resourceUrl(value, true);
    return url ? `url(${JSON.stringify(url)})` : "none";
  });
}

function clean(node: Node) {
  if (isElement(node)) {
    node.attrs = node.attrs.filter(({ name }) => !/^on/i.test(name)
      && !["srcdoc", "srcset", "action", "formaction", "ping", "nonce", "autofocus", "contenteditable"].includes(name));
    for (const item of [...node.attrs]) {
      if (item.name === "style") item.value = cssUrls(item.value);
      if (item.name === "href" || item.name === "src") {
        const url = resourceUrl(item.value, item.name === "src");
        if (url) item.value = url;
        else node.attrs = node.attrs.filter((candidate) => candidate !== item);
      }
    }
    if (node.tagName === "img") {
      const lazySrc = attr(node, "data-src") ?? attr(node, "data-src-hq");
      const url = lazySrc && resourceUrl(lazySrc, true);
      if (url) setAttr(node, "src", url);
      setAttr(node, "referrerpolicy", "no-referrer");
    }
    if (node.tagName === "a") {
      setAttr(node, "target", "_blank");
      setAttr(node, "rel", "noopener noreferrer");
    }
    // Snapshot controls retain Bing's artwork; only normal links work without its scripts.
    if (node.tagName === "button") setAttr(node, "inert", "");
  }
  if ("childNodes" in node) {
    node.childNodes = node.childNodes.filter((child) => !isElement(child) || !blocked.has(child.tagName));
    node.childNodes.forEach(clean);
  }
}

/** Preserve Bing's mobile HTML/CSS, excluding its site search chrome and executable code. */
export function prepareBingSerpHtml(source: string): string {
  const document = parse(source);
  const elements = walk(document).filter(isElement);
  const content = elements.find((node) => attr(node, "id") === "b_content");
  const results = elements.find((node) => attr(node, "id") === "b_results");
  const scope = elements.find((node) => attr(node, "id") === "ScopeRow");
  const body = elements.find((node) => node.tagName === "body");
  if (!content || !results || !results.childNodes.some(isElement)) throw new Error("Bing did not return a usable result document");

  const sheets = elements.filter((node) => node.tagName === "style" || (node.tagName === "link" && attr(node, "rel") === "stylesheet"));
  for (const sheet of sheets) {
    clean(sheet);
    if (sheet.tagName === "style") for (const child of sheet.childNodes) if (child.nodeName === "#text" && "value" in child) child.value = cssUrls(child.value);
  }
  clean(content);
  if (scope) clean(scope);
  const bodyId = attr(body!, "id") ?? "bpage";
  const bodyClass = attr(body!, "class") ?? "";
  // Attributes originate in Bing but still need HTML escaping at the composition boundary.
  const escape = (value: string) => value.replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c]!);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src https: 'unsafe-inline'; font-src https: data:; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
${sheets.map((sheet) => serializeOuter(sheet)).join("\n")}
<style>html,body{margin:0!important;min-width:0!important;width:100%!important}body{padding:0!important}#b_header{position:static!important;top:auto!important;height:auto!important;margin:0!important;padding:0!important}#ScopeRow{position:static!important;top:auto!important;margin-top:0!important}#b_content{padding-top:0!important}::-webkit-scrollbar{display:none}</style>
</head><body id="${escape(bodyId)}" class="${escape(bodyClass)}">${scope ? `<header id="b_header">${serializeOuter(scope)}</header>` : ""}${serializeOuter(content)}</body></html>`;
}
