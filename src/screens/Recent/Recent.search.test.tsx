import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Recent } from "./Recent";
import { bookmarkSearchEntries } from "../Bookmark/Bookmark.data";
import { filterRecentEntries, filterRecentTabs } from "./recentSearch";

const emptyActivity = { tabs: [], historyEntries: [], conversationEntries: [], bookmarkEntries: [] };
const searchInput = () => screen.getByRole("searchbox", { name: "Search tabs, recents and bookmarks" });
const type = (value: string) => fireEvent.change(searchInput(), { target: { value } });
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (path: string) => {
    const query = new URL(path, "http://localhost").searchParams.get("query");
    return { ok: true, json: async () => [query, [query, `${query} forecast`, `${query} today`, `${query} hk`, `${query} nanning`]] };
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Recent search", () => {
  it("retains the zero-input content and opens the keyboard on focus, without requesting suggestions", () => {
    render(<Recent onSearchSubmit={vi.fn()} />);
    fireEvent.focus(searchInput());
    expect(searchInput()).toHaveValue("");
    expect(screen.getByRole("group", { name: "Recent search box" })).toHaveAttribute("data-state", "focus");
    expect(screen.getByRole("region", { name: "Open tabs" })).toBeVisible();
    expect(screen.getByRole("group", { name: "History list" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Search on Bing" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    expect(screen.queryByRole("img", { name: "New tab" })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("searches the full collections, appends AS last and restores the preview when cleared", async () => {
    const tabs = Array.from({ length: 6 }, (_, i) => ({ id: `tab-${i}`, title: i < 2 ? `Other ${i}` : `Open tab ${i}` }));
    const history = Array.from({ length: 6 }, (_, i) => ({ id: `history-${i}`, title: i < 3 ? `Other ${i}` : `Open history ${i}`, subtitle: `https://example.com/${i}` }));
    const bookmarks = [{ id: "saved", title: "Open bookmark", subtitle: "https://example.org" }];
    const onSubmit = vi.fn();
    render(<Recent tabs={tabs} historyEntries={history} bookmarkEntries={[]} searchableBookmarks={bookmarks}
      conversationEntries={[{ id: "chat", title: "Open project", subtitle: "Today" }]} onSearchSubmit={onSubmit} />);
    expect(within(screen.getByRole("group", { name: "Open tabs cards" })).getAllByRole("article")).toHaveLength(3);
    type(" OPEN ");
    expect(within(screen.getByRole("group", { name: "Open tabs cards" })).getAllByRole("article")).toHaveLength(4);
    expect(screen.queryByText("View all")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "History list" })).toHaveTextContent("Open history 5");
    expect(screen.getByRole("group", { name: "Bookmark list" })).toHaveTextContent("Open bookmark");
    expect(screen.getByRole("group", { name: "Copilot history list" })).toHaveTextContent("Open project");
    const suggestions = await screen.findByRole("group", { name: "Search suggestions" });
    expect(within(suggestions).getAllByRole("button")).toHaveLength(5);
    expect(screen.getByRole("region", { name: "Bookmark" }).compareDocumentPosition(suggestions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("region", { name: "Search on Bing" }).querySelector('button[data-variant="section-header"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear search query" }));
    expect(searchInput()).toHaveValue("");
    expect(searchInput()).toHaveFocus();
    expect(screen.queryByRole("region", { name: "Search on Bing" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Open tabs cards" })).getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("group", { name: "History list" })).toHaveTextContent("Other 0");
    expect(screen.queryByRole("region", { name: "Bookmark" })).not.toBeInTheDocument();
    expect(tabs).toHaveLength(6);
    expect(history).toHaveLength(6);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows only five AS rows when local content does not match, with no empty-activity illustration", async () => {
    const submit = vi.fn();
    render(<Recent {...emptyActivity} onSearchSubmit={submit} />);
    type("Weather");
    const suggestions = await screen.findByRole("group", { name: "Search suggestions" });
    expect(within(suggestions).getAllByRole("button")).toHaveLength(5);
    expect(screen.getAllByRole("region").map(region => region.getAttribute("aria-label"))).toEqual(["Recent content", "Search on Bing"]);
    expect(screen.queryByText("Your activity will appear here")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Search on Bing" }).querySelector('[data-variant="section-header"]'))
      .toHaveStyle({ "--gnrc-list-section-padding-top": "12px" });
    const forecast = within(suggestions).getByRole("button", { name: "Weather forecast" });
    expect(forecast.querySelector('[class*="titleEmphasis"]')).toHaveTextContent("forecast");
    expect(forecast.querySelectorAll("img")).toHaveLength(0);
    // Recent and Search share the leading search icon and trailing arrow.
    expect(forecast.querySelectorAll("svg")).toHaveLength(2);
    fireEvent.click(forecast);
    expect(submit).toHaveBeenCalledWith("Weather forecast");
  });

  it("marks AS from actual Bing visits, rather than similar titles, and updates when a visit is removed", async () => {
    const visits = [
      { id: "bing", title: "Weather forecast", subtitle: "https://www.bing.com/search?q=WEATHER+forecast" },
      { id: "site", title: "Weather today", subtitle: "https://example.com/weather-today" },
    ];
    const onSearchSubmit = vi.fn();
    const { rerender } = render(<Recent {...emptyActivity} historyEntries={visits} onSearchSubmit={onSearchSubmit} />);
    type("Weather");
    const suggestions = await screen.findByRole("group", { name: "Search suggestions" });
    expect(within(suggestions).getAllByRole("img", { name: "From search history" })).toHaveLength(1);
    expect(within(suggestions).getAllByRole("img", { name: "Suggested query" })).toHaveLength(4);
    expect(within(suggestions).getByRole("button", { name: "Weather forecast" })).toContainElement(
      within(suggestions).getByRole("img", { name: "From search history" }));
    rerender(<Recent {...emptyActivity} historyEntries={[visits[1]]} onSearchSubmit={onSearchSubmit} />);
    expect(within(suggestions).queryByRole("img", { name: "From search history" })).toBeNull();
    expect(within(suggestions).getAllByRole("img", { name: "Suggested query" })).toHaveLength(5);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("submits the typed query with Enter, guards IME composition, and preserves the draft on Escape", () => {
    const submit = vi.fn();
    render(<Recent {...emptyActivity} onSearchSubmit={submit} />);
    type("   ");
    fireEvent.keyDown(searchInput(), { key: "Enter" });
    type("  cats   & dogs  ");
    fireEvent.keyDown(searchInput(), { key: "Enter", isComposing: true });
    expect(submit).not.toHaveBeenCalled();
    fireEvent.keyDown(searchInput(), { key: "Enter" });
    expect(submit).toHaveBeenCalledWith("cats & dogs");
    fireEvent.keyDown(searchInput(), { key: "Escape" });
    expect(searchInput()).toHaveValue("  cats   & dogs  ");
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
  });

  it("keeps matched tab and history navigation attached to their original identity", () => {
    const selectTab = vi.fn();
    const openHistory = vi.fn();
    render(<Recent {...emptyActivity} onSearchSubmit={vi.fn()} onSelectTab={selectTab} onOpenHistorySearch={openHistory}
      tabs={[{ id: "saved-tab", title: "Cats tab", query: "cats & dogs" }]}
      historyEntries={[{ id: "visit", title: "Cats visit", subtitle: "https://www.bing.com/search?q=cats+%26+dogs" }]} />);
    type("cats");
    fireEvent.click(screen.getByRole("button", { name: "Select Cats tab tab: saved-tab" }));
    expect(selectTab).toHaveBeenCalledWith("saved-tab");
    fireEvent.click(screen.getByRole("button", { name: "Cats visit" }));
    expect(openHistory).toHaveBeenCalledWith("cats & dogs");
  });

  it("cancels suggestion requests while hidden and retains the draft without stealing focus", async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    const submit = vi.fn();
    const { rerender } = render(<Recent {...emptyActivity} onSearchSubmit={submit} />);
    type("Weather");
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    rerender(<Recent {...emptyActivity} onSearchSubmit={submit} active={false} />);
    expect(signal?.aborted).toBe(true);
    fireEvent.keyDown(searchInput(), { key: "Enter" });
    expect(submit).not.toHaveBeenCalled();
    expect(searchInput()).toHaveValue("Weather");
    rerender(<Recent {...emptyActivity} onSearchSubmit={submit} active />);
    expect(searchInput()).not.toHaveFocus();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it("keeps no-match Key screens passive and uses the Figma AS artwork without sample logos", () => {
    render(<Recent initialQuery="Weather" />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    const suggestions = screen.getByRole("group", { name: "Search suggestions" });
    expect(suggestions.querySelectorAll('[data-variant="as"]')).toHaveLength(5);
    expect(suggestions.querySelectorAll("img")).toHaveLength(0);
    expect(within(suggestions).queryByRole("button")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Recent matching", () => {
  it("matches all words case-insensitively across title and decoded URL without losing literal punctuation", () => {
    const entries = [
      { id: "cpp", title: "C++ guide", subtitle: "https://example.com/learn" },
      { id: "jp", title: "Travel", subtitle: "https://www.bing.com/search?q=%E6%9D%B1%E4%BA%AC+food" },
      { id: "url", title: "A site", subtitle: "https://EXAMPLE.com/paris" },
    ];
    expect(filterRecentEntries(entries, " c++  GUIDE ").map(e => e.id)).toEqual(["cpp"]);
    expect(filterRecentEntries(entries, "東京 food").map(e => e.id)).toEqual(["jp"]);
    expect(filterRecentEntries(entries, "example paris").map(e => e.id)).toEqual(["url"]);
    expect(filterRecentEntries(entries, "unmatched")).toEqual([]);
    expect(filterRecentEntries(entries, " ")).toEqual(entries);
    expect(filterRecentTabs([{ id: "tab", title: "Title", query: "cats & dogs" }], "DOGS cats")).toHaveLength(1);
  });

  it("includes real saved sites nested in folders without inventing unavailable folder contents", () => {
    const site = { id: "saved", title: "Weather", subtitle: "https://example.com", kind: "site" as const };
    expect(bookmarkSearchEntries([
      { id: "folder", title: "Folder", kind: "folder", favoriteCount: 1, children: [site] },
      { id: "unknown", title: "Unknown", kind: "folder", favoriteCount: 5 },
    ])).toEqual([site]);
  });
});
