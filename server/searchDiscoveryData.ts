import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { DiscoveryItem } from "../src/services/searchDiscovery";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue | null => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
const text = (value: unknown) => typeof value === "string" ? value.replace(/[\ue000\ue001]/g, "").trim().replace(/\s+/g, " ").slice(0, 500) : "";

function publicUrl(value: unknown, image = false): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > 4096) return null;
  try {
    const url = new URL(value, image ? "https://www.bing.com/" : undefined);
    const hosts = image ? ["bing.com", "msn.com", "msn.cn", "img-s-msn-com.akamaized.net"] : ["www.msn.com", "www.msn.cn"];
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && hosts.some(host => url.hostname === host || (image && url.hostname.endsWith(`.${host}`))) ? url.href : null;
  } catch { return null; }
}

/** MSN's zero-input search suggestions, explicitly labeled TopStories by the upstream. */
export function parseMsnRecommendations(payload: unknown): DiscoveryItem[] {
  if (!Array.isArray(payload)) throw new Error("Invalid MSN recommendations");
  const section = payload.map(record).find(item => item?.id === "NewsAutoSuggest" && item.dataType === "TopStories");
  if (typeof section?.data !== "string") throw new Error("Missing MSN TopStories");
  const rows: unknown = JSON.parse(section.data);
  if (!Array.isArray(rows)) throw new Error("Invalid MSN TopStories");
  const items: DiscoveryItem[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const item = record(row);
    const title = text(item?.Name);
    const url = publicUrl(item?.DestUrl);
    if (!title || !url || item?.IsAds || seen.has(url)) continue;
    seen.add(url);
    items.push({ id: url, title, url, imageSrc: publicUrl(item?.ThumbnailUrl, true) });
    if (items.length === 3) break;
  }
  if (!items.length) throw new Error("MSN returned no recommendations");
  return items;
}

const trendsNamespace = "https://trends.google.com/trending/rss";
const trendsParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  isArray: (_name, path) => path === "rss.channel.item" || path === "rss.channel.item.ht:news_item",
});

function googleTrendUrl(value: unknown, image = false): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > 4096) return null;
  try {
    const url = new URL(value);
    const allowed = image
      ? /^encrypted-tbn[0-3]\.gstatic\.com$/.test(url.hostname) && url.pathname === "/images"
      : url.hostname === "trends.google.com";
    return allowed && url.protocol === "https:" && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}

/** Preserve Google Trends' queries, with a readable headline and matching image from a related story. */
export function parseGoogleTrending(xml: string): DiscoveryItem[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error("Invalid Google Trends RSS");
  const rss = record(record(trendsParser.parse(xml))?.rss);
  const channel = record(rss?.channel);
  if (rss?.["@_xmlns:ht"] !== trendsNamespace || (!channel && rss?.channel !== "")) throw new Error("Invalid Google Trends RSS");
  const rows = channel?.item ?? [];
  if (!Array.isArray(rows)) throw new Error("Invalid Google Trends items");
  const items: DiscoveryItem[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const item = record(row);
    const title = text(item?.title);
    const id = title.toLocaleLowerCase("en-US");
    const url = googleTrendUrl(item?.link);
    if (!title || !url || seen.has(id)) continue;
    const relatedNews = Array.isArray(item?.["ht:news_item"]) ? item["ht:news_item"] : [];
    const stories = relatedNews.map(record).filter(news => text(news?.["ht:news_item_title"]));
    const story = stories.find(news => googleTrendUrl(news?.["ht:news_item_picture"], true)) ?? stories[0];
    const headline = text(story?.["ht:news_item_title"]);
    // A displayed headline must keep its own photo, even if the trend has another thumbnail.
    const imageSrc = headline ? googleTrendUrl(story?.["ht:news_item_picture"], true)
      : googleTrendUrl(item?.["ht:picture"], true)
        ?? relatedNews.map(news => googleTrendUrl(record(news)?.["ht:news_item_picture"], true)).find(Boolean) ?? null;
    seen.add(id);
    items.push({ id, title, ...(headline ? { headline } : {}), imageSrc, url });
    if (items.length === 6) break;
  }
  return items;
}
