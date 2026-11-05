import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { BingAppPrototype } from "./BingAppPrototype";
import { PreviewWorkbench } from "../components/PreviewWorkbench";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (path: string) => {
    const url = new URL(path, "http://localhost");
    const query = url.searchParams.get("query") ?? "";
    return { ok: true, json: async () => url.pathname === "/api/bing-serp"
      ? { query, html: `<p>Search results for ${query}</p>`, sourceUrl: `https://www.bing.com/search?${new URLSearchParams({ q: query })}`,
          faviconUrl: "https://www.bing.com/favicon.ico", fetchedAt: new Date().toISOString() }
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
  it("searches Recent activity and opens an AS as a new result tab without replacing the previous one", async () => {
    renderPrototype();
    openSearch();
    await submit("Tokyo");
    fireEvent.click(screen.getByRole("searchbox", { name: "Edit search query" }));
    await submit("Tokyo guide");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const input = screen.getByRole("searchbox", { name: "Search tabs, recents and bookmarks" });
    fireEvent.change(input, { target: { value: "Tokyo" } });
    const suggestions = await screen.findByRole("group", { name: "Search suggestions" });
    fireEvent.click(within(suggestions).getByRole("button", { name: "Tokyo today" }));
    expect(screen.getByRole("searchbox", { name: "Edit search query" })).toHaveValue("Tokyo today");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(input).toHaveValue("");
    const tabs = within(screen.getByRole("group", { name: "Open tabs cards" }));
    expect(tabs.getAllByRole("article")).toHaveLength(2);
    expect(tabs.getByText("Tokyo guide")).toBeVisible();
    expect(tabs.getByText("Tokyo today")).toBeVisible();
    const history = screen.getByRole("group", { name: "History list" });
    expect(within(history).getByText("Tokyo today")).toBeVisible();
    expect(within(history).getByText("Tokyo guide")).toBeVisible();
  });

  it("keeps empty Search content blank across navigation and Reset", async () => {
    renderPrototype();
    openSearch();
    expect(screen.getByRole("region", { name: "Search content" }).textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    openSearch();
    expect(screen.getByRole("region", { name: "Search content" }).textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Reset prototype" }));
    openSearch();
    expect(screen.getByRole("region", { name: "Search content" }).textContent).toBe("");
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("search-discovery"))).toBe(false);
  });

  it("starts the actual App empty and does not save typing, blank submissions, or cancelled searches", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    const input = screen.getByRole("searchbox", { name: "Search query" });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.queryByRole("main", { name: "Search results" })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "Unsaved draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible());
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
    await waitFor(() => expect(within(tabs).getByText("weather today")).toBeVisible());
    // The page document and favicon come from the loaded result, not OpenAI fixtures.
    expect(tabs.querySelector("iframe")).toHaveAttribute("srcdoc", "<p>Search results for weather today</p>");
    expect(tabs.querySelector("img")).toHaveAttribute("src", "https://www.bing.com/favicon.ico");
    const history = screen.getByRole("group", { name: "History list" });
    expect(within(history).getByText("Weather today")).toBeVisible();
    expect(within(history).getByText("weather today")).toBeVisible();
    expect(within(history).getAllByText("https://www.bing.com/search?q=weather+today")).toHaveLength(1);
    expect(Array.from(history.querySelectorAll("img"), image => image.getAttribute("src")))
      .toEqual(["https://www.bing.com/favicon.ico", "https://www.bing.com/favicon.ico"]);
    expect(screen.queryByRole("region", { name: "Bookmark" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Copilot history" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View all tabs" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    const searches = screen.getByRole("region", { name: "Recent searches" });
    expect(searches.querySelectorAll("[data-history-id]")).toHaveLength(1);
    expect(searches.querySelector("[data-history-id]")).toHaveTextContent("weather today");
    expect(within(searches).queryByText("Weather today")).not.toBeInTheDocument();
    await submit("Tokyo");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(within(screen.getByRole("group", { name: "Open tabs cards" })).getAllByRole("article")).toHaveLength(2);
    const previews = screen.getByRole("group", { name: "Open tabs cards" }).querySelectorAll("iframe");
    expect(Array.from(previews, frame => frame.getAttribute("srcdoc")))
      .toEqual(["<p>Search results for Tokyo</p>", "<p>Search results for weather today</p>"]);
    await waitFor(() => expect(within(screen.getByRole("group", { name: "History list" })).getByText("Tokyo")).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "View all history" }));
    expect(screen.getByText("Today")).toBeVisible();
    expect(within(screen.getByRole("main", { name: "History page" })).getByText("Tokyo")).toBeVisible();
  });

  it.each(["Recent", "History"])("reopens a recorded query from %s without overwriting the last edited tab", async (origin) => {
    renderPrototype();
    openSearch();
    await submit("cats & dogs");
    fireEvent.click(screen.getByRole("searchbox", { name: "Edit search query" }));
    await submit("Tokyo");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    if (origin === "History") {
      fireEvent.click(screen.getByRole("button", { name: "View all history" }));
      fireEvent.click(screen.getByRole("button", { name: "Options for cats & dogs, Today" }));
      const menu = screen.getByRole("menu", { name: "History item options" });
      expect(screen.queryByRole("main", { name: "Search results" })).not.toBeInTheDocument();
      fireEvent.keyDown(menu, { key: "Escape" });
      await waitFor(() => expect(menu).not.toBeInTheDocument());
    }
    const history = screen.getByRole("group", { name: origin === "Recent" ? "History list" : "Today history" });
    fireEvent.click(within(history).getByRole("button", { name: "cats & dogs" }));
    expect(screen.getByRole("searchbox", { name: "Edit search query" })).toHaveValue("cats & dogs");
    expect(screen.queryByRole("main", { name: "Search page" })).not.toBeInTheDocument();
    await screen.findByTitle("Bing results for cats & dogs");
    const lastRequest = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).startsWith("/api/bing-serp")).at(-1)?.[0];
    expect(new URL(String(lastRequest), "http://localhost").searchParams.get("query")).toBe("cats & dogs");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const tabs = within(screen.getByRole("group", { name: "Open tabs cards" }));
    expect(tabs.getAllByRole("article")).toHaveLength(2);
    await waitFor(() => expect(tabs.getByText("Tokyo")).toBeVisible());
    await waitFor(() => expect(tabs.getByText("cats & dogs")).toBeVisible());
    expect(screen.getByRole("button", { name: "Back to search results" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to search results" }));
    expect(screen.getByRole("searchbox", { name: "Edit search query" })).toHaveValue("cats & dogs");
  });

  it("keeps Private searches out of normal history and tabs", async () => {
    renderPrototype();
    openSearch();
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    await submit("Private query");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    await waitFor(() => expect(screen.getByRole("region", { name: "InPrivate activity" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    await submit("Public query");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    await waitFor(() => expect(within(screen.getByRole("group", { name: "History list" })).getByText("Public query")).toBeVisible());
    expect(screen.queryByText("Private query")).not.toBeInTheDocument();
  });

  it("does not recreate a closed tab when its pending page finishes loading", async () => {
    let finish!: (response: unknown) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise(resolve => { finish = resolve as typeof finish; }));
    renderPrototype();
    openSearch();
    await submit("Pending page");
    const request = vi.mocked(fetch).mock.calls.find(([url]) => String(url).startsWith("/api/bing-serp"));
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    fireEvent.click(screen.getByRole("button", { name: "Close Pending page tab: search-1" }));
    expect(screen.queryByRole("region", { name: "Open tabs" })).not.toBeInTheDocument();
    expect(request?.[1]?.signal?.aborted).toBe(true);
    await act(async () => finish({ ok: true, json: async () => ({ query: "Pending page", html: "<p>Loaded later</p>",
      sourceUrl: "https://www.bing.com/search?q=Pending+page", faviconUrl: "https://www.bing.com/favicon.ico", fetchedAt: new Date().toISOString() }) }));
    expect(screen.queryByTitle("Bing results for Pending page")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Open tabs" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "History list" })).toHaveTextContent("https://www.bing.com/search?q=Pending+page");
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
    await waitFor(() => expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("");
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    await submit("After reset");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const history = screen.getByRole("group", { name: "History list" });
    await waitFor(() => expect(within(history).getByText("After reset")).toBeVisible());
    expect(within(history).queryByText("Before reset")).not.toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Open tabs cards" })).getAllByRole("article")).toHaveLength(1);
  });
});
