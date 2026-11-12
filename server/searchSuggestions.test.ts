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
  vi.useRealTimers();
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

describe("search suggestion proxy", () => {
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
    expect(options?.credentials).toBe("omit");
    expect(fetch).toHaveBeenCalledTimes(1);
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

  it.each(["network", "http", "invalid", "non-JSON", "empty body"])("uses real fallback suggestions after a Bing %s failure", async (failure) => {
    if (failure === "network") vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    if (failure === "http") vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    if (failure === "invalid") vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => "not JSON suggestions" } as Response);
    if (failure === "non-JSON" || failure === "empty body") vi.mocked(fetch).mockResolvedValueOnce(failure === "empty body"
      ? new Response(null, { status: 204 }) : new Response("<html>Unavailable</html>", { headers: { "Content-Type": "text/html" } }));
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ["weather", [
      "weather tomorrow", "weather forecast", "weather london", "weather radar", "weather map", "weather news",
    ]] } as Response);
    const result = await call("/api/search-suggestions?query=weather");
    expect(result.status).toBe(200);
    expect(result.body).toEqual(["weather", ["weather tomorrow", "weather forecast", "weather london", "weather radar", "weather map"]]);
    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, options] = vi.mocked(fetch).mock.calls[1];
    expect(String(url)).toBe("https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=weather");
    expect(options).toMatchObject({ redirect: "error", credentials: "omit", headers: { Accept: "application/json" } });
    expect(result.headers["set-cookie"]).toBeUndefined();
  });

  it("keeps a valid empty Bing response instead of inventing or replacing its suggestions", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ["weather", []] } as Response);
    expect((await call("/api/search-suggestions?query=weather")).body).toEqual(["weather", []]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("preserves Han query punctuation and locale in the fallback", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    await call(`/api/search-suggestions?${new URLSearchParams({ query: "天气 & C++" })}`);
    const url = new URL(String(vi.mocked(fetch).mock.calls[1][0]));
    expect(url.searchParams.get("q")).toBe("天气 & C++");
    expect(url.searchParams.get("hl")).toBe("zh-CN");
  });

  it.each(["network", "http", "invalid"])("returns a clear non-success status when both providers have a %s failure", async (failure) => {
    if (failure === "network") vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
    if (failure === "http") vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    if (failure === "invalid") vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => "not JSON suggestions" } as Response);
    const result = await call("/api/search-suggestions?query=weather");
    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: "Search suggestions are unavailable" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("leaves time for fallback when Bing times out within the shared four-second deadline", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(fetch).mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    const result = call("/api/search-suggestions?query=weather");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(2000);
    expect((await result).body).toEqual(["weather", ["weather today", "weather tomorrow"]]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("stops the fallback when the shared four-second deadline expires", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline")).mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    const result = call("/api/search-suggestions?query=weather");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(4000);
    expect((await result).status).toBe(504);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("cancels Bing without contacting the fallback after the browser disconnects", async () => {
    vi.mocked(fetch).mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    const client = request(`${origin}/api/search-suggestions?query=weather`);
    client.on("error", () => {});
    client.end();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    client.destroy();
    await vi.waitFor(() => expect(signal?.aborted).toBe(true));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
