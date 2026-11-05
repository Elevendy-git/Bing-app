// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMsnArticle, msnArticleRequest } from "./msnArticle";
import { fetchPublicJson } from "./webPageFetch";
import { prepareWebPageDocument } from "./webPageHtml";

vi.mock("./webPageFetch", async original => ({ ...await original<typeof import("./webPageFetch")>(), fetchPublicJson: vi.fn() }));
const url = "https://www.msn.com/en-us/news/world/original-story/ar-AA123?ocid=feed";
const article = {
  id: "AA123", locale: "en-us", type: "article", renderingRestriction: 0,
  title: 'Original article & "headline"', body: '<p>Actual published article content and an <a href="https://publisher.com/story">original source</a>.</p><script>window.bad=true</script>',
  provider: { name: "Publisher" }, authors: [{ name: "Reporter" }], publishedDateTime: "2026-10-27T00:00:00Z",
  imageResources: [{ url: "https://img-s-msn-com.akamaized.net/photo.jpg", title: 'Photo "description"', caption: "Original photo caption" }],
};
beforeEach(() => vi.mocked(fetchPublicJson).mockReset().mockResolvedValue(article));

describe("MSN article reading preview", () => {
  it("maps only MSN article URLs to the fixed public detail endpoint", () => {
    expect(msnArticleRequest(url)).toEqual({ sourceUrl: url, id: "AA123", locale: "en-us",
      endpoint: "https://assets.msn.com/content/view/v2/Detail/en-us/AA123" });
    for (const value of ["https://example.com/en-us/news/ar-AA123", "https://www.msn.com.evil.com/en-us/news/ar-AA123",
      "http://www.msn.com/en-us/news/ar-AA123", "https://www.msn.com/en-us/video/vi-AA123", "https://www.msn.com/"]) {
      expect(msnArticleRequest(value)).toBeNull();
    }
    expect(() => msnArticleRequest("https://user:pass@www.msn.com/en-us/news/ar-AA123")).toThrow();
  });

  it("keeps real article identity, byline, image and body under the existing sanitizer", async () => {
    const signal = new AbortController().signal;
    const source = await fetchMsnArticle(msnArticleRequest(url)!, signal);
    const preview = prepareWebPageDocument(source.source, source.sourceUrl);
    expect(fetchPublicJson).toHaveBeenCalledExactlyOnceWith("https://assets.msn.com/content/view/v2/Detail/en-us/AA123", signal);
    expect(source.sourceUrl).toBe(url);
    expect(preview.title).toBe(article.title);
    expect(preview.html).toContain("Actual published article content");
    expect(preview.html).toContain("Publisher · Reporter · Oct 27, 2026");
    expect(preview.html).toContain('src="https://img-s-msn-com.akamaized.net/photo.jpg"');
    expect(preview.html).toContain("Original photo caption");
    expect(preview.html).toContain('data-iab-href="https://publisher.com/story"');
    expect(preview.html).not.toContain("window.bad");
    expect(preview.html).not.toContain("<script");
  });

  it.each([{ id: "different" }, { locale: "zh-cn" }, { type: "video" }, { renderingRestriction: 1 }, { body: "" }, { title: "" }])(
    "rejects mismatched, restricted or missing article data: %j", async patch => {
      vi.mocked(fetchPublicJson).mockResolvedValueOnce({ ...article, ...patch });
      await expect(fetchMsnArticle(msnArticleRequest(url)!, new AbortController().signal)).rejects.toThrow();
    },
  );

  it("does not repeat a hero image already supplied in the article body", async () => {
    vi.mocked(fetchPublicJson).mockResolvedValueOnce({ ...article, body: article.body + `<img src="${article.imageResources[0].url}">` });
    const source = await fetchMsnArticle(msnArticleRequest(url)!, new AbortController().signal);
    expect(source.source.match(/photo\.jpg/g)).toHaveLength(1);
  });
});
