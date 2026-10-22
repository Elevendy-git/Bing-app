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
  it("keeps Recent's browser footer only when entered from SERP and returns to the same query", async () => {
    render(<BingAppPrototype />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search query" }), { target: { value: "Weather" } });
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "Search query" }), { key: "Enter" });
    await screen.findByTitle("Bing results for Weather");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const browserFooter = screen.getByRole("navigation", { name: "Recent browser navigation" });
    const selected = within(browserFooter).getByRole("button", { name: "Recent" });
    expect(selected).toHaveAttribute("aria-current", "page");
    expect(selected.querySelector("svg")).toHaveAttribute("data-icon-variant", "filled");
    expect(within(browserFooter).getByRole("img", { name: "Forward" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Bing app navigation" })).not.toBeInTheDocument();
    fireEvent.click(selected);
    expect(screen.getByRole("navigation", { name: "Recent browser navigation" })).toBe(browserFooter);
    expect(screen.queryByRole("main", { name: "Search results" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View all open tabs" }));
    expect(screen.getByRole("main", { name: "Tabs page" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Bing app navigation" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Recent browser navigation" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "View all open tabs" })).toHaveFocus());
    expect(screen.getByRole("navigation", { name: "Recent browser navigation" })).toBe(browserFooter);
    fireEvent.click(screen.getByRole("button", { name: "View all history" }));
    expect(screen.getByRole("main", { name: "History page" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Bing app navigation" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "View all history" })).toHaveFocus());
    expect(screen.getByRole("navigation", { name: "Recent browser navigation" })).toBe(browserFooter);
    fireEvent.click(screen.getByRole("button", { name: "View all bookmark" }));
    expect(screen.getByRole("main", { name: "Bookmark page" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Bing app navigation" })).toBeVisible();
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
    await waitFor(() => expect(screen.getByRole("button", { name: "New tab" })).toHaveFocus());
    expect(screen.getByRole("navigation", { name: "Recent browser navigation" })).toBe(browserFooter);
    fireEvent.click(within(browserFooter).getByRole("button", { name: "Back to search results" }));
    expect(screen.getByRole("searchbox", { name: "Edit search query" })).toHaveValue("Weather");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.getByRole("navigation", { name: "Bing app navigation" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Recent browser navigation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to search results" })).not.toBeInTheDocument();
  }, 10000);

  it("submits Enter, preserves the query while editing, and restores Home without resetting its scroll", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
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
