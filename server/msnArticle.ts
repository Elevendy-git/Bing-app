import { fetchPublicJson, publicWebUrl } from "./webPageFetch";

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const escape = (value: string) => value.replace(/[&<>"']/g, character =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const text = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";

/** MSN's public page is a script-only shell. Load its published article body instead. */
export function msnArticleRequest(value: string) {
  const url = publicWebUrl(value);
  if (url.protocol !== "https:" || url.hostname !== "www.msn.com") return null;
  const match = url.pathname.match(/^\/([a-z]{2}-[a-z]{2})\/.+\/ar-([a-z0-9]{1,64})\/?$/i);
  if (!match) return null;
  const locale = match[1].toLowerCase(), id = match[2];
  return { sourceUrl: url.href, id, locale, endpoint: `https://assets.msn.com/content/view/v2/Detail/${locale}/${id}` };
}

export async function fetchMsnArticle(request: NonNullable<ReturnType<typeof msnArticleRequest>>, signal: AbortSignal) {
  const article = record(await fetchPublicJson(request.endpoint, signal));
  const title = text(article?.title, 500);
  const body = typeof article?.body === "string" ? article.body.trim() : "";
  if (!article || article.type !== "article" || article.id !== request.id
    || text(article.locale, 16).toLowerCase() !== request.locale
    || article.renderingRestriction !== 0 || !title || !body || body.length > 3 * 1024 * 1024) throw new Error("Unavailable MSN article");
  const publisher = text(record(article.provider)?.name, 160);
  const authors = (Array.isArray(article.authors) ? article.authors : []).map(author => text(record(author)?.name, 160)).filter(Boolean).join(", ");
  const publishedAt = text(article.publishedDateTime, 64);
  const date = Number.isFinite(Date.parse(publishedAt))
    ? new Date(publishedAt).toLocaleDateString(request.locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : "";
  const image = (Array.isArray(article.imageResources) ? article.imageResources : []).map(record)
    .find(image => typeof image?.url === "string" && /^https:\/\//i.test(image.url));
  const hero = image && !body.includes(String(image.url)) ? `<figure><img src="${escape(String(image.url))}" alt="${escape(text(image.title, 500))}">
    <figcaption>${escape(text(image.caption, 1000))}</figcaption></figure>` : "";
  // The shared HTML sanitizer still owns all remote markup, assets and links.
  // This is a reading preview of published content, not MSN's interactive page.
  const source = `<!doctype html><html lang="${request.locale}"><head><title>${escape(title)}</title>
    <style>body{background:#fff;color:#202020;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}article{padding:24px 20px 40px;overflow-wrap:anywhere}h1{margin:0 0 16px;font-size:28px;line-height:1.2;letter-spacing:-.4px}p,li{font-size:18px;line-height:1.6}p{margin:20px 0}article>header p{margin:6px 0;color:#626262;font-size:13px;line-height:1.5}figure{margin:24px 0}figure img{display:block;width:100%;border-radius:8px}figcaption{margin-top:8px;color:#626262;font-size:12px;line-height:1.5}a{color:#1769c2}h2,h3{line-height:1.3}</style>
    </head><body><article><header><h1>${escape(title)}</h1><p>${escape([publisher, authors, date].filter(Boolean).join(" · "))}</p></header>
    ${hero}${body}</article></body></html>`;
  return { source, sourceUrl: request.sourceUrl };
}
