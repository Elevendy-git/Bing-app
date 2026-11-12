// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bingRssRequestUrl, prepareBingRssDocument } from "./bingRssHtml";

const feed = (items: string) => `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>Bing: weather</title>${items}</channel></rss>`;
const item = (title: string, url: string, description = "Weather forecast and radar") =>
  `<item><title>${title}</title><link>${url}</link><description>${description}</description></item>`;

describe("Bing RSS recovery document", () => {
  it("renders actual feed titles, summaries and URLs with Bing attribution and IAB navigation", () => {
    const result = prepareBingRssDocument(feed(item("Today's Weather &amp; Forecast", "https://forecast.example/weather?day=1&amp;unit=f", "Local conditions and tomorrow's temperatures")), "weather");
    expect(result.html).toContain("Results from Bing");
    expect(result.html).toContain("Today's Weather &amp; Forecast");
    expect(result.html).toContain("Local conditions and tomorrow's temperatures");
    expect(result.html).toContain('data-iab-href="https://forecast.example/weather?day=1&amp;unit=f"');
    expect(result.html).not.toContain("Results from DuckDuckGo");
    expect(result.faviconUrl).toBeNull();
    expect(result.title).toBe("weather — Search results");
  });

  it("parses CDATA and numeric entities as text while removing remote executable markup", () => {
    const result = prepareBingRssDocument(feed(item("Weather &#38; Rain", "https://forecast.example", '<![CDATA[<p>Weather <b>today</b></p><script>bad()</script><img src="https://bad.example" onerror="bad()"><span hidden>hidden words</span>]]>')), "weather");
    expect(result.html).toContain("Weather &amp; Rain");
    expect(result.html).toContain("Weather today");
    expect(result.html).not.toContain("<script");
    expect(result.html).not.toContain("<img");
    expect(result.html).not.toContain("hidden words");
    expect(result.html).not.toContain("bad()");
  });

  it("filters unsafe, credentialed and missing destinations and deduplicates actual results", () => {
    const result = prepareBingRssDocument(feed(item("Weather script", "javascript:alert(1)")
      + item("Weather login", "https://user:pass@forecast.example")
      + item("Weather missing", "")
      + item("", "https://blank.example")
      + item("Weather report", "https://forecast.example/today")
      + item("Weather duplicate", "https://forecast.example/today")), "weather");
    expect(result.html).toContain("Weather report");
    expect(result.html).not.toContain("Weather script");
    expect(result.html).not.toContain("Weather login");
    expect(result.html).not.toContain("Weather missing");
    expect(result.html).not.toContain("Weather duplicate");
    expect(result.html).not.toContain("blank.example");
  });

  it("retains at most ten actual results without generating additional entries", () => {
    const result = prepareBingRssDocument(feed(Array.from({ length: 12 }, (_, index) => item(`Weather report ${index}`, `https://forecast.example/${index}`)).join("")), "weather");
    expect(result.html.match(/class="b_algo"/g)).toHaveLength(10);
    expect(result.html).not.toContain("Weather report 10");
  });

  it.each([
    '<!DOCTYPE rss SYSTEM "https://private.example/secret"><rss><channel></channel></rss>',
    '<!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><rss><channel></channel></rss>',
    '<!ENTITY xxe "weather"><rss><channel></channel></rss>',
    '<!DOCTYPE rss [<!ENTITY a "weather"><!ENTITY b "&a;&a;&a;">]><rss><channel></channel></rss>',
  ])("rejects DTD and entity definitions before parsing", source => {
    expect(() => prepareBingRssDocument(source, "weather")).toThrow("Unsupported search feed");
  });

  it.each(["<rss><channel></rss>", "<html><body>Verify you are human</body></html>", feed(""), feed("<item><title>Weather</title></item>")])(
    "rejects malformed, challenged or empty responses", source => {
      expect(() => prepareBingRssDocument(source, "weather")).toThrow();
    });

  it("rejects clearly unrelated RSS results instead of trusting the echoed query or a publisher hostname", () => {
    expect(() => prepareBingRssDocument(feed(item("Pressure calculation question", "https://zhidao.baidu.com/question/123", "Learn a plumbing formula")), "baidu"))
      .toThrow("unrelated results");
  });

  it("rejects oversized XML and excessive nesting", () => {
    expect(() => prepareBingRssDocument(" ".repeat(4 * 1024 * 1024 + 1), "weather")).toThrow("Unsupported search feed");
    expect(() => prepareBingRssDocument(feed("<a>".repeat(40) + "weather" + "</a>".repeat(40)), "weather")).toThrow();
  });

  it("constructs one fixed correctly encoded RSS URL without market parameters", () => {
    expect(bingRssRequestUrl("weather & C++")).toBe("https://www.bing.com/search?format=rss&q=weather+%26+C%2B%2B");
  });
});
