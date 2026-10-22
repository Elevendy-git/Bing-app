// @vitest-environment node
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleSearchSuggestions } from "./searchSuggestions";

let server: Server;
let origin: string;
beforeEach(async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ["weather", ["weather today", "weather tomorrow"]] }));
  server = createServer((req, res) => {
    void handleSearchSuggestions(req, res, () => { res.writeHead(404); res.end("{}"); });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.unstubAllGlobals();
});

function call(path: string, method = "GET") {
  return new Promise<{ status: number; body: unknown; headers: Record<string, unknown> }>((resolve, reject) => {
    const req = request(`${origin}${path}`, { method, headers: { Cookie: "prototype-cookie=example" } }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: JSON.parse(text), headers: res.headers }));
    });
    req.on("error", reject);
    req.end();
  });
}

describe("Bing suggestion proxy", () => {
  it("uses the fixed Bing upstream and strips cookies and cache state from the response", async () => {
    const result = await call("/api/search-suggestions?query=weather");
    expect(result.status).toBe(200);
    expect(result.body).toEqual(["weather", ["weather today", "weather tomorrow"]]);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.headers["set-cookie"]).toBeUndefined();
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("https://api.bing.com/osjson.aspx?query=weather&market=en-US");
    expect(options?.headers).toEqual({ Accept: "application/json" });
    expect(options?.redirect).toBe("error");
  });

  it("selects Chinese suggestions for Chinese input without changing query punctuation", async () => {
    await call(`/api/search-suggestions?${new URLSearchParams({ query: "天气 & C++" })}`);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(new URL(String(url)).searchParams.get("query")).toBe("天气 & C++");
    expect(new URL(String(url)).searchParams.get("market")).toBe("zh-CN");
  });

  it("avoids upstream calls for blank, oversized, unrelated and non-GET requests", async () => {
    expect((await call("/api/search-suggestions?query=%20")).body).toEqual(["", []]);
    expect((await call(`/api/search-suggestions?query=${"a".repeat(257)}`)).status).toBe(400);
    expect((await call("/api/search-suggestions?query=weather", "POST")).status).toBe(405);
    expect((await call("/api/unrelated?query=weather")).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["network", "http", "invalid"])("returns a clear non-success status for an upstream %s failure", async (failure) => {
    if (failure === "network") vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    if (failure === "http") vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    if (failure === "invalid") vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => "not JSON suggestions" } as Response);
    const result = await call("/api/search-suggestions?query=weather");
    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: "Search suggestions are unavailable" });
  });
});
