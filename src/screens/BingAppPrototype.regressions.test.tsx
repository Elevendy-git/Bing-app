import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BingAppPrototype } from "./BingAppPrototype";
import { normalizeSearchQuery } from "../services/searchSuggestions";

vi.mock("motion/react", async original => ({
  ...await original<typeof import("motion/react")>(), useReducedMotion: () => true,
}));
beforeEach(() => vi.stubGlobal("fetch", vi.fn(async (path: string) => {
  const endpoint = new URL(path, "http://localhost");
  // Match the server contract: repeated whitespace is collapsed in its response.
  const query = normalizeSearchQuery(endpoint.searchParams.get("query") ?? "");
  const url = endpoint.searchParams.get("url") ?? "https://example.com/article";
  return { ok: true, json: async () => endpoint.pathname === "/api/bing-serp"
    ? { query, html: "<p>Results</p>", sourceUrl: `https://www.bing.com/search?${new URLSearchParams({ q: query })}`, fetchedAt: "2026-10-27T00:00:00Z" }
    : endpoint.pathname === "/api/web-page"
      ? { requestedUrl: url, sourceUrl: url, title: "Article", html: "<p>Article</p>", fetchedAt: "2026-10-27T00:00:00Z" }
      : [query, [query]] };
})));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const edit = () => fireEvent.click(screen.getByRole("searchbox", { name: "Edit search query" }));
async function submit(value: string) {
  const input = screen.getByRole("searchbox", { name: "Search query" });
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
  const frame = await screen.findByTitle(`Bing results for ${value}`);
  fireEvent.load(frame);
  return frame;
}
function navigate(frame: HTMLElement, url: string) {
  const channel = frame.getAttribute("srcdoc")!.match(/nonce="([^"]+)"/)![1];
  fireEvent(window, new MessageEvent("message", { source: (frame as HTMLIFrameElement).contentWindow,
    data: { type: "bing-iab-navigate", channel, url } }));
}

