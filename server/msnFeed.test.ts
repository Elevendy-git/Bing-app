// @vitest-environment node
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMsnFeedHandler } from "./msnFeed";
import { parseMsnArticles } from "./msnFeedData";

const article = (id = "story-1") => ({ id, type: "article", title: `News ${id}`,
  url: `https://www.msn.com/en-us/news/world/article/ar-${id}`, publishedDateTime: "2026-10-21T06:00:00Z",
  provider: { name: "Publisher", logoUrl: "https://img-s-msn-com.akamaized.net/logo.png" },
  images: [{ url: "https://th.bing.com/image.jpg", title: "News image", width: 1000, height: 2000,
    focalRegion: { x1: 400, x2: 600, y1: 200, y2: 600 } }],
});
const payload = (...cards: unknown[]) => ({ sections: [{ cards }] });
const upstream = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
let server: Server;
let origin: string;

beforeEach(async () => {
  vi.stubGlobal("fetch", vi.fn(async () => upstream(payload(article()))));
  const handler = createMsnFeedHandler();
  server = createServer((req, res) => { void handler(req, res, () => { res.writeHead(404); res.end("{}"); }); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function call(path = "/api/msn-feed", method = "GET") {
  return new Promise<{ status: number; body: Record<string, unknown>; headers: Record<string, unknown> }>((resolve, reject) => {
    const req = request(`${origin}${path}`, { method, headers: { Cookie: "user=private", Authorization: "private" } }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: JSON.parse(body), headers: res.headers }));
    });
    req.on("error", reject);
    req.end();
  });
}

describe("MSN feed integration", () => {
  it("maps real article metadata, walks nested cards and excludes duplicate, ad and video content", () => {
    const items = parseMsnArticles(payload({ type: "infopane", subCards: [article(), article(),
      { ...article("video"), type: "video" }, { type: "nativead", subCards: [article("ad")] }] }, article("second")));
    expect(items.map(item => item.id)).toEqual(["story-1", "second"]);
    expect(items[0]).toMatchObject({ publisher: "Publisher", title: "News story-1", publishedAt: "2026-10-21T06:00:00Z",
      imageSrc: "https://th.bing.com/image.jpg", imagePosition: "50.00% 20.00%",
      publisherLogoSrc: "https://img-s-msn-com.akamaized.net/logo.png" });
  });

  it("skips unsafe or incomplete stories, caps the feed and never invents missing logos", () => {
    const withoutLogo = { ...article("plain"), provider: { name: "No logo publisher" } };
    const items = parseMsnArticles(payload(
      { ...article("script"), url: "javascript:alert(1)" }, { ...article("local"), images: [{ url: "https://localhost/private" }] },
      { ...article("spoof"), url: "https://www.msn.com.evil.test/news" }, { ...article("date"), publishedDateTime: "invalid" },
      { ...article("provider"), provider: null }, withoutLogo, ...Array.from({ length: 110 }, (_, i) => article(String(i)))));
    expect(items).toHaveLength(100);
    expect(items[0]).toMatchObject({ id: "plain", publisherLogoSrc: null });
    expect(() => parseMsnArticles(payload())).toThrow();
    expect(() => parseMsnArticles({ items: [article()] })).toThrow();
  });

  it("uses a fixed upstream, strips identity and shares cached public news across requests", async () => {
    const first = await call("/api/msn-feed?url=https://example.com&User=private");
    const second = await call();
    expect(first.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(first.body).toMatchObject({ source: "msn", market: "en-us" });
    expect(first.headers["set-cookie"]).toBeUndefined();
    expect(JSON.stringify(first.body)).not.toContain("apikey");
    expect(fetch).toHaveBeenCalledOnce();
    const [target, options] = vi.mocked(fetch).mock.calls[0];
    const url = new URL(String(target));
    expect(url.origin).toBe("https://assets.msn.com");
    expect(url.pathname).toBe("/service/news/feed/pages/weblayout");
    expect(url.searchParams.has("User")).toBe(false);
    expect(options).toMatchObject({ headers: { Accept: "application/json" }, redirect: "error" });
  });

  it("refreshes after the five-minute server cache expires", async () => {
    const time = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(time);
    const first = await call();
    clock.mockReturnValue(Date.parse(String(first.body.fetchedAt)) + 300_001);
    await call();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("follows the returned continuation, caches each page and keeps upstream identity off the client", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(upstream({ ...payload(article()),
      nextPageUrl: "https://api.msn.com/news/feed/pages/weblayout?newsSkip=41&%24skip=1&apikey=public&User=anonymous&activityId=generated" }))
      .mockResolvedValueOnce(upstream(payload(article("page-2"))));
    const first = await call();
    expect(first.body.nextCursor).toEqual(expect.any(String));
    expect(JSON.stringify(first.body)).not.toMatch(/apikey|anonymous|generated/);
    const path = `/api/msn-feed?cursor=${first.body.nextCursor}`;
    const [second, concurrent] = await Promise.all([call(path), call(path)]);
    expect(second.body).toEqual(concurrent.body);
    expect(second.body).toMatchObject({ items: [{ id: "page-2" }], nextCursor: null });
    expect((await call()).body).toEqual(first.body);
    expect(fetch).toHaveBeenCalledTimes(2);
    const target = new URL(String(vi.mocked(fetch).mock.calls[1][0]));
    expect(target.origin).toBe("https://api.msn.com");
    expect(target.searchParams.get("newsSkip")).toBe("41");
    expect(target.searchParams.get("$skip")).toBe("1");
    expect(target.searchParams.has("User")).toBe(false);
    expect(target.searchParams.has("activityId")).toBe(false);
  });

  it("allows an empty continuation page to carry on without replaying the first page", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(upstream({ ...payload(article()),
      nextPageUrl: "https://api.msn.com/news/feed/pages/weblayout?newsSkip=12" }))
      .mockResolvedValueOnce(upstream({ ...payload(), nextPageUrl: "https://api.msn.com/news/feed/pages/weblayout?newsSkip=24" }));
    const first = await call();
    const second = await call(`/api/msn-feed?cursor=${first.body.nextCursor}`);
    expect(second).toMatchObject({ status: 200, body: { items: [], nextCursor: expect.any(String) } });
  });

  it.each(["https://localhost/private", "https://api.msn.com.evil.test/news/feed/pages/weblayout", "https://api.msn.com/account"])(
    "does not follow an unsupported next-page URL %s", async nextPageUrl => {
      vi.mocked(fetch).mockResolvedValueOnce(upstream({ ...payload(article()), nextPageUrl }));
      expect((await call()).body.nextCursor).toBeNull();
      expect((await call("/api/msn-feed?cursor=https://localhost/private")).status).toBe(410);
      expect(fetch).toHaveBeenCalledOnce();
    });

  it("ignores unrelated routes and non-GET requests", async () => {
    expect((await call("/unrelated")).status).toBe(404);
    expect((await call("/api/msn-feed", "POST")).status).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["network", "http", "invalid", "oversize"])("returns an honest failure for %s and can retry", async failure => {
    if (failure === "network") vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    if (failure === "http") vi.mocked(fetch).mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    if (failure === "invalid") vi.mocked(fetch).mockResolvedValueOnce(upstream({ sections: [] }));
    if (failure === "oversize") vi.mocked(fetch).mockResolvedValueOnce(upstream("x".repeat(2 * 1024 * 1024)));
    expect(await call()).toMatchObject({ status: 502, body: { error: "MSN news is unavailable" } });
    expect((await call()).status).toBe(200);
  });
});
