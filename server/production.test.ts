// @vitest-environment node
import { request, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProductionServer, productionConfig, type ProductionConfig } from "./production";
import { fetchWebPage } from "./webPageFetch";

vi.mock("./webPageFetch", async original => ({
  ...await original<typeof import("./webPageFetch")>(), fetchWebPage: vi.fn(),
}));

const allowed = "https://elevendy-git.github.io";
const serp = '<main id="b_content"><ol id="b_results"><li><a href="https://example.com">Original Bing result</a></li></ol></main>';
const feed = { sections: [{ cards: [{ id: "AA123", type: "article", title: "Published news article",
  url: "https://www.msn.com/en-us/news/world/story/ar-AA123", publishedDateTime: "2026-11-09T06:00:00Z",
  provider: { name: "News publisher" }, images: [{ url: "https://th.bing.com/news.jpg" }] }] }] };
let server: Server | undefined;
let origin: string;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.hostname === "api.bing.com") return new Response(JSON.stringify(["weather", ["weather forecast"]]), { headers: { "Content-Type": "application/json" } });
    if (url.hostname === "assets.msn.com") return new Response(JSON.stringify(feed), { headers: { "Content-Type": "application/json" } });
    return new Response(serp, { headers: { "Content-Type": "text/html" } });
  }));
  vi.mocked(fetchWebPage).mockReset().mockResolvedValue({ sourceUrl: "https://example.com/article",
    source: "<title>Original article</title><p>Published article content returned by the remote website.</p>" });
});

afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>(resolve => server!.close(() => resolve()));
    server = undefined;
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function start(overrides: Partial<ProductionConfig> = {}) {
  server = createProductionServer({ ...productionConfig({}), ...overrides });
  await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function call(path: string, { method = "GET", headers = {}, body }: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new Promise<{ status: number; body: unknown; headers: IncomingHttpHeaders }>((resolve, reject) => {
    const req = request(origin + path, { method, headers }, res => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: text ? JSON.parse(text) : null, headers: res.headers }));
    });
    req.on("error", reject);
    req.end(body);
  });
}

describe("standalone public API configuration", () => {
  it("uses explicit Pages/local origins and accepts deployment overrides without wildcard CORS", () => {
    expect(productionConfig({})).toEqual({ port: 3000, allowedOrigins: [allowed, "http://localhost:5174", "http://127.0.0.1:5174"], rateLimitRequests: 120, maxConcurrent: 8 });
    expect(productionConfig({ PORT: "10000", API_ALLOWED_ORIGINS: " https://preview.example.com/,https://preview.example.com ", API_RATE_LIMIT_REQUESTS: "240", API_MAX_CONCURRENT: "4" }))
      .toEqual({ port: 10000, allowedOrigins: ["https://preview.example.com"], rateLimitRequests: 240, maxConcurrent: 4 });
  });

  it.each(["*", "", "https://example.com/path", "https://user:pass@example.com", "file:///tmp/"])("rejects unsafe origin configuration %s", value => {
    expect(() => productionConfig({ API_ALLOWED_ORIGINS: value })).toThrow();
  });

  it("fails startup for invalid ports or unbounded limit values", () => {
    expect(() => productionConfig({ PORT: "0" })).toThrow("PORT");
    expect(() => productionConfig({ PORT: "65536" })).toThrow("PORT");
    expect(() => productionConfig({ API_RATE_LIMIT_REQUESTS: "100000" })).toThrow("API_RATE_LIMIT_REQUESTS");
    expect(() => productionConfig({ API_MAX_CONCURRENT: "NaN" })).toThrow("API_MAX_CONCURRENT");
  });
});

