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
});
