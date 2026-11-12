// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parse, serialize } from "parse5";
import { prepareBingSerpHtml } from "./bingSerpHtml";

const document = (content: string) => `<!doctype html><html><head>
<style>.result{background-image:url(/images/card.png)}</style>
<link rel="stylesheet" href="/mobile.css"></head><body id="bpage" class="mobile">
<header id="b_header"><form id="site-search"><input value="Weather"></form><nav id="ScopeRow"><a href="/images/search?q=Weather">Images</a></nav></header>
<main id="b_content"><ol id="b_results"><li class="result">${content}</li></ol></main></body></html>`;

describe("Bing mobile HTML preparation", () => {
  it("keeps original result markup, navigation and styles with absolute resource URLs", () => {
    const html = prepareBingSerpHtml(document('<h2><a href="https://example.com/weather">Weather report</a></h2><p>Original summary</p><img data-src="/images/icon.png">'));
    expect(html).toContain('class="result"');
    expect(html).toContain("Weather report");
    expect(html).toContain("Original summary");
    expect(html).toContain('id="ScopeRow"');
    expect(html).toContain('href="https://www.bing.com/images/search?q=Weather"');
    expect(html).toContain('href="https://www.bing.com/mobile.css"');
    expect(html).toContain('url("https://www.bing.com/images/card.png")');
    expect(html).toContain('src="https://www.bing.com/images/icon.png"');
    expect(html).toContain('target="_self" rel="noopener noreferrer"');
    expect(html).toContain('data-iab-href="https://example.com/weather"');
    expect(html).not.toContain("site-search");
  });

  it("removes executable markup and unsafe links, with CSP as a second boundary", () => {
    const html = prepareBingSerpHtml(document(`<script>top.location='https://example.com'</script>
<iframe srcdoc="bad"></iframe><meta http-equiv="refresh" content="0;url=https://example.com">
<a onclick="alert(1)" href="javascript:alert(1)" ping="/log">Bad link</a>
<img src="http://unsafe.example/image.png" onerror="alert(1)" srcset="/unsafe.png 1x">
<form action="/post"><input name="secret"></form><button formaction="/post">Action</button>
<svg><foreignObject><script>alert(1)</script></foreignObject></svg>`));
    const reparsed = serialize(parse(html));
    expect(reparsed).not.toMatch(/<script|<iframe|<form|<input|foreignObject|onclick=|onerror=|srcdoc=|srcset=|formaction=|ping=/i);
    expect(reparsed).not.toContain("javascript:");
    expect(reparsed).not.toContain("http://unsafe.example");
    expect(reparsed).not.toContain('http-equiv="refresh"');
    expect(reparsed).toContain('button inert=""');
    expect(html).toContain("script-src 'none'");
    expect(html).toContain("form-action 'none'");
  });

  it.each(['<h1>Verify you are human</h1>', '<main id="b_content"><ol id="b_results"></ol></main>'])("rejects an unusable document", (html) => {
    expect(() => prepareBingSerpHtml(html)).toThrow("usable result document");
  });

  const organic = (content: string) => document(content).replace('class="result"', 'class="b_algo"');

  it("rejects unrelated result text even when the requested query is echoed in chrome, links and hidden content", () => {
    const source = organic(`<h2><a href="https://unrelated.example/community">Online video community</a></h2>
      <p>Unrelated discussion and account updates.</p>
      <script>best museums in London</script><style>.London{color:red}</style>
      <span hidden>London museum</span><span aria-hidden="true">London museum</span>
      <span style="display: none">London museum</span>`)
      .replaceAll("Weather", "best museums in London");
    expect(() => prepareBingSerpHtml(source, "best museums in London")).toThrow("unrelated results");
  });

  it.each([
    { query: "weather", title: "Local forecast", summary: "Today's weather forecast and radar.", url: "https://forecast.example" },
    { query: "best museums in London", title: "Visit the museum", summary: "Opening hours and tickets.", url: "https://visit.example" },
    { query: "London weather forecast", title: "Weather report", summary: "Hourly forecasts.", url: "https://forecast.example" },
    { query: "accuweather", title: "Local forecast", summary: "Hourly forecasts.", url: "https://www.accuweather.com" },
  ])("retains a result when one informative query term matches its text or destination: $query", ({ query, title, summary, url }) => {
    expect(() => prepareBingSerpHtml(organic(`<h2><a href="${url}">${title}</a></h2><p>${summary}</p>`), query)).not.toThrow();
  });

  it.each(["AI", "C++", "123", "how is it", "天气", "東京の博物館", "café"])(
    "does not guess relevance for short, stopword-only or non-ASCII queries: %s", query => {
      expect(() => prepareBingSerpHtml(organic('<h2><a href="https://example.com">Original Bing answer</a></h2>'), query)).not.toThrow();
    });
});
