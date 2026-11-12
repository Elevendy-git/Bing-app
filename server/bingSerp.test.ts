// @vitest-environment node
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleBingSerp } from "./bingSerp";

const html = '<main id="b_content"><ol id="b_results"><li><a href="https://example.com">Live result</a></li></ol></main>';
let server: Server;
let origin: string;
beforeEach(async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(html, { headers: { "Content-Type": "text/html" } })));
  server = createServer((req, res) => { void handleBingSerp(req, res, () => { res.writeHead(404); res.end("{}"); }); });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
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
    expect(result.body.sourceUrl).toBe("https://www.bing.com/search?q=baidu&setlang=en-US&mkt=en-US&cc=US");
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
    expect(result.body.html).toContain("Live result");
    expect(Number.isNaN(Date.parse(result.body.fetchedAt))).toBe(false);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("https://www.bing.com/search?q=Weather&setlang=en-US&mkt=en-US&cc=US");
    const headers = new Headers(options?.headers);
    expect(headers.get("user-agent")).toContain("iPhone");
    expect(headers.has("cookie")).toBe(false);
    expect(headers.has("authorization")).toBe(false);
    expect(options?.redirect).toBe("error");
  });

  it("preserves query punctuation while keeping the global interface in English", async () => {
    await call(`/api/bing-serp?${new URLSearchParams({ query: "天气 & C++" })}`);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(new URL(String(url)).searchParams.get("q")).toBe("天气 & C++");
    expect(new URL(String(url)).searchParams.get("setlang")).toBe("en-US");
    expect(new URL(String(url)).searchParams.get("mkt")).toBe("en-US");
    expect(new URL(String(url)).searchParams.get("cc")).toBe("US");
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
});
