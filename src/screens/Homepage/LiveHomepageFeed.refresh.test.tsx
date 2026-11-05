import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveHomepageFeed } from "./LiveHomepageFeed";
import type { MsnFeed } from "../../services/msnFeed";

const minute = 60_000;
let now: number;
let observers: { callback: IntersectionObserverCallback; disconnected: boolean }[];
const snapshot = (name: string, nextCursor: string | null = null): MsnFeed => ({
  source: "msn", market: "en-us", fetchedAt: new Date(now).toISOString(), nextCursor,
  items: Array.from({ length: 8 }, (_, index) => ({
    id: `${name}-${index}`, title: `${name} story ${index}`, url: `https://www.msn.com/${name}/${index}`,
    imageSrc: `https://th.bing.com/${name}-${index}.jpg`, imageAlt: `${name} photo ${index}`,
    publisher: "Publisher", publisherLogoSrc: null, publishedAt: new Date(now - minute).toISOString(),
  })),
});
const response = (data: MsnFeed) => ({ ok: true, json: async () => data }) as Response;
function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>(done => { resolve = done; });
  return { promise, resolve };
}
const requestedUrls = () => vi.mocked(fetch).mock.calls.map(call => call[0]);
async function approachBottom() {
  await act(async () => {
    for (const observer of observers.filter(item => !item.disconnected)) {
      observer.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    }
  });
}
function scrollTo(element: HTMLElement, top: number) {
  element.scrollTop = top;
  fireEvent.scroll(element);
}

