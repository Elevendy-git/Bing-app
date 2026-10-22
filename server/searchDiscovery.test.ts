// @vitest-environment node
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSearchDiscoveryHandler } from "./searchDiscovery";
import { parseGoogleTrending, parseMsnRecommendations } from "./searchDiscoveryData";

const story = (id: string) => ({ Name: `Story ${id}`, ThumbnailUrl: `https://bing.com/th?id=${id}`, DestUrl: `https://www.msn.com/en-us/news/ar-${id}` });
const msn = (rows = [story("one"), story("two"), story("three"), story("four")]) => [{ id: "NewsAutoSuggest", dataType: "TopStories", data: JSON.stringify(rows) }];
const trend = (title: string, image = "https://encrypted-tbn0.gstatic.com/images?q=tbn:topic") =>
  `<item><title>${title}</title><link>https://trends.google.com/trending/rss?geo=US</link><ht:picture>${image}</ht:picture></item>`;
const google = (rows: string[] = []) => `<?xml version="1.0"?><rss xmlns:ht="https://trends.google.com/trending/rss"><channel>${rows.join("")}</channel></rss>`;
const reply = (data: unknown) => new Response(JSON.stringify(data), { headers: { "Content-Type": "text/html; charset=utf-8" } });
const rssReply = (xml: string) => new Response(xml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
let server: Server;
let origin: string;
beforeEach(async () => {
  vi.stubGlobal("fetch", vi.fn(async (target: URL) => target.hostname === "assets.msn.com" ? reply(msn()) : rssReply(google())));
  const handler = createSearchDiscoveryHandler();
  server = createServer((req, res) => { void handler(req, res, () => { res.writeHead(404); res.end("{}"); }); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});
function call(section: string, method = "GET") {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const req = request(`${origin}/api/search-discovery?section=${section}`, {
      method, headers: { Cookie: "user=private", Authorization: "private" },
    }, res => {
      let body = ""; res.setEncoding("utf8"); res.on("data", chunk => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: JSON.parse(body) }));
    });
    req.on("error", reject); req.end();
  });
}

