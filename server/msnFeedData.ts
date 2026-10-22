import { MSN_FEED_PAGE_LIMIT, type MsnArticle } from "../src/services/msnFeed";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue | null => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
const text = (value: unknown, limit: number) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, limit) : "";

function focalPosition(image: RecordValue | null | undefined): string | undefined {
  const region = record(image?.focalRegion);
  const dimensions = [image?.width, image?.height, region?.x1, region?.x2, region?.y1, region?.y2];
  if (!dimensions.every(value => typeof value === "number" && Number.isFinite(value))) return undefined;
  const [width, height, x1, x2, y1, y2] = dimensions as number[];
  if (width <= 0 || height <= 0) return undefined;
  const percent = (center: number, size: number) => Math.max(0, Math.min(100, center / size * 100)).toFixed(2);
  return `${percent((x1 + x2) / 2, width)}% ${percent((y1 + y2) / 2, height)}%`;
}

function safeUrl(value: unknown, media = false): string | null {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const url = new URL(value);
    const hosts = media
      ? ["msn.com", "msn.cn", "bing.com", "img-s-msn-com.akamaized.net", "img-s-msn-cn.akamaized.net"]
      : ["www.msn.com", "www.msn.cn"];
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443")
      && hosts.some(host => url.hostname === host || (media && url.hostname.endsWith(`.${host}`))) ? url.href : null;
  } catch { return null; }
}

/** Read only article cards; ignore ads, widgets, video controls and personalization metadata. */
export function parseMsnArticles(payload: unknown, allowEmpty = false): MsnArticle[] {
  const root = record(payload);
  if (!Array.isArray(root?.sections)) throw new Error("Invalid MSN feed");
  const items: MsnArticle[] = [];
  const seen = new Set<string>();
  const visit = (value: unknown, depth = 0) => {
    const card = record(value);
    if (!card || depth > 4 || items.length >= MSN_FEED_PAGE_LIMIT) return;
    if (card.type === "article") {
      const id = text(card.id, 128);
      const title = text(card.title, 500);
      const url = safeUrl(card.url);
      const image = (Array.isArray(card.images) ? card.images.map(record) : []).find(image => safeUrl(image?.url, true));
      const imageSrc = safeUrl(image?.url, true);
      const provider = record(card.provider);
      const publisher = text(provider?.name, 160);
      const publishedAt = text(card.publishedDateTime, 64);
      if (id && title && url && imageSrc && publisher && Number.isFinite(Date.parse(publishedAt)) && !seen.has(id)) {
        seen.add(id);
        items.push({ id, title, url, imageSrc, imageAlt: text(image?.title, 500) || title, publisher, publishedAt,
          imagePosition: focalPosition(image),
          publisherLogoSrc: safeUrl(record(provider?.lightSquareLogo)?.url, true) || safeUrl(provider?.logoUrl, true) });
      }
    } else if (Array.isArray(card.subCards) && card.type !== "nativead" && card.type !== "ad") {
      card.subCards.forEach(child => visit(child, depth + 1));
    }
  };
  for (const section of root.sections) {
    const cards = record(section)?.cards;
    if (Array.isArray(cards)) cards.forEach(card => visit(card));
  }
  if (!items.length && !allowEmpty) throw new Error("MSN returned no usable articles");
  return items;
}
