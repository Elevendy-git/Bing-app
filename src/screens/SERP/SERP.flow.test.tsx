import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BingAppPrototype } from "../BingAppPrototype";
import { Search } from "../Search";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (path: string) => {
    const url = new URL(path, "http://localhost");
    const query = url.searchParams.get("query") ?? "";
    return { ok: true, json: async () => url.pathname === "/api/bing-serp"
      ? { query, html: `<p>${query} result</p>`, fetchedAt: "2026-10-15T06:00:00Z" }
      : [query, [query, `${query} today`]] };
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Query to Bing results flow", () => {
  it("opens an unfiltered Recent after submitting a Recent suggestion, retaining existing activity", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const query = screen.getByRole("searchbox", { name: "Search query" });
    fireEvent.change(query, { target: { value: "Weather" } });
    fireEvent.keyDown(query, { key: "Enter" });
    await screen.findByTitle("Bing results for Weather");
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const recentInput = screen.getByRole("searchbox", { name: "Search tabs, recents and bookmarks" });
    fireEvent.focus(recentInput);
    fireEvent.change(recentInput, { target: { value: "123" } });
    const content = screen.getByRole("region", { name: "Recent content" });
    content.scrollTop = 180;
    fireEvent.click(await screen.findByRole("button", { name: "123 today" }));
    await screen.findByTitle("Bing results for 123 today");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));

    expect(screen.getByRole("searchbox", { name: "Search tabs, recents and bookmarks" })).toBe(recentInput);
    expect(recentInput).toHaveValue("");
    expect(recentInput).not.toHaveFocus();
    expect(content.scrollTop).toBe(0);
    expect(screen.queryByRole("region", { name: "Search on Bing" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    const tabs = screen.getByRole("group", { name: "Open tabs cards" });
    expect(within(tabs).getAllByRole("article")).toHaveLength(2);
    expect(tabs).toHaveTextContent("Weather");
    expect(tabs).toHaveTextContent("123 today");
    const history = screen.getByRole("group", { name: "History list" });
    expect(within(history).getByRole("button", { name: "Weather" })).toBeInTheDocument();
    expect(within(history).getByRole("button", { name: "123 today" })).toBeInTheDocument();

    // Returning from a child page resumes the same Recent visit and its draft.
    fireEvent.change(recentInput, { target: { value: "Weather" } });
    fireEvent.click(screen.getByRole("button", { name: "View all history" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
    expect(recentInput).toHaveValue("Weather");
    // Opening Recent from the Home footer starts another unfiltered visit.
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(recentInput).toHaveValue("");
  });

  it("keeps Homepage unpainted throughout SERP/Recent switching and restores it only on Home", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    const home = screen.getByRole("main", { name: "Bing homepage" });
    const homeLayer = home.parentElement!;
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const query = screen.getByRole("searchbox", { name: "Search query" });
    fireEvent.change(query, { target: { value: "Weather" } });
    fireEvent.keyDown(query, { key: "Enter" });
    const results = await screen.findByTitle("Bing results for Weather");
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    await waitFor(() => expect(homeLayer).toHaveStyle({ opacity: "0" }));

    for (let round = 0; round < 2; round++) {
      fireEvent.click(screen.getByRole("button", { name: "Recent" }));
      expect(homeLayer).toHaveStyle({ opacity: "0" });
      expect(homeLayer).toHaveAttribute("inert");
      await waitFor(() => expect(screen.getByRole("main", { name: "Recent page" })).toBeVisible());
      expect(homeLayer).toHaveStyle({ opacity: "0" });
      fireEvent.click(screen.getByRole("button", { name: "Select Weather tab: search-1" }));
      expect(homeLayer).toHaveStyle({ opacity: "0" });
      await waitFor(() => expect(screen.getByRole("main", { name: "Search results" })).toBeVisible());
      expect(homeLayer).toHaveStyle({ opacity: "0" });
      expect(screen.getByTitle("Bing results for Weather")).toBe(results);
    }

    fireEvent.click(screen.getByRole("searchbox", { name: "Edit search query" }));
    expect(homeLayer).toHaveStyle({ opacity: "0" });
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    expect(homeLayer).toHaveStyle({ opacity: "0" });
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    await waitFor(() => expect(homeLayer).toHaveStyle({ opacity: "1" }));
    expect(screen.getByRole("main", { name: "Bing homepage" })).toBe(home);
  });

  it("opens fresh results when a saved search is selected from Search history", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    const input = screen.getByRole("searchbox", { name: "Search query" });
    fireEvent.change(input, { target: { value: "baidu" } });
    fireEvent.keyDown(input, { key: "Enter" });
    const firstResults = await screen.findByTitle("Bing results for baidu");
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const history = screen.getByRole("region", { name: "Recent searches" });
    fireEvent.click(within(history).getByRole("button", { name: "baidu" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    expect(await within(screen.getByRole("main", { name: "Search results" })).findByTitle("Bing results for baidu")).not.toBe(firstResults);
    expect(firstResults.closest("[inert]")).not.toBeNull();
    expect(screen.getByRole("searchbox", { name: "Edit search query" })).toHaveValue("baidu");
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).startsWith("/api/bing-serp?"))).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    expect(within(screen.getByRole("region", { name: "Recent searches" }))
      .getAllByRole("button", { name: "baidu" })).toHaveLength(1);
  });

  it("keeps Recent's browser footer only when entered from SERP and returns to the same query", async () => {
    render(<BingAppPrototype />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search query" }), { target: { value: "Weather" } });
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "Search query" }), { key: "Enter" });
    await screen.findByTitle("Bing results for Weather");
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("searchbox", { name: "Edit search query" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const browserFooter = screen.getByRole("navigation", { name: "Recent browser navigation" });
    const selected = within(browserFooter).getByRole("button", { name: "Recent" });
    expect(selected).toHaveAttribute("aria-current", "page");
    expect(selected.querySelector("svg")).toHaveAttribute("data-icon-variant", "filled");
    await waitFor(() => expect(within(browserFooter).getByRole("img", { name: "Forward" })).toBeVisible());
    expect(screen.queryByRole("navigation", { name: "Bing app navigation" })).not.toBeInTheDocument();
    fireEvent.click(selected);
    expect(screen.getByRole("navigation", { name: "Recent browser navigation" })).toBe(browserFooter);
    expect(screen.queryByRole("main", { name: "Search results" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View all open tabs" }));
    expect(screen.getByRole("main", { name: "Tabs page" })).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("navigation", { name: "Bing app navigation" })).not.toBeInTheDocument());
    expect(screen.queryByRole("navigation", { name: "Recent browser navigation" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "View all open tabs" })).toHaveFocus());
    expect(screen.getByRole("navigation", { name: "Recent browser navigation" })).toBe(browserFooter);
    fireEvent.click(screen.getByRole("button", { name: "View all history" }));
    expect(screen.getByRole("main", { name: "History page" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Bing app navigation" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "View all history" })).toHaveFocus());
    expect(screen.getByRole("navigation", { name: "Recent browser navigation" })).toBe(browserFooter);
    fireEvent.click(screen.getByRole("button", { name: "View all bookmark" }));
    expect(screen.getByRole("main", { name: "Bookmark page" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Bing app navigation" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Travel to Paris folder" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to Bookmark" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Travel to Paris folder" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "View all bookmark" })).toHaveFocus());
    expect(screen.getByRole("navigation", { name: "Recent browser navigation" })).toBe(browserFooter);
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("");
    await waitFor(() => expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "New tab" })).toHaveFocus());
    expect(screen.getByRole("navigation", { name: "Recent browser navigation" })).toBe(browserFooter);
    fireEvent.click(within(browserFooter).getByRole("button", { name: "Back to search results" }));
    expect(screen.getByRole("searchbox", { name: "Edit search query" })).toHaveValue("Weather");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    await waitFor(() => expect(screen.getByRole("navigation", { name: "Bing app navigation" })).toBeVisible());
    expect(screen.queryByRole("navigation", { name: "Recent browser navigation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to search results" })).not.toBeInTheDocument();
  }, 10000);

  it("edits through the composer but returns directly Home through SERP Back without resetting its scroll", async () => {
    render(<BingAppPrototype />);
    const homeInput = screen.getByRole("searchbox", { name: "Search Bing" });
    const homeContent = screen.getByRole("region", { name: "Homepage content" });
    fireEvent.scroll(homeContent, { target: { scrollTop: 384 } });
    fireEvent.focus(homeInput);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search query" }), { target: { value: "Weather" } });
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "Search query" }), { key: "Enter" });
    const results = await screen.findByTitle("Bing results for Weather");
    expect(results).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("searchbox", { name: "Edit search query" }));
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("Weather");
    expect(screen.queryByRole("main", { name: "Search results" })).not.toBeInTheDocument();
    expect(results.closest("[inert]")).not.toBeNull();
    expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(screen.getByRole("main", { name: "Search results" })).toBeVisible());
    expect(screen.getByTitle("Bing results for Weather")).toBe(results);
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(screen.queryByRole("main", { name: "Search page" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(await screen.findByRole("searchbox", { name: "Search Bing" })).toBe(homeInput);
    expect(homeContent.scrollTop).toBe(384);
  });

  it("submits the keyboard Search action and selected suggestions, ignoring blank text and IME confirmation", async () => {
    const onSubmit = vi.fn();
    render(<Search interactive initialState="keyboard" onSubmit={onSubmit} />);
    const input = screen.getByRole("searchbox", { name: "Search query" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "  Weather   today  " } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSubmit).toHaveBeenLastCalledWith("Weather today");
    fireEvent.change(input, { target: { value: "Weather" } });
    const suggestions = await screen.findByRole("group", { name: "Search suggestions" });
    fireEvent.click(await within(suggestions).findByRole("button", { name: /Weather today/ }));
    expect(onSubmit).toHaveBeenLastCalledWith("Weather today");
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("keeps the loaded document on cancel, but starts a fresh navigation on every submit", async () => {
    render(<BingAppPrototype />);
    const requestCount = () => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).startsWith("/api/bing-serp?")).length;
    const submitQuery = async (query: string) => {
      const input = screen.getByRole("searchbox", { name: "Search query" });
      fireEvent.change(input, { target: { value: query } });
      fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
      return screen.findByTitle(`Bing results for ${query}`);
    };
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const firstDocument = await submitQuery("Weather");
    fireEvent.click(screen.getByRole("searchbox", { name: "Edit search query" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search query" }), { target: { value: "unfinished edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("searchbox", { name: "Edit search query" })).toHaveFocus());
    expect(screen.getByTitle("Bing results for Weather")).toBe(firstDocument);
    expect(requestCount()).toBe(1);
    fireEvent.click(screen.getByRole("searchbox", { name: "Edit search query" }));
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("Weather");
    const secondDocument = await submitQuery("News");
    expect(firstDocument).not.toBeInTheDocument();
    expect(requestCount()).toBe(2);
    fireEvent.click(screen.getByRole("searchbox", { name: "Edit search query" }));
    expect(await submitQuery("News")).not.toBe(secondDocument);
    expect(requestCount()).toBe(3);
  });
});