beforeEach(() => {
  now = Date.parse("2026-11-03T06:00:00Z");
  vi.spyOn(Date, "now").mockImplementation(() => now);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  observers = [];
  vi.stubGlobal("fetch", vi.fn(async () => response(snapshot("Old", "old-page-2"))));
  vi.stubGlobal("IntersectionObserver", class {
    instance: typeof observers[number];
    constructor(callback: IntersectionObserverCallback) {
      this.instance = { callback, disconnected: false }; observers.push(this.instance);
    }
    observe() {}
    disconnect() { this.instance.disconnected = true; }
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Homepage news freshness", () => {
  it("refreshes an expired home visit once, skipping fresh, hidden and inactive visits", async () => {
    const refresh = deferredResponse();
    vi.mocked(fetch).mockResolvedValueOnce(response(snapshot("Old", "old-page-2")))
      .mockImplementationOnce(() => refresh.promise);
    const root = { current: document.createElement("div") };
    const { rerender } = render(<LiveHomepageFeed scrollRef={root} />);
    await screen.findByRole("heading", { name: "Old story 0" });
    await waitFor(() => expect(observers).toHaveLength(1));
    const oldObserver = observers[0];
    now += 4 * minute;
    fireEvent.focus(window);
    expect(fetch).toHaveBeenCalledOnce();
    rerender(<LiveHomepageFeed scrollRef={root} active={false} />);
    now += 2 * minute;
    fireEvent.focus(window);
    fireEvent(document, new Event("visibilitychange"));
    expect(fetch).toHaveBeenCalledOnce();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    rerender(<LiveHomepageFeed scrollRef={root} />);
    expect(fetch).toHaveBeenCalledOnce();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    fireEvent.focus(window);
    fireEvent.focus(window);
    expect(requestedUrls()).toEqual(["/api/msn-feed", "/api/msn-feed"]);
    expect(screen.getByRole("heading", { name: "Old story 0" })).toBeVisible();
    expect(screen.queryByRole("article", { name: "Loading feed card" })).toBeNull();
    await act(async () => refresh.resolve(response(snapshot("New", "new-page-2"))));
    expect(await screen.findByRole("heading", { name: "New story 0" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Old story 0" })).toBeNull();
    expect(root.current.scrollTop).toBe(0);
    act(() => oldObserver.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    fireEvent.focus(window);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("defers refresh while reading and stages a response if scrolling starts during its request", async () => {
    const refresh = deferredResponse();
    vi.mocked(fetch).mockResolvedValueOnce(response(snapshot("Old", "old-page-2")))
      .mockImplementationOnce(() => refresh.promise).mockResolvedValueOnce(response(snapshot("More")));
    const root = { current: document.createElement("div") };
    root.current.scrollTop = 850;
    render(<LiveHomepageFeed scrollRef={root} />);
    const old = await screen.findByRole("heading", { name: "Old story 0" });
    now += 6 * minute;
    fireEvent.focus(window);
    scrollTo(root.current, 100);
    expect(fetch).toHaveBeenCalledOnce();
    expect(root.current.scrollTop).toBe(100);
    scrollTo(root.current, 32);
    expect(fetch).toHaveBeenCalledTimes(2);
    scrollTo(root.current, 520);
    await act(async () => refresh.resolve(response(snapshot("New", "new-page-2"))));
    expect(screen.getByRole("heading", { name: "Old story 0" })).toBe(old);
    expect(screen.queryByRole("heading", { name: "New story 0" })).toBeNull();
    expect(root.current.scrollTop).toBe(520);
    await approachBottom();
    expect(fetch).toHaveBeenCalledTimes(2); // Do not mix the old continuation into a staged homepage.
    scrollTo(root.current, 0);
    expect(await screen.findByRole("heading", { name: "New story 0" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Old story 0" })).toBeNull();
    expect(root.current.scrollTop).toBe(0);
    scrollTo(root.current, 900);
    await approachBottom();
    expect(await screen.findByRole("heading", { name: "More story 0" })).toBeVisible();
    expect(requestedUrls()).toEqual(["/api/msn-feed", "/api/msn-feed", "/api/msn-feed?cursor=new-page-2"]);
    expect(root.current.scrollTop).toBe(900);
  });

  it("keeps old cards on refresh failure and retries the homepage rather than its old continuation", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(snapshot("Old", "old-page-2")))
      .mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(response(snapshot("New", "new-page-2")));
    const root = { current: document.createElement("div") };
    render(<LiveHomepageFeed scrollRef={root} />);
    const original = await screen.findByRole("heading", { name: "Old story 0" });
    now += 6 * minute;
    fireEvent.focus(window);
    expect(await screen.findByText("News couldn’t refresh")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Old story 0" })).toBe(original);
    fireEvent.focus(window);
    await approachBottom();
    expect(fetch).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "New story 0" })).toBeVisible();
    expect(requestedUrls()).toEqual(["/api/msn-feed", "/api/msn-feed", "/api/msn-feed"]);
    expect(screen.queryByText("News couldn’t refresh")).toBeNull();
    expect(root.current.scrollTop).toBe(0);
  });

  it("waits for an in-flight continuation, then refreshes at the top without renewing old-news freshness", async () => {
    const more = deferredResponse(), refresh = deferredResponse();
    vi.mocked(fetch).mockResolvedValueOnce(response(snapshot("Old", "old-page-2")))
      .mockImplementationOnce(() => more.promise).mockImplementationOnce(() => refresh.promise);
    const root = { current: document.createElement("div") };
    root.current.scrollTop = 900;
    render(<LiveHomepageFeed scrollRef={root} />);
    await screen.findByRole("heading", { name: "Old story 0" });
    await approachBottom();
    now += 6 * minute;
    scrollTo(root.current, 0);
    fireEvent.focus(window);
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(async () => more.resolve(response(snapshot("More", "old-page-3"))));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(requestedUrls()).toEqual(["/api/msn-feed", "/api/msn-feed?cursor=old-page-2", "/api/msn-feed"]);
    expect(screen.getByRole("heading", { name: "Old story 0" })).toBeVisible();
    await act(async () => refresh.resolve(response(snapshot("New", "new-page-2"))));
    expect(await screen.findByRole("heading", { name: "New story 0" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Old story 0" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "More story 0" })).toBeNull();
    expect(root.current.scrollTop).toBe(0);
  });

  it("can refresh an expired homepage after an old continuation failed", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(snapshot("Old", "old-page-2")))
      .mockRejectedValueOnce(new Error("Old continuation unavailable"))
      .mockResolvedValueOnce(response(snapshot("New", "new-page-2")));
    const root = { current: document.createElement("div") };
    root.current.scrollTop = 900;
    render(<LiveHomepageFeed scrollRef={root} />);
    await screen.findByRole("heading", { name: "Old story 0" });
    await approachBottom();
    expect(await screen.findByText("More news couldn’t load")).toBeVisible();
    now += 6 * minute;
    scrollTo(root.current, 0);
    expect(await screen.findByRole("heading", { name: "New story 0" })).toBeVisible();
    expect(screen.queryByText("More news couldn’t load")).toBeNull();
    expect(requestedUrls()).toEqual(["/api/msn-feed", "/api/msn-feed?cursor=old-page-2", "/api/msn-feed"]);
    expect(root.current.scrollTop).toBe(0);
  });

  it("rejects an empty first response without rendering a sample story, then supports retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...snapshot("Empty"), items: [] }))
      .mockResolvedValueOnce(response(snapshot("New")));
    render(<LiveHomepageFeed />);
    expect(await screen.findByText("News couldn’t load")).toBeVisible();
    expect(screen.queryByRole("article")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "New story 0" })).toBeVisible();
  });

  it("loads only the lead article eagerly, including the carousel's other images", async () => {
    render(<LiveHomepageFeed />);
    await screen.findByRole("heading", { name: "Old story 0" });
    const photos = screen.getAllByAltText(/Old photo/);
    expect(photos).toHaveLength(8);
    expect(photos[0]).toHaveAttribute("loading", "eager");
    expect(photos.slice(1).length).toBeGreaterThan(0);
    for (const photo of photos.slice(1)) expect(photo).toHaveAttribute("loading", "lazy");
  });
});
