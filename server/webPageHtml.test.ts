// @vitest-environment node
import { describe, expect, it } from "vitest";
import { prepareWebPageDocument } from "./webPageHtml";
import { resultDestination } from "../src/services/webNavigation";

describe("Website preview document", () => {
  it("keeps original content and styling, resolves relative assets, and makes links app-owned", () => {
    const page = prepareWebPageDocument(`<html><head><title>Article &amp; source</title><link rel="icon" href="/icon.png"><link rel="stylesheet" href="/site.css"><style>.hero{background:url(../hero.jpg)}</style></head><body><h1 id="article">Original article</h1><p>A real article retains its original text, images and site layout.</p><img data-src="photo.jpg"><a href="next">Continue</a><a href="#article">Top</a><a href="http://example.org">HTTP destination</a></body></html>`, "https://example.com/news/first");
    expect(page.title).toBe("Article & source");
    expect(page.faviconUrl).toBe("https://example.com/icon.png");
    expect(page.html).toContain('href="https://example.com/site.css"');
    expect(page.html).toContain('src="https://example.com/news/photo.jpg"');
    expect(page.html).toContain('url("https://example.com/hero.jpg")');
    expect(page.html).toContain('data-iab-href="https://example.com/news/next"');
    expect(page.html).toContain('data-iab-href="http://example.org/"');
    expect(page.html).toContain('href="#article"');
    expect(page.html).not.toContain('_blank');
  });
  it("removes remote executable content, forms, redirects and forged navigation attributes", () => {
    const page = prepareWebPageDocument(`<title>Article</title><p>This is enough genuine page content to display the preview.</p><script nonce="fake">parent.stolen=true</script><iframe src="https://example.org"></iframe><meta http-equiv="refresh" content="0;url=https://example.org"><form action="/login"><input name="password"></form><a href="javascript:alert(1)" data-iab-href="https://evil.example/" onclick="alert(1)">Invalid</a><svg><foreignObject>bad</foreignObject></svg>`, "https://example.com/");
    expect(page.html).not.toMatch(/<script|<iframe|<form|<input|onclick|javascript:|evil\.example|http-equiv="refresh"|foreignObject/);
    expect(page.html).toContain("script-src 'none'");
  });
  it("reports challenged or script-only pages rather than pretending they loaded", () => {
    expect(() => prepareWebPageDocument('<title>Just a moment...</title><p>Please wait while the page checks the connection to this website.</p>', 'https://example.com/')).toThrow();
    expect(() => prepareWebPageDocument('<div id="root"></div><script>app()</script>', 'https://example.com/')).toThrow();
  });
  it("decodes Bing result redirects without changing normal destination URLs", () => {
    const destination = 'https://example.com/news?q=caf%C3%A9';
    const encoded = Buffer.from(destination).toString('base64url');
    expect(resultDestination(`https://www.bing.com/ck/a?u=a1${encoded}`)).toBe(destination);
    expect(resultDestination('https://example.com/?u=a1abc')).toBe('https://example.com/?u=a1abc');
    expect(resultDestination('javascript:alert(1)')).toBeNull();
  });
  it("decodes the Bing mobile Continue-in-browser wrapper to its real destination", () => {
    const wrapper = 'https://www.bing.com/fd/ls/GLinkPing.aspx?IG=example&&ID=SERP,5169.2&SUIH=example&redir=aHR0cHM6Ly93d3cuYWNjdXdlYXRoZXIuY29tL2VuL2pwL2NoaXlvZGEta3UvMjIxMjMxL2hvdXJseS13ZWF0aGVyLWZvcmVjYXN0LzIyMTIzMQ';
    expect(resultDestination(wrapper)).toBe('https://www.accuweather.com/en/jp/chiyoda-ku/221231/hourly-weather-forecast/221231');
    const unicode = 'https://example.com/café?q=日本語';
    expect(resultDestination(`https://bing.com/fd/ls/GLinkPing.aspx?redir=${Buffer.from(unicode).toString('base64url')}`)).toBe(new URL(unicode).href);
  });
  it.each(['javascript:alert(1)', 'data:text/html,example', 'file:///private/file', 'https://user:password@example.com/', '/relative'])('keeps the original Bing wrapper when its destination is unsafe: %s', destination => {
    const wrapper = `https://www.bing.com/fd/ls/GLinkPing.aspx?redir=${Buffer.from(destination).toString('base64url')}`;
    expect(resultDestination(wrapper)).toBe(wrapper);
  });
  it.each(['', 'abc', '%%%', 'a=b', '===='])('keeps malformed mobile redirect payloads unchanged: %s', encoded => {
    const wrapper = `https://www.bing.com/fd/ls/GLinkPing.aspx?redir=${encoded}`;
    expect(resultDestination(wrapper)).toBe(wrapper);
  });
  it("only decodes one redir parameter on the exact HTTPS Bing wrapper", () => {
    const encoded = Buffer.from('https://example.com/').toString('base64url');
    for (const wrapper of [
      `https://bing.com.attacker.example/fd/ls/GLinkPing.aspx?redir=${encoded}`,
      `https://www.bing.com/other?redir=${encoded}`,
      `http://www.bing.com/fd/ls/GLinkPing.aspx?redir=${encoded}`,
      `https://www.bing.com/fd/ls/GLinkPing.aspx?redir=${encoded}&redir=${encoded}`,
    ]) expect(resultDestination(wrapper)).toBe(wrapper);
  });
});
