import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { BingAppPrototype } from "./BingAppPrototype";
import { PreviewWorkbench } from "../components/PreviewWorkbench";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (path: string) => {
    const url = new URL(path, "http://localhost");
    const query = url.searchParams.get("query") ?? "";
    return { ok: true, json: async () => url.pathname === "/api/bing-serp"
      ? { query, html: "<p>Search results</p>", fetchedAt: new Date().toISOString() }
      : [query, [query, `${query} today`]] };
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function renderPrototype() {
  return render(<PreviewWorkbench title="Homepage" screens={[
    { id: "recent", title: "Recent", content: <BingAppPrototype initialPage="recent" /> },
  ]}>
    <BingAppPrototype initialRecentState="empty" />
  </PreviewWorkbench>);
}

function openSearch() {
  fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
}

async function submit(query: string) {
  const input = screen.getByRole("searchbox", { name: "Search query" });
  fireEvent.change(input, { target: { value: query } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
  expect(screen.getByRole("searchbox", { name: "Edit search query" })).toHaveValue(query.trim().replace(/\s+/g, " "));
}

describe("Prototype activity", () => {
  it("retains hidden Search sections across navigation and restores them with Reset", async () => {
    renderPrototype();
    openSearch();
    fireEvent.click(screen.getByRole("button", { name: "Hide You might like" }));
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    openSearch();
    expect(screen.getByRole("button", { name: "Show You might like" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Hide What’s trending" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Reset prototype" }));
    openSearch();
    expect(screen.getByRole("button", { name: "Hide You might like" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Hide What’s trending" })).toHaveAttribute("aria-expanded", "true");
  });

  it("starts the actual App empty and does not save typing, blank submissions, or cancelled searches", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    const input = screen.getByRole("searchbox", { name: "Search query" });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.queryByRole("main", { name: "Search results" })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "Unsaved draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
  });

  it("records submitted queries, deduplicates Search history, reuses an edited tab and creates a tab from +", async () => {
    renderPrototype();
    openSearch();
    await submit("  Weather   today  ");
    fireEvent.click(screen.getByRole("searchbox", { name: "Edit search query" }));
    await submit("weather today");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const tabs = screen.getByRole("group", { name: "Open tabs cards" });
    expect(within(tabs).getAllByRole("article")).toHaveLength(1);
    expect(within(tabs).getByText("weather today")).toBeVisible();
    // Live activity must not fall back to the OpenAI design thumbnail or favicon.
    expect(tabs.querySelector("img")).toBeNull();
    const history = screen.getByRole("group", { name: "History list" });
    expect(within(history).getByText("Weather today")).toBeVisible();
    expect(within(history).getByText("weather today")).toBeVisible();
    expect(within(history).getAllByText("https://www.bing.com/search?q=weather+today")).toHaveLength(1);
    expect(screen.queryByRole("group", { name: "Bookmark list" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Copilot history list" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    const searches = screen.getByRole("region", { name: "Recent searches" });
    expect(searches.querySelectorAll("[data-history-id]")).toHaveLength(1);
    expect(searches.querySelector("[data-history-id]")).toHaveTextContent("weather today");
    expect(within(searches).queryByText("Weather today")).not.toBeInTheDocument();
    await submit("Tokyo");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(within(screen.getByRole("group", { name: "Open tabs cards" })).getAllByRole("article")).toHaveLength(2);
    expect(within(screen.getByRole("group", { name: "History list" })).getByText("Tokyo")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "View all history" }));
    expect(screen.getByText("Today")).toBeVisible();
    expect(within(screen.getByRole("main", { name: "History page" })).getByText("Tokyo")).toBeVisible();
  });

  it("keeps Private searches out of normal history and tabs", async () => {
    renderPrototype();
    openSearch();
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    await submit("Private query");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    await submit("Public query");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(within(screen.getByRole("group", { name: "History list" })).getByText("Public query")).toBeVisible();
    expect(screen.queryByText("Private query")).not.toBeInTheDocument();
  });

  it.each(["Search", "Recent", "SERP"])("resets from %s, retaining appearance and clearing activity before a new search", async (page) => {
    renderPrototype();
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    openSearch();
    await submit("Before reset");
    if (page === "Search") fireEvent.click(screen.getByRole("searchbox", { name: "Edit search query" }));
    if (page === "Recent") fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset prototype" }));
    expect(screen.getByRole("main", { name: "Bing homepage" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Bing app preview" })).toHaveAttribute("data-theme", "dark");
    expect(screen.queryByRole("main", { name: "Search results" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("");
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    await submit("After reset");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const history = screen.getByRole("group", { name: "History list" });
    expect(within(history).getByText("After reset")).toBeVisible();
    expect(within(history).queryByText("Before reset")).not.toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Open tabs cards" })).getAllByRole("article")).toHaveLength(1);
  });
});
