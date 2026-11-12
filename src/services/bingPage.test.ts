import { describe, expect, it } from "vitest";
import { bingPageIdentity, bingSearchQuery, bingSearchUrl, duckDuckGoSearchUrl, searchPageIdentity, searchPageQuery } from "./bingPage";

describe("Bing search page identity", () => {
  it("encodes the query without forcing market parameters on anonymous upstream requests", () => {
    expect(bingSearchUrl("weather & C++")).toBe("https://www.bing.com/search?q=weather+%26+C%2B%2B");
  });
  it("normalizes only the decoded query and preserves valid recorded URLs", () => {
    const sourceUrl = "https://www.bing.com/search?q=++Weather+++forecast%09&form=related";
    expect(bingSearchQuery(sourceUrl)).toBe("Weather forecast");
    expect(bingPageIdentity("Weather forecast", sourceUrl, null).sourceUrl).toBe(sourceUrl);
  });

  it("does not reinterpret webpage paths, credentials or other hosts as search queries", () => {
    for (const url of [
      "https://example.com/search?q=Weather+++forecast",
      "https://www.bing.com/article?q=Weather+++forecast",
      "https://user@www.bing.com/search?q=Weather+++forecast",
      "https://www.bing.com/search?q=++%09++",
    ]) expect(bingSearchQuery(url)).toBeNull();
  });

  it("rejects unrelated result metadata after query normalization", () => {
    expect(bingPageIdentity("Weather forecast", "https://www.bing.com/search?q=Weather+news", null).sourceUrl)
      .toBe(bingSearchUrl("Weather forecast"));
  });

  it("preserves the fallback provider and decoded query without accepting unrelated metadata", () => {
    const url = duckDuckGoSearchUrl("cats & dogs");
    expect(searchPageQuery(url)).toBe("cats & dogs");
    expect(bingSearchQuery(url)).toBeNull();
    expect(searchPageIdentity("cats & dogs", url, "https://duckduckgo.com/favicon.ico", "duckduckgo"))
      .toEqual({ sourceUrl: url, faviconUrl: "https://duckduckgo.com/favicon.ico" });
    expect(searchPageIdentity("cats & dogs", "https://duckduckgo.com/?q=unrelated", "https://evil.example/favicon.ico", "duckduckgo"))
      .toEqual({ sourceUrl: url, faviconUrl: null });
  });

  it.each(["https://duckduckgo.com.evil.example/?q=baidu", "https://user@duckduckgo.com/?q=baidu", "https://duckduckgo.com/article?q=baidu", "http://duckduckgo.com/?q=baidu"])(
    "does not turn unsupported provider routes into queries: %s", url => expect(searchPageQuery(url)).toBeNull());
});
