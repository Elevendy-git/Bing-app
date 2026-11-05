import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BingAppPrototype } from "./BingAppPrototype";

const response = (query: string) => ({ ok: true, json: async () => ({
  query, html: `<p>${query} results</p>`, fetchedAt: "2026-10-22T06:00:00Z",
  sourceUrl: `https://www.bing.com/search?${new URLSearchParams({ q: query })}`, faviconUrl: "https://www.bing.com/favicon.ico",
}) });
beforeEach(() => vi.stubGlobal("fetch", vi.fn(async (path: string) => {
  const url = new URL(path, "http://localhost");
  const query = url.searchParams.get("query") ?? "";
  return url.pathname === "/api/bing-serp" ? response(query) : { ok: true, json: async () => [query, [query]] };
})));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const editBox = () => screen.getByRole("searchbox", { name: "Edit search query" });
const recent = () => fireEvent.click(screen.getByRole("button", { name: "Recent" }));
const cards = () => within(screen.getByRole("group", { name: "Open tabs cards" }));
const requests = () => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).startsWith("/api/bing-serp"));
const open = (query: string, id: string) => fireEvent.click(screen.getByRole("button", { name: `Select ${query} tab: ${id}` }));
async function submit(query: string) {
  const field = screen.getByRole("searchbox", { name: "Search query" });
  fireEvent.change(field, { target: { value: query } });
  fireEvent.keyDown(field, { key: "Enter" });
  await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
  expect(editBox()).toHaveValue(query);
}
async function newTab(query: string) {
  fireEvent.click(screen.getByRole("button", { name: "New tab" }));
  await submit(query);
}

describe("Open existing prototype tabs", () => {
  it.each(["Recent", "Tabs"])("opens the corresponding page from %s, retaining both documents without recording another visit", async (origin) => {
    render(<BingAppPrototype initialPage="recent" initialRecentState="empty" />);
    await newTab("baidu");
    const baidu = await screen.findByTitle("Bing results for baidu");
    recent();
    await newTab("123");
    const numbers = await screen.findByTitle("Bing results for 123");
    recent();
    const history = screen.getByRole("group", { name: "History list" }).textContent;
    if (origin === "Tabs") fireEvent.click(screen.getByRole("button", { name: "View all open tabs" }));
    open("baidu", "search-1");
    expect(editBox()).toHaveValue("baidu");
    expect(screen.getAllByRole("main", { name: "Search results" })).toHaveLength(1);
    expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    await waitFor(() => expect(editBox()).toHaveFocus());
    expect(within(screen.getByRole("main", { name: "Search results" })).getByTitle("Bing results for baidu")).toBe(baidu);
    expect(numbers.closest("[inert]")).not.toBeNull();
    recent();
    expect(cards().getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("group", { name: "History list" }).textContent).toBe(history);
    expect(cards().getByRole("button", { name: "Select baidu tab: search-1" })).toHaveAttribute("aria-pressed", "true");
    open("123", "search-2");
    expect(editBox()).toHaveValue("123");
    expect(within(screen.getByRole("main", { name: "Search results" })).getByTitle("Bing results for 123")).toBe(numbers);
    recent();
    fireEvent.click(screen.getByRole("button", { name: "Back to search results" }));
    expect(editBox()).toHaveValue("123");
    expect(requests()).toHaveLength(2);
  });

  it("edits the reopened tab while leaving the other tab and its document intact", async () => {
    render(<BingAppPrototype initialPage="recent" initialRecentState="empty" />);
    await newTab("baidu");
    const previousBaidu = await screen.findByTitle("Bing results for baidu");
    recent();
    await newTab("123");
    const numbers = await screen.findByTitle("Bing results for 123");
    recent();
    open("baidu", "search-1");
    fireEvent.click(editBox());
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("baidu");
    await submit("baidu maps");
    expect(previousBaidu).not.toBeInTheDocument();
    recent();
    expect(cards().getAllByRole("article")).toHaveLength(2);
    expect(cards().getByRole("button", { name: "Select baidu maps tab: search-1" })).toHaveAttribute("aria-pressed", "true");
    open("123", "search-2");
    expect(within(screen.getByRole("main", { name: "Search results" })).getByTitle("Bing results for 123")).toBe(numbers);
    expect(requests()).toHaveLength(3);
  });

  it("keeps same-query tabs distinct and closes only the pressed card without opening it", async () => {
    render(<BingAppPrototype initialPage="recent" initialRecentState="empty" />);
    await newTab("Bing");
    const first = await within(screen.getByRole("main", { name: "Search results" })).findByTitle("Bing results for Bing");
    recent();
    await newTab("Bing");
    const second = await within(screen.getByRole("main", { name: "Search results" })).findByTitle("Bing results for Bing");
    expect(first).not.toBe(second);
    recent();
    open("Bing", "search-1");
    expect(within(screen.getByRole("main", { name: "Search results" })).getByTitle("Bing results for Bing")).toBe(first);
    recent();
    fireEvent.click(cards().getByRole("button", { name: "Close Bing tab: search-1" }));
    await waitFor(() => expect(screen.getByRole("main", { name: "Recent page" })).toBeVisible());
    expect(screen.queryByRole("main", { name: "Search results" })).not.toBeInTheDocument();
    expect(first).not.toBeInTheDocument();
    expect(cards().getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Back to search results" }));
    expect(within(screen.getByRole("main", { name: "Search results" })).getByTitle("Bing results for Bing")).toBe(second);
    expect(requests()).toHaveLength(2);
  });

  it("keeps pending results attached to their original tab when switching before either finishes", async () => {
    const finish = new Map<string, (value: ReturnType<typeof response>) => void>();
    vi.mocked(fetch).mockImplementation(path => {
      const query = new URL(String(path), "http://localhost").searchParams.get("query") ?? "";
      return new Promise(resolve => finish.set(query, resolve as (value: ReturnType<typeof response>) => void));
    });
    render(<BingAppPrototype initialPage="recent" initialRecentState="empty" />);
    await newTab("First pending");
    recent();
    await newTab("Second pending");
    recent();
    open("First pending", "search-1");
    expect(editBox()).toHaveValue("First pending");
    expect(requests()).toHaveLength(2);
    for (const query of ["Second pending", "First pending"]) {
      await act(async () => finish.get(query)!(response(query)));
      fireEvent.load(await screen.findByTitle(`Bing results for ${query}`));
    }
    expect(editBox()).toHaveValue("First pending");
    recent();
    const previews = cards().getAllByRole("article").map(card => card.querySelector("iframe")?.getAttribute("srcdoc"));
    expect(previews).toEqual(["<p>Second pending results</p>", "<p>First pending results</p>"]);
    expect(requests().every(([, options]) => !options?.signal?.aborted)).toBe(true);
    expect(requests()).toHaveLength(2);
  });
});
