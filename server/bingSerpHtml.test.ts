// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parse, serialize } from "parse5";
import { prepareBingSerpHtml } from "./bingSerpHtml";
import { attr, isElement, walk } from "./previewHtml";

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

  it("preserves local SVG weather chart, mask and icon references while rewriting external resources", () => {
    const html = prepareBingSerpHtml(document(`
<style>.weatherCurve{fill:url(#tempGradient);mask:url("#opacityMask")} .weatherImage{background:url(/weather/background.png)}</style>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 300 120">
  <defs>
    <linearGradient id="tempGradient"><stop stop-color="#ffaf55"></stop></linearGradient>
    <mask id="opacityMask"><rect width="300" height="120" fill="white"></rect></mask>
    <path id="temperatureCurve" d="M0 70L100 40L200 60"></path>
    <symbol id="wc_droplet"><path d="M3 0L6 5H0Z"></path></symbol>
  </defs>
  <use id="curve" href="#temperatureCurve" style="stroke:url('#tempGradient');mask:url(#opacityMask)"></use>
  <use id="droplet" xlink:href="#wc_droplet"></use>
  <use id="externalIcon" href="/weather/icons.svg#sun"></use>
  <image id="unsafeIcon" href="javascript:alert(1)" onload="alert(1)"></image>
  <script>alert(1)</script><foreignObject><p>Executable container</p></foreignObject>
</svg>
<a id="localLink" href="#weather-details">Weather details</a>
<a id="articleLink" href="/weather/details">Full forecast</a>`));
    const elements = walk(parse(html)).filter(isElement);
    const byId = (id: string) => elements.find(node => attr(node, "id") === id)!;
    expect(attr(byId("curve"), "href")).toBe("#temperatureCurve");
    expect(attr(byId("curve"), "style")).toBe('stroke:url("#tempGradient");mask:url("#opacityMask")');
    const dropletReference = byId("droplet").attrs.find(item => item.name === "href");
    expect(dropletReference).toMatchObject({ prefix: "xlink", value: "#wc_droplet" });
    expect(attr(byId("externalIcon"), "href")).toBe("https://www.bing.com/weather/icons.svg#sun");
    expect(attr(byId("unsafeIcon"), "href")).toBeUndefined();
    expect(attr(byId("unsafeIcon"), "onload")).toBeUndefined();
    expect(attr(byId("localLink"), "href")).toBe("#weather-details");
    expect(attr(byId("localLink"), "data-iab-href")).toBeUndefined();
    expect(attr(byId("articleLink"), "data-iab-href")).toBe("https://www.bing.com/weather/details");
    expect(html).toContain('fill:url("#tempGradient");mask:url("#opacityMask")');
    expect(html).toContain('background:url("https://www.bing.com/weather/background.png")');
    expect(html).not.toContain("https://www.bing.com/#");
    expect(html).not.toMatch(/<script|foreignObject|javascript:|onload=/i);
    expect(html).toContain("script-src 'none'");
  });

  it.each(['<h1>Verify you are human</h1>', '<main id="b_content"><ol id="b_results"></ol></main>'])("rejects an unusable document", (html) => {
    expect(() => prepareBingSerpHtml(html)).toThrow("usable result document");
  });
});
