import { afterEach, describe, expect, it, vi } from "vitest";
import { publicApiUrl, resolvePublicApiUrl } from "./apiUrl";
import { fetchMsnFeed } from "./msnFeed";
import { fetchSearchSuggestions } from "./searchSuggestions";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Public data API routing", () => {
  it("preserves local and relative Vite API routing when no backend is configured", () => {
    expect(resolvePublicApiUrl("/api/bing-serp?query=weather")).toBe("/api/bing-serp?query=weather");
    expect(resolvePublicApiUrl("/api/msn-feed", "", "./")).toBe("./api/msn-feed");
    expect(resolvePublicApiUrl("/api/search-suggestions", "  ", "/Bing-app/")).toBe("/Bing-app/api/search-suggestions");
  });

  it("routes every public endpoint to the HTTPS backend independently of the Pages path", () => {
    for (const path of ["/api/search-suggestions", "/api/msn-feed", "/api/bing-serp", "/api/web-page"]) {
      expect(resolvePublicApiUrl(`${path}?query=a%20b%26c`, " https://bing-backend.onrender.com/ ", "/Bing-app/"))
        .toBe(`https://bing-backend.onrender.com${path}?query=a%20b%26c`);
    }
    expect(resolvePublicApiUrl("/api/msn-feed", "https://api.example.com/gateway/")).toBe("https://api.example.com/gateway/api/msn-feed");
    expect(resolvePublicApiUrl("/api/msn-feed", "http://localhost:3001")).toBe("http://localhost:3001/api/msn-feed");
  });

  it("rejects backend credentials, insecure remote URLs, and non-public routes", () => {
    for (const base of ["http://api.example.com", "https://user:password@api.example.com", "https://api.example.com?token=secret", "https://api.example.com/#secret", "//api.example.com", "file:///tmp/api"]) {
      expect(() => resolvePublicApiUrl("/api/msn-feed", base)).toThrow();
    }
    for (const path of ["/api/rewards", "/api/rewards?account=owner", "https://other.example/api/msn-feed", "//api/msn-feed"]) {
      expect(() => resolvePublicApiUrl(path, "https://api.example.com")).toThrow("Expected a public API path");
    }
  });

  it("reads build environment lazily and keeps query escaping in both live data clients", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://bing-backend.onrender.com");
    vi.stubEnv("BASE_URL", "/Bing-app/");
    const fetchedAt = "2026-11-01T10:00:00Z";
    const fetcher = vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes("/api/msn-feed")
      ? { source: "msn", market: "en-us", fetchedAt, nextCursor: null, items: [{ id: "1", title: "News", url: "https://news.example/article",
        imageSrc: "https://news.example/image.jpg", imageAlt: "News", publisher: "Publisher", publisherLogoSrc: null, publishedAt: fetchedAt }] }
      : ["a & b", ["a & b news"]] }));
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal;
    expect(publicApiUrl("/api/msn-feed")).toBe("https://bing-backend.onrender.com/api/msn-feed");
    expect(await fetchSearchSuggestions("a & b", signal)).toEqual([{ query: "a & b news", source: "prediction" }]);
    await fetchMsnFeed(signal, "page/2?x=1");
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "https://bing-backend.onrender.com/api/search-suggestions?query=a+%26+b",
      "https://bing-backend.onrender.com/api/msn-feed?cursor=page%2F2%3Fx%3D1",
    ]);
    for (const [, options] of fetcher.mock.calls as unknown as [string, RequestInit][]) {
      expect(options).toMatchObject({ credentials: "omit", referrerPolicy: "no-referrer", signal });
      expect(options.headers).toEqual({ Accept: "application/json" });
    }
  });
});