describe("Search discovery data", () => {
  it("takes three real MSN suggestions in source order and rejects unsafe/ad/duplicate rows", () => {
    expect(parseMsnRecommendations(msn())).toEqual([story("one"), story("two"), story("three")].map(item => ({
      id: item.DestUrl, url: item.DestUrl, title: item.Name, imageSrc: item.ThumbnailUrl,
    })));
    const items = parseMsnRecommendations(msn([{ ...story("bad"), DestUrl: "javascript:alert(1)" },
      { ...story("ad"), IsAds: true } as ReturnType<typeof story>, story("one"), story("one"),
      { ...story("plain"), ThumbnailUrl: "https://localhost/private" }]));
    expect(items.map(item => item.title)).toEqual(["Story one", "Story plain"]);
    expect(items[1].imageSrc).toBeNull();
    expect(() => parseMsnRecommendations([{ id: "NewsAutoSuggest", dataType: "Different", data: "[]" }])).toThrow();
  });

  it("parses RSS terms and their own thumbnails, preserves source order and removes duplicate queries", () => {
    const image = "https://encrypted-tbn2.gstatic.com/images?q=tbn:first&amp;w=120";
    const items = parseGoogleTrending(google([
      trend("First &amp; second", image), trend("first &amp; second"),
      trend("<![CDATA[Next topic]]>", "https://evil.example/tracker"),
      trend("2026", ""), trend(""),
    ]));
    expect(items.map(item => item.title)).toEqual(["First & second", "Next topic", "2026"]);
    expect(items.map(item => item.imageSrc)).toEqual(["https://encrypted-tbn2.gstatic.com/images?q=tbn:first&w=120", null, null]);
    expect(items[0].url).toBe("https://trends.google.com/trending/rss?geo=US");
    expect(parseGoogleTrending(google())).toEqual([]);
    expect(parseGoogleTrending(google([trend("Only item")]))).toHaveLength(1);
  });

  it("preserves the original query and pairs its related headline with that story's own photo", () => {
    const news = "<ht:news_item><ht:news_item_title>News headline</ht:news_item_title><ht:news_item_picture>https://encrypted-tbn1.gstatic.com/images?q=tbn:related</ht:news_item_picture></ht:news_item>";
    const rows = [trend("Trend").replace("</item>", `${news}</item>`), `<item>${news}</item>`];
    expect(parseGoogleTrending(google(rows))).toEqual([{
      id: "trend", title: "Trend", headline: "News headline", imageSrc: "https://encrypted-tbn1.gstatic.com/images?q=tbn:related",
      url: "https://trends.google.com/trending/rss?geo=US",
    }]);
  });

  it("prefers a complete headline-photo pair and does not borrow a different story's thumbnail", () => {
    const noPhoto = "<ht:news_item><ht:news_item_title>Headline without a photo</ht:news_item_title></ht:news_item>";
    const complete = "<ht:news_item><ht:news_item_title><![CDATA[Team wins & reaches final]]></ht:news_item_title><ht:news_item_picture>https://encrypted-tbn2.gstatic.com/images?q=tbn:team</ht:news_item_picture></ht:news_item>";
    const addNews = (news: string) => google([trend("team").replace("</item>", `${news}</item>`)]);
    expect(parseGoogleTrending(addNews(noPhoto + complete))[0]).toMatchObject({ title: "team", headline: "Team wins & reaches final", imageSrc: "https://encrypted-tbn2.gstatic.com/images?q=tbn:team" });
    expect(parseGoogleTrending(addNews(noPhoto))[0]).toMatchObject({ title: "team", headline: "Headline without a photo", imageSrc: null });
  });

  it("rejects malformed, foreign or entity-bearing XML and unsafe URLs", () => {
    for (const xml of ["<rss><channel></rss>", "<html>Challenge</html>", google().replace("https://trends.google.com/trending/rss", "https://other.example"),
      `<!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///private">]>${google([trend("&xxe;")])}`]) {
      expect(() => parseGoogleTrending(xml)).toThrow();
    }
    for (const image of ["http://encrypted-tbn0.gstatic.com/images?q=a", "https://encrypted-tbn0.gstatic.com.evil.example/images?q=a",
      "https://user@encrypted-tbn0.gstatic.com/images?q=a", "https://encrypted-tbn0.gstatic.com:8443/images?q=a", "data:image/png;base64,a"]) {
      expect(parseGoogleTrending(google([trend("Trend", image)]))[0].imageSrc).toBeNull();
    }
    expect(parseGoogleTrending(google([trend("Bad link").replace("<link>https://trends.google.com/trending/rss?geo=US</link>", "<link>javascript:alert(1)</link>")]))).toEqual([]);
  });

  it("fetches six unique Google trend queries with their supplied thumbnails", async () => {
    const rows = Array.from({ length: 8 }, (_, index) => trend(`Trend ${index + 1}`, `https://encrypted-tbn0.gstatic.com/images?q=tbn:${index + 1}`));
    vi.mocked(fetch).mockResolvedValueOnce(rssReply(google(rows)));
    const result = await call("trending&q=private");
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ source: "google-trends", items: rows.slice(0, 6).map((_, index) => ({
      id: `trend ${index + 1}`, title: `Trend ${index + 1}`, imageSrc: `https://encrypted-tbn0.gstatic.com/images?q=tbn:${index + 1}`,
      url: "https://trends.google.com/trending/rss?geo=US",
    })) });
    const target = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(target.origin + target.pathname).toBe("https://trends.google.com/trending/rss");
    expect(Object.fromEntries(target.searchParams)).toEqual({ geo: "US" });
  });

  it("fetches and caches each source independently without forwarding identity or user queries", async () => {
    const [first, duplicate, trending] = await Promise.all([call("recommendations&query=private"), call("recommendations"), call("trending")]);
    expect(first.status).toBe(200);
    expect(first.body).toEqual(duplicate.body);
    expect(trending.body).toMatchObject({ section: "trending", source: "google-trends", items: [] });
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [target, options] of vi.mocked(fetch).mock.calls) {
      expect(new URL(String(target)).searchParams.has("query")).toBe(false);
      expect(options).toMatchObject({ headers: { Accept: target.toString().includes("assets.msn.com") ? "application/json" : "application/rss+xml, application/xml, text/xml" }, redirect: "error" });
    }
    expect(JSON.stringify(first.body)).not.toMatch(/apikey|private|cvid/);
    await call("recommendations"); await call("trending");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("refreshes an empty trend response after a short cache window", async () => {
    const result = await call("trending");
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(String(result.body.fetchedAt)) + 30_001);
    await call("trending");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps source failures independent and permits retry", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    expect((await call("recommendations")).status).toBe(502);
    expect((await call("trending")).status).toBe(200);
    expect((await call("recommendations")).status).toBe(200);
    expect((await call("other")).status).toBe(400);
    expect((await call("trending", "POST")).status).toBe(405);
  });
});