describe("Reported app flow regressions", () => {
  it.each(["Recent", "History"])("removes a query from Search after its last visit is deleted in %s", async origin => {
    render(<BingAppPrototype initialRecentState="empty" />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    await submit("Weather");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    if (origin === "History") fireEvent.click(screen.getByRole("button", { name: "View all history" }));
    fireEvent.click(screen.getByRole("button", { name: origin === "Recent" ? "Options for Weather" : "Options for Weather, Today" }));
    const menu = screen.getByRole("menu", { name: "History item options" });
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(menu).not.toBeInTheDocument());
    if (origin === "History") fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
    expect(screen.queryByRole("group", { name: "History list" })).toBeNull();
    // The existing open tab is independent of deleting the query's history.
    expect(within(screen.getByRole("group", { name: "Open tabs cards" })).getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.queryByRole("region", { name: "Recent searches" })).toBeNull();
    expect(screen.getByRole("region", { name: "Search content" }).textContent).toBe("");
  });

  it("keeps a deduplicated query until its last case-insensitive browsing visit is removed", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    await submit("Weather");
    edit();
    await submit("weather");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    fireEvent.click(screen.getByRole("button", { name: "Options for weather" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "History item options" })).getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.getByRole("region", { name: "Recent searches" })).toHaveTextContent("weather");
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Options for Weather" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "History item options" })).getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.queryByRole("region", { name: "Recent searches" })).toBeNull();
  });

  it("adds a related Bing query once, without Back/Forward resurrecting deleted history", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const results = await submit("Weather");
    navigate(results, "https://www.bing.com/search?q=Forecast");
    fireEvent.load(await screen.findByTitle("Bing results for Forecast"));
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const searches = screen.getByRole("region", { name: "Recent searches" });
    expect(searches.querySelectorAll("[data-history-id]")).toHaveLength(2);
    expect(searches).toHaveTextContent("Forecast");
    expect(searches).toHaveTextContent("Weather");
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    fireEvent.click(screen.getByRole("button", { name: "Options for Forecast" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "History item options" })).getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Select Forecast tab: search-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.getByRole("group", { name: "History list" })).not.toHaveTextContent("Forecast");
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.getByRole("region", { name: "Recent searches" })).toHaveTextContent("Weather");
    expect(screen.getByRole("region", { name: "Recent searches" })).not.toHaveTextContent("Forecast");
  });

  it("normalizes related-search whitespace for requests, deduplication and last-visit deletion", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const results = await submit("Weather forecast");
    navigate(results, "https://www.bing.com/search?q=wEaThEr+++forecast");
    fireEvent.load(await screen.findByTitle("Bing results for wEaThEr forecast"));
    const requests = vi.mocked(fetch).mock.calls.map(([path]) => new URL(String(path), "http://localhost"))
      .filter(url => url.pathname === "/api/bing-serp");
    expect(requests.map(url => url.searchParams.get("query"))).toEqual(["Weather forecast", "wEaThEr forecast"]);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const searches = screen.getByRole("region", { name: "Recent searches" });
    expect(searches.querySelectorAll("[data-history-id]")).toHaveLength(1);
    expect(searches).toHaveTextContent("wEaThEr forecast");
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    fireEvent.click(screen.getByRole("button", { name: "Options for wEaThEr forecast" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "History item options" })).getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.getByRole("region", { name: "Recent searches" }).querySelectorAll("[data-history-id]")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Options for Weather forecast" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "History item options" })).getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(screen.queryByRole("group", { name: "History list" })).toBeNull();
    // Both retained documents remain navigable, without recreating either visit.
    fireEvent.click(screen.getByRole("button", { name: "Select wEaThEr forecast tab: search-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.queryByRole("group", { name: "History list" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.queryByRole("region", { name: "Recent searches" })).toBeNull();
  });

  it("does not add private related searches or ordinary webpages to normal query history", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const publicResults = await submit("Weather");
    navigate(publicResults, "https://example.com/article");
    fireEvent.load(await screen.findByTitle("Web page: https://example.com/article"));
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    fireEvent.click(screen.getByRole("button", { name: "Options for Article" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "History item options" })).getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.getByRole("region", { name: "Recent searches" })).toHaveTextContent("Weather");
    expect(screen.getByRole("region", { name: "Recent searches" }).querySelectorAll("[data-history-id]")).toHaveLength(1);
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    const privateResults = await submit("Secret");
    navigate(privateResults, "https://www.bing.com/search?q=Private+related");
    fireEvent.load(await screen.findByTitle("Bing results for Private related"));
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    expect(screen.getByRole("region", { name: "Recent searches" })).toHaveTextContent("Weather");
    expect(screen.getByRole("region", { name: "Recent searches" })).not.toHaveTextContent(/Secret|Private related|Article/);
  });

  it.each([false, true])("cancelling an opposite-mode edit restores the existing result's privacy (%s)", async privateMode => {
    render(<BingAppPrototype initialRecentState="empty" initialPrivateMode={privateMode} />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const results = await submit("Weather");
    edit();
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    expect(screen.getByRole("switch", { name: "InPrivate" })).toHaveAttribute("aria-checked", String(!privateMode));
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    navigate(results, "https://example.com/article");
    fireEvent.load(await screen.findByTitle("Web page: https://example.com/article"));
    edit();
    expect(screen.getByRole("switch", { name: "InPrivate" })).toHaveAttribute("aria-checked", String(privateMode));
    await submit("Another query");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    if (privateMode) {
      await waitFor(() => expect(screen.getByRole("region", { name: "InPrivate activity" })).toBeVisible());
      expect(screen.queryByRole("group", { name: "History list" })).toBeNull();
      expect(screen.queryByRole("group", { name: "Open tabs cards" })).toBeNull();
    } else {
      expect(screen.getByRole("group", { name: "History list" })).toHaveTextContent("Another query");
      expect(screen.getByRole("group", { name: "History list" })).toHaveTextContent("Article");
    }
  });

  it("clears Search records in Recent too, retaining webpages and open tabs", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const results = await submit("Weather");
    navigate(results, "https://example.com/article");
    const article = await screen.findByTitle("Web page: https://example.com/article");
    fireEvent.load(article);
    // In-document Bing searches enter Recent without going through the Search field.
    navigate(article, "https://www.bing.com/search?q=Forecast");
    fireEvent.load(await screen.findByTitle("Bing results for Forecast"));
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit search history" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Recent searches" })).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const history = screen.getByRole("group", { name: "History list" });
    expect(history).toHaveTextContent("Article");
    expect(history).not.toHaveTextContent("Weather");
    expect(history).not.toHaveTextContent("Forecast");
    expect(history.querySelectorAll('[data-variant="bing-search-history"]')).toHaveLength(1);
    expect(within(screen.getByRole("group", { name: "Open tabs cards" })).getAllByRole("article")).toHaveLength(1);
  });

  it("uses the currently displayed URL for both the editing field and its transition artwork", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const results = await submit("Weather");
    navigate(results, "https://example.com/article");
    fireEvent.load(await screen.findByTitle("Web page: https://example.com/article"));
    edit();
    const search = screen.getByRole("main", { name: "Search page" });
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("https://example.com/article");
    expect(search.querySelector('[data-variant="serp"]')).toHaveTextContent("https://example.com/article");
    expect(search.querySelector('[data-variant="serp"]')).not.toHaveTextContent("Weather");
  });
});