describe("standalone public API boundary", () => {
  it("provides independent health checks and never serves source files, Rewards or local snapshots", async () => {
    await start();
    expect(await call("/health")).toMatchObject({ status: 200, body: { status: "ok" } });
    expect(await call("/health", { method: "HEAD" })).toMatchObject({ status: 200, body: null });
    for (const path of ["/api/rewards", "/.local/rewards.json", "/.env", "/server/production.ts", "/", "/api/web-page/other"]) {
      expect(await call(path)).toMatchObject({ status: 404, body: { error: "Not found" } });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the real adapters for all four public API contracts and never forwards account credentials", async () => {
    await start();
    const headers = { Origin: allowed, Cookie: "account=private", Authorization: "Bearer private" };
    const suggestions = await call("/api/search-suggestions?query=weather", { headers });
    expect(suggestions).toMatchObject({ status: 200, body: ["weather", ["weather forecast"]] });
    expect(suggestions.headers).toMatchObject({ "access-control-allow-origin": allowed, vary: "Origin", "cache-control": "no-store", "x-content-type-options": "nosniff" });
    expect(suggestions.headers["access-control-allow-credentials"]).toBeUndefined();
    expect(suggestions.headers["set-cookie"]).toBeUndefined();
    expect(await call("/api/msn-feed", { headers })).toMatchObject({ status: 200, body: { source: "msn", items: [{ id: "AA123" }] } });
    const results = await call("/api/bing-serp?query=weather", { headers });
    expect(results).toMatchObject({ status: 200, body: { query: "weather", sourceUrl: "https://www.bing.com/search?q=weather&setlang=en-US&mkt=en-US&cc=US" } });
    expect(await call("/api/web-page?url=https://example.com/article", { headers })).toMatchObject({ status: 200, body: { title: "Original article", sourceUrl: "https://example.com/article" } });
    expect(fetchWebPage).toHaveBeenCalledWith("https://example.com/article", expect.any(AbortSignal));
    for (const [, options] of vi.mocked(fetch).mock.calls) {
      const upstreamHeaders = new Headers(options?.headers);
      expect(upstreamHeaders.has("cookie")).toBe(false);
      expect(upstreamHeaders.has("authorization")).toBe(false);
    }
  });

  it("rejects unexpected browser origins before contacting providers", async () => {
    await start();
    for (const value of ["https://evil.example", "null", `${allowed}.evil.example`, `${allowed}/Bing-app/`]) {
      const result = await call("/api/search-suggestions?query=weather", { headers: { Origin: value } });
      expect(result.status).toBe(403);
      expect(result.headers["access-control-allow-origin"]).toBeUndefined();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("permits only anonymous GET preflights and keeps credential headers unapproved", async () => {
    await start();
    const result = await call("/api/bing-serp", { method: "OPTIONS", headers: {
      Origin: allowed, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "Accept",
    } });
    expect(result).toMatchObject({ status: 204, body: null, headers: { "access-control-allow-origin": allowed, "access-control-allow-methods": "GET" } });
    for (const [method, header] of [["POST", "Accept"], ["GET", "Authorization"]]) {
      expect((await call("/api/bing-serp", { method: "OPTIONS", headers: { Origin: allowed,
        "Access-Control-Request-Method": method, "Access-Control-Request-Headers": header } })).status).toBe(403);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects unsupported methods, request bodies and excessive URLs before upstream work", async () => {
    await start();
    expect(await call("/api/search-suggestions?query=weather", { method: "POST" })).toMatchObject({ status: 405, headers: { allow: "GET, OPTIONS" } });
    expect((await call("/api/search-suggestions?query=weather", { headers: { "Content-Length": "4" }, body: "data" })).status).toBe(400);
    expect((await call(`/api/search-suggestions?query=${"x".repeat(16_384)}`)).status).toBe(414);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps existing local-address and unsafe-URL restrictions at the public entry point", async () => {
    await start();
    for (const url of ["http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/", "https://service.internal/", "https://user:pass@example.com", "https://example.com:4433/", "file:///etc/passwd"]) {
      expect((await call("/api/web-page?" + new URLSearchParams({ url }))).status).toBe(400);
    }
    expect(fetchWebPage).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("bounds requests without trusting forged forwarded IPs, while health remains available", async () => {
    await start({ rateLimitRequests: 2 });
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    for (const ip of ["8.8.8.8", "1.1.1.1"]) expect((await call("/api/search-suggestions", { headers: { "X-Forwarded-For": ip } })).status).toBe(200);
    const throttled = await call("/api/search-suggestions", { headers: { Origin: allowed, "X-Forwarded-For": "9.9.9.9" } });
    expect(throttled).toMatchObject({ status: 429, headers: { "retry-after": "60", "access-control-allow-origin": allowed } });
    expect((await call("/health")).status).toBe(200);
    clock.mockReturnValue(now + 60_000);
    expect((await call("/api/search-suggestions")).status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("caps concurrent provider work and releases capacity after completion", async () => {
    await start({ maxConcurrent: 1 });
    let release!: (response: Response) => void;
    let started!: () => void;
    const readiness = new Promise<void>(resolve => { started = resolve; });
    vi.mocked(fetch).mockImplementationOnce(() => {
      started();
      return new Promise<Response>(resolve => { release = resolve; });
    });
    const first = call("/api/search-suggestions?query=weather");
    await readiness;
    expect(await call("/api/search-suggestions?query=news")).toMatchObject({ status: 503, headers: { "retry-after": "1" } });
    expect((await call("/health")).status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
    release(new Response(JSON.stringify(["weather", ["weather forecast"]])));
    expect((await first).status).toBe(200);
    expect((await call("/api/search-suggestions")).status).toBe(200);
  });

  it("retains the work cap when a disconnected consumer leaves a shared MSN load running", async () => {
    await start({ maxConcurrent: 1 });
    let release!: (response: Response) => void;
    let started!: () => void;
    const readiness = new Promise<void>(resolve => { started = resolve; });
    vi.mocked(fetch).mockImplementationOnce(() => {
      started();
      return new Promise<Response>(resolve => { release = resolve; });
    });
    const consumer = request(origin + "/api/msn-feed");
    consumer.on("error", () => { /* Expected when the consumer disconnects. */ });
    const closed = new Promise<void>(resolve => consumer.once("close", resolve));
    consumer.end();
    await readiness;
    consumer.destroy();
    await closed;
    expect((await call("/api/search-suggestions?query=weather")).status).toBe(503);
    expect(fetch).toHaveBeenCalledOnce();
    release(new Response(JSON.stringify(feed), { headers: { "Content-Type": "application/json" } }));
    await vi.waitFor(async () => expect((await call("/api/search-suggestions")).status).toBe(200));
  });
});
