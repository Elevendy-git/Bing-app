import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Homepage } from "./Homepage";
import { LiveHomepageFeed } from "./LiveHomepageFeed";
import { fetchMsnFeed, newsElapsedTime, type MsnFeed } from "../../services/msnFeed";

const news: MsnFeed = { source: "msn", market: "en-us", fetchedAt: "2026-10-21T06:00:00Z", nextCursor: null,
  items: Array.from({ length: 8 }, (_, index) => ({ id: String(index), title: `News ${index}`, publisher: `Publisher ${index}`,
    url: `https://www.msn.com/en-us/news/ar-${index}`, imageSrc: `https://th.bing.com/news-${index}.jpg`, imageAlt: `Photo ${index}`,
    publisherLogoSrc: null, publishedAt: "2026-10-21T05:00:00Z" })),
};
const response = (data = news) => ({ ok: true, json: async () => data }) as Response;
let observers: { callback: IntersectionObserverCallback; options?: IntersectionObserverInit; disconnected: boolean }[];
beforeEach(() => {
  observers = [];
  vi.stubGlobal("fetch", vi.fn(async () => response()));
  vi.stubGlobal("IntersectionObserver", class {
    instance: typeof observers[number];
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.instance = { callback, options, disconnected: false }; observers.push(this.instance);
    }
    observe() {}
    disconnect() { this.instance.disconnected = true; }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function approachBottom() {
  await act(async () => {
    for (const observer of observers.filter(item => !item.disconnected)) {
      observer.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    }
  });
}

describe("Homepage MSN news", () => {
  it("reuses the single and interactive carousel components with unique actual stories", async () => {
    render(<LiveHomepageFeed />);
    expect(screen.getAllByRole("article", { name: "Loading feed card" })).toHaveLength(3);
    const headline = await screen.findByRole("heading", { name: "News 0" });
    const first = headline.closest("article")!;
    expect(within(first).getByText("Publisher 0")).toBeVisible();
    // No unrelated default publisher mark when MSN supplies no logo.
    expect(first.querySelector('span[class*="metaGroup"] svg')).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));
    expect(screen.getByRole("group", { name: "Slide 2 of 5: News 2" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "News 2" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Home feed" })).toHaveAttribute("data-feed-source", "msn");
    expect(vi.mocked(fetch).mock.calls[0]).toEqual(["/api/msn-feed", expect.objectContaining({ credentials: "omit" })]);
  });

  it("shows retry after failure without silently returning design examples", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    render(<LiveHomepageFeed />);
    expect(await screen.findByText("News couldn’t load")).toBeVisible();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "News 0" })).toBeVisible();
  });

  it("aborts a pending request on reset/unmount and ignores late results", async () => {
    let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const { unmount } = render(<LiveHomepageFeed />);
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => { resolve(response()); });
    expect(screen.queryByRole("heading", { name: "News 0" })).not.toBeInTheDocument();
  });

  it("keeps the default Homepage design preset offline", async () => {
    render(<Homepage />);
    expect(screen.getByRole("heading", { name: "Why UX Designers Are Shifting Away From Their Careers" })).toBeVisible();
    await waitFor(() => expect(fetch).not.toHaveBeenCalled());
  });

  it("prefetches new pages, deduplicates stories and preserves the current card and carousel", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...news, nextCursor: "page-2" }))
      .mockResolvedValueOnce(response({ ...news, items: [news.items[0], { ...news.items[1], id: "new", url: "https://www.msn.com/new", title: "New story" }] }));
    const root = { current: document.createElement("div") };
    render(<LiveHomepageFeed scrollRef={root} />);
    const original = await screen.findByRole("heading", { name: "News 0" });
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));
    expect(observers[0].options).toMatchObject({ root: root.current, rootMargin: "0px 0px 900px 0px" });
    await approachBottom();
    expect(await screen.findByRole("heading", { name: "New story" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "News 0" })).toBe(original);
    expect(screen.getAllByRole("heading", { name: "News 0" })).toHaveLength(1);
    expect(screen.getByRole("group", { name: "Slide 2 of 5: News 2" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Home feed" })).toHaveAttribute("data-article-count", "9");
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe("/api/msn-feed?cursor=page-2");
    expect(screen.getByText("You’re all caught up")).toBeVisible();
    await approachBottom();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("leaves loaded cards in place on a page failure and retries that same continuation", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...news, nextCursor: "page-2" }))
      .mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response({ ...news, items: [] }));
    render(<LiveHomepageFeed />);
    const original = await screen.findByRole("heading", { name: "News 0" });
    await approachBottom();
    expect(await screen.findByText("More news couldn’t load")).toBeVisible();
    await approachBottom();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { name: "News 0" })).toBe(original);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("You’re all caught up")).toBeVisible();
    expect(vi.mocked(fetch).mock.calls[2][0]).toBe("/api/msn-feed?cursor=page-2");
  });

  it("does not launch duplicate concurrent requests or load more behind an inactive screen", async () => {
    let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...news, nextCursor: "page-2" }))
      .mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const { rerender, unmount } = render(<LiveHomepageFeed active={false} />);
    await screen.findByRole("heading", { name: "News 0" });
    await approachBottom();
    expect(fetch).toHaveBeenCalledOnce();
    rerender(<LiveHomepageFeed />);
    const observer = observers.find(item => !item.disconnected)!;
    act(() => {
      observer.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
      observer.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    const signal = vi.mocked(fetch).mock.calls[1][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => resolve(response()));
  });

  it("skips repeated pages but stops after three without new stories", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...news, nextCursor: "page-2" }))
      .mockResolvedValueOnce(response({ ...news, nextCursor: "page-3" }))
      .mockResolvedValueOnce(response({ ...news, items: [], nextCursor: "page-4" }))
      .mockResolvedValueOnce(response({ ...news, nextCursor: "page-5" }));
    render(<LiveHomepageFeed />);
    await screen.findByRole("heading", { name: "News 0" });
    await approachBottom();
    expect(screen.queryByText("You’re all caught up")).not.toBeInTheDocument();
    await approachBottom();
    await approachBottom();
    expect(await screen.findByText("You’re all caught up")).toBeVisible();
    expect(screen.getByRole("region", { name: "Home feed" })).toHaveAttribute("data-article-count", "8");
    await approachBottom();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("recovers an expired server cursor with a new feed snapshot", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 410, ok: false } as Response).mockResolvedValueOnce(response());
    expect(await fetchMsnFeed(new AbortController().signal, "expired")).toEqual(news);
    expect(vi.mocked(fetch).mock.calls.map(call => call[0])).toEqual(["/api/msn-feed?cursor=expired", "/api/msn-feed"]);
  });

  it("computes elapsed time from publication dates, including older editorial stories", () => {
    const now = Date.parse("2026-10-21T06:00:00Z");
    expect(newsElapsedTime("2026-10-21T06:00:00Z", now)).toBe("Now");
    expect(newsElapsedTime("2026-10-21T05:29:00Z", now)).toBe("31m");
    expect(newsElapsedTime("2026-10-21T04:00:00Z", now)).toBe("2h");
    expect(newsElapsedTime("2026-10-19T06:00:00Z", now)).toBe("2d");
    expect(newsElapsedTime("2026-07-08T12:00:00Z", now)).toBe("Jul 8");
  });
});
