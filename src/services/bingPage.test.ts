import { describe, expect, it } from "vitest";
import { bingPageIdentity, bingSearchQuery, bingSearchUrl } from "./bingPage";

describe("Bing search page identity", () => {
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
});
