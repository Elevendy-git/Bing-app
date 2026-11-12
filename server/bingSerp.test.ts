// @vitest-environment node
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleBingSerp } from "./bingSerp";

const html = '<main id="b_content"><ol id="b_results"><li><a href="https://example.com">Live result</a></li></ol></main>';
const fallbackHtml = '<div class="result"><h2><a class="result__a" href="https://weather.example/today">Local weather</a></h2><a class="result__snippet">Hourly forecast.</a></div>';
const htmlResponse = (source: string) => new Response(source, { headers: { "Content-Type": "text/html" } });
let server: Server;
let origin: string;
beforeEach(async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(html, { headers: { "Content-Type": "text/html" } })));
  server = createServer((req, res) => { void handleBingSerp(req, res, () => { res.writeHead(404); res.end("{}"); }); });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  vi.useRealTimers();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.unstubAllGlobals();
});
function call(path: string, method = "GET") {
  return new Promise<{ status: number; body: Record<string, string>; cache?: string }>((resolve, reject) => {
    const req = request(`${origin}${path}`, { method, headers: { Cookie: "private=example", Authorization: "Bearer example" } }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: JSON.parse(text), cache: res.headers["cache-control"] }));
    });
    req.on("error", reject); req.end();
  });
}
describe("Bing result endpoint", () => {
  it("returns the visited page URL and its own favicon, ignoring result-site branding", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('<link rel="shortcut icon" href="/sa/bing-icon.ico">' + html,
      { headers: { "Content-Type": "text/html" } }));
    const result = await call("/api/bing-serp?query=baidu");
    expect(result.body.sourceUrl).toBe("https://www.bing.com/search?q=baidu");
    expect(result.body.faviconUrl).toBe("https://www.bing.com/sa/bing-icon.ico");
  });

  it.each(["", "javascript:alert(1)", "https://localhost/icon.ico", "https://www.bing.com.evil.test/icon.ico"])(
    "does not turn invalid favicon metadata into a request: %s", async (href) => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(`<link rel="icon" href="${href}">` + html,
        { headers: { "Content-Type": "text/html" } }));
      expect((await call("/api/bing-serp?query=baidu")).body.faviconUrl).toBeNull();
    });

  it("fetches only Bing with a mobile UA and never forwards browser credentials", async () => {
    const result = await call("/api/bing-serp?query=Weather&url=https://example.com");
    expect(result.status).toBe(200);
    expect(result.cache).toBe("no-store");
    expect(result.body.query).toBe("Weather");
    expect(result.body.provider).toBe("bing");
    expect(result.body.html).toContain("Live result");
    expect(Number.isNaN(Date.parse(result.body.fetchedAt))).toBe(false);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("https://www.bing.com/search?q=Weather");
    const headers = new Headers(options?.headers);
    expect(headers.get("user-agent")).toContain("iPhone");
    expect(headers.has("cookie")).toBe(false);
    expect(headers.has("authorization")).toBe(false);
    expect(options?.redirect).toBe("error");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("preserves query punctuation while keeping the global interface in English", async () => {
    await call(`/api/bing-serp?${new URLSearchParams({ query: "天气 & C++" })}`);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(new URL(String(url)).searchParams.get("q")).toBe("天气 & C++");
    expect([...new URL(String(url)).searchParams.keys()]).toEqual(["q"]);
    expect(new Headers(options?.headers).get("accept-language")).toBe("en-US,en;q=0.9");
  });

  it("rejects invalid input before contacting Bing", async () => {
    expect((await call("/api/bing-serp?query=%20")).status).toBe(400);
    expect((await call(`/api/bing-serp?query=${"a".repeat(257)}`)).status).toBe(400);
    expect((await call("/api/bing-serp?query=weather", "POST")).status).toBe(405);
    expect((await call("/api/other")).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports an unrelated upstream results page as unavailable instead of publishing it under the requested query", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(`<input id="sb_form_q" value="best museums in London">
      <main id="b_content"><ol id="b_results"><li class="b_algo">
      <h2><a href="https://unrelated.example">Unrelated online community</a></h2><p>Videos and discussion.</p>
      </li></ol></main>`, { headers: { "Content-Type": "text/html" } }));
    const result = await call(`/api/bing-serp?${new URLSearchParams({ query: "best museums in London" })}`);
    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: "Bing results are unavailable" });
    expect(result.body.html).toBeUndefined();
  });

  it.each(["network", "challenge", "content-type", "oversized"])("reports %s failures without fake results", async (failure) => {
    if (failure === "network") vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    if (failure === "challenge") vi.mocked(fetch).mockResolvedValueOnce(new Response("Verify you are human", { headers: { "Content-Type": "text/html" } }));
    if (failure === "content-type") vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { headers: { "Content-Type": "application/json" } }));
    if (failure === "oversized") vi.mocked(fetch).mockResolvedValueOnce(new Response("x".repeat(4 * 1024 * 1024 + 1), { headers: { "Content-Type": "text/html" } }));
    const result = await call("/api/bing-serp?query=weather");
    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: "Bing results are unavailable" });
  });

  it.each(["network", "challenge", "unrelated"])("uses attributed live fallback data after a %s primary failure", async failure => {
    if (failure === "network") vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    if (failure === "challenge") vi.mocked(fetch).mockResolvedValueOnce(htmlResponse("Verify you are human"));
    if (failure === "unrelated") vi.mocked(fetch).mockResolvedValueOnce(htmlResponse('<main id="b_content"><ol id="b_results"><li class="b_algo"><h2><a href="https://unrelated.example">Unrelated community</a></h2></li></ol></main>'));
    vi.mocked(fetch).mockResolvedValueOnce(htmlResponse(fallbackHtml));
    const result = await call("/api/bing-serp?query=weather");
    expect(result.status).toBe(200);
    expect(result.body.provider).toBe("duckduckgo");
    expect(result.body.sourceUrl).toBe("https://duckduckgo.com/?q=weather&kl=us-en");
    expect(result.body.html).toContain("Results from DuckDuckGo");
    expect(result.body.html).toContain('data-iab-href="https://weather.example/today"');
    const [url, options] = vi.mocked(fetch).mock.calls[1];
    expect(String(url)).toBe("https://html.duckduckgo.com/html/?q=weather&kl=us-en");
    expect(options?.redirect).toBe("error");
    expect(new Headers(options?.headers).has("cookie")).toBe(false);
    expect(new Headers(options?.headers).has("authorization")).toBe(false);
  });

  it("limits both providers' documents instead of publishing an oversized fallback", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(htmlResponse("x".repeat(4 * 1024 * 1024 + 1)));
    const result = await call("/api/bing-serp?query=weather");
    expect(result.status).toBe(502);
    expect(result.body.html).toBeUndefined();
  });

  it("moves on after the primary eight-second budget while preserving the fallback's remaining request budget", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let started!: () => void;
    const primaryStarted = new Promise<void>(resolve => { started = resolve; });
    vi.mocked(fetch).mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      started();
    })).mockResolvedValueOnce(htmlResponse(fallbackHtml));
    const request = call("/api/bing-serp?query=weather");
    await primaryStarted;
    await vi.advanceTimersByTimeAsync(8000);
    const result = await request;
    expect(result.status).toBe(200);
    expect(result.body.provider).toBe("duckduckgo");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("aborts a stalled fallback at the total twenty-second deadline", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let started!: () => void;
    const fallbackStarted = new Promise<void>(resolve => { started = resolve; });
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        started();
      }));
    const request = call("/api/bing-serp?query=weather");
    await fallbackStarted;
    await vi.advanceTimersByTimeAsync(20000);
    const result = await request;
    expect(result.status).toBe(504);
    expect(result.body.html).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("cancels the upstream without starting a fallback when the caller disconnects", async () => {
    let started!: () => void, aborted!: () => void;
    const primaryStarted = new Promise<void>(resolve => { started = resolve; });
    const primaryAborted = new Promise<void>(resolve => { aborted = resolve; });
    vi.mocked(fetch).mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => { aborted(); reject(new Error("aborted")); }, { once: true });
      started();
    }));
    const client = request(`${origin}/api/bing-serp?query=weather`);
    client.on("error", () => undefined);
    client.end();
    await primaryStarted;
    client.destroy();
    await primaryAborted;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
