// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fallbackSearchRequestUrl, fallbackSearchUrl, prepareSearchFallbackDocument } from "./searchFallbackHtml";

const row = (title: string, href: string, summary = "Weather forecast and radar.", extra = "") =>
  `<div class="result results_links ${extra}"><div class="result__body"><h2><a class="result__a" href="${href}">${title}</a></h2><a class="result__snippet">${summary}</a></div></div>`;

describe("Search fallback HTML", () => {
  it("keeps actual organic titles, summaries and destinations with visible attribution and IAB links", () => {
    const result = prepareSearchFallbackDocument(row("Local weather", "https://forecast.example/today", "Today's forecast &amp; tomorrow's temperatures."), "weather");
    expect(result.html).toContain("Results from DuckDuckGo");
    expect(result.html).toContain("Local weather");
    expect(result.html).toContain("Today's forecast &amp; tomorrow's temperatures.");
    expect(result.html).toContain('data-iab-href="https://forecast.example/today"');
    expect(result.html).toContain('href="#" target="_self" rel="noopener noreferrer"');
    expect(result.title).toBe("weather — Search results");
    expect(result.faviconUrl).toBeNull();
  });

  it("unwraps a provider redirect while excluding ads, internal navigation and unsafe links", () => {
    const source = row("Weather ad", "https://ad.example", "Sponsored forecast", "result--ad")
      + row("Weather ad redirect", "https://duckduckgo.com/y.js?ad_domain=example.com")
      + row("Weather navigation", "/?q=weather")
      + row("Weather script", "javascript:alert(1)")
      + row("Weather credentials", "https://user:pass@forecast.example")
      + row("Weather report", "//duckduckgo.com/l/?uddg=https%3A%2F%2Fforecast.example%2Fweather")
      + row("Duplicate weather", "https://forecast.example/weather");
    const result = prepareSearchFallbackDocument(source, "weather");
    expect(result.html).toContain('data-iab-href="https://forecast.example/weather"');
    expect(result.html).not.toContain("Weather ad");
    expect(result.html).not.toContain("Weather navigation");
    expect(result.html).not.toContain("Weather script");
    expect(result.html).not.toContain("Weather credentials");
    expect(result.html).not.toContain("Duplicate weather");
    expect(result.html).not.toContain("y.js");
  });

  it("extracts plain visible text and escapes it instead of copying executable provider markup", () => {
    const result = prepareSearchFallbackDocument(row('Weather &lt;img onerror="bad()"&gt;<script>bad()</script>',
      'https://forecast.example/?x=1&amp;y=&quot;bad&quot;', '<span hidden>secret</span>Forecast <b>today</b><iframe src="https://bad.example"></iframe>'), "weather");
    expect(result.html).toContain("Weather &lt;img onerror");
    expect(result.html).toContain("Forecast today");
    expect(result.html).not.toContain("<script");
    expect(result.html).not.toContain("<img");
    expect(result.html).not.toContain("<iframe");
    expect(result.html).not.toContain("secret");
    expect(result.html).toContain("script-src 'none'");
  });

  it.each(["<h1>Verify you are human</h1>", '<form id="challenge-form"></form>', '<div class="result"><a>Unknown layout</a></div>'])(
    "rejects challenged or unusable provider documents", source => {
      expect(() => prepareSearchFallbackDocument(source, "weather")).toThrow();
    });

  it("keeps the existing relevance check instead of accepting a query echoed only by provider chrome", () => {
    expect(() => prepareSearchFallbackDocument('<input value="weather">' + row("Unrelated community", "https://unrelated.example", "Videos and discussion"), "weather"))
      .toThrow("unrelated results");
  });

  it("constructs fixed encoded English-provider URLs", () => {
    expect(fallbackSearchRequestUrl("weather & C++")).toBe("https://html.duckduckgo.com/html/?q=weather+%26+C%2B%2B&kl=us-en");
    expect(fallbackSearchUrl("weather & C++")).toBe("https://duckduckgo.com/?q=weather+%26+C%2B%2B&kl=us-en");
  });
});
