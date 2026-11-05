import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BingAppPrototype } from "./BingAppPrototype";
import { Recent } from "./Recent";

vi.mock("motion/react", async original => ({
  ...await original<typeof import("motion/react")>(), useReducedMotion: () => true,
}));
beforeEach(() => vi.stubGlobal("fetch", vi.fn(async (path: string) => {
  const endpoint = new URL(path, "http://localhost");
  const query = endpoint.searchParams.get("query") ?? "";
  const url = endpoint.searchParams.get("url") ?? "";
  return { ok: true, json: async () => endpoint.pathname === "/api/bing-serp"
    ? { query, html: `<p>Results for ${query}</p>`, sourceUrl: `https://www.bing.com/search?${new URLSearchParams({ q: query })}`, fetchedAt: "2026-10-27T00:00:00Z" }
    : endpoint.pathname === "/api/web-page"
      ? { requestedUrl: url, sourceUrl: url, title: "Private article", html: "<p>Article</p>", fetchedAt: "2026-10-27T00:00:00Z" }
      : [query, [query, `${query} today`]] };
})));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function submit(value: string) {
  const input = screen.getByRole("searchbox", { name: "Search query" });
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
  const frame = await screen.findByTitle(`Bing results for ${value}`);
  fireEvent.load(frame);
  return frame;
}
async function expectPrivateRecent(footer: "app" | "browser") {
  const recent = screen.getByRole("main", { name: "Recent page" });
  expect(recent).toHaveAttribute("data-private-mode", "true");
  await waitFor(() => expect(within(recent).getByRole("region", { name: "InPrivate activity" })).toBeVisible());
  expect(within(recent).getByText(/Turn off the private mode/)).toBeVisible();
  for (const section of ["Open tabs", "History", "Copilot history", "Bookmark", "Recent content"]) {
    expect(within(recent).queryByRole("region", { name: section })).toBeNull();
  }
  expect(within(recent).queryByRole("searchbox")).toBeNull();
  expect(within(recent).queryByRole("button", { name: "New tab" })).toBeNull();
  expect(within(recent).queryByRole("group", { name: "iOS keyboard" })).toBeNull();
  expect(within(recent).getByRole("navigation", { name: footer === "app" ? "Bing app navigation" : "Recent browser navigation" })).toBeVisible();
  return recent;
}

describe("Private mode screens and flow (C2 970:14091)", () => {
  it("gates populated Recent from Home, then restores every normal collection and the account avatar", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    const sections = ["Open tabs cards", "History list", "Copilot history list", "Bookmark list"];
    const before = sections.map(name => screen.getByRole("group", { name }).textContent);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    expect(screen.getByRole("img", { name: "Private mode" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    await expectPrivateRecent("app");
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    expect(sections.map(name => screen.getByRole("group", { name }).textContent)).toEqual(before);
    await waitFor(() => expect(screen.getByRole("region", { name: "Recent content" })).toHaveFocus());
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    await waitFor(() => expect(screen.getByRole("img", { name: "Profile avatar" })).toBeVisible());
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    expect(screen.getByRole("switch", { name: "InPrivate" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("region", { name: "Recent searches" })).toBeVisible();
  });

  it("retains private SERP/IAB while gating Recent and never publishes their visits into normal collections", async () => {
    render(<BingAppPrototype initialRecentState="empty" />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const normal = await submit("Public query");
    fireEvent.click(screen.getByRole("searchbox", { name: "Edit search query" }));
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    const secret = await submit("Secret query");
    expect(screen.getByRole("main", { name: "Search results" })).toHaveAttribute("data-private-mode", "true");
    const channel = secret.getAttribute("srcdoc")!.match(/nonce="([^"]+)"/)![1];
    fireEvent(window, new MessageEvent("message", { source: (secret as HTMLIFrameElement).contentWindow,
      data: { type: "bing-iab-navigate", channel, url: "https://example.com/private" } }));
    const article = await screen.findByTitle("Web page: https://example.com/private");
    fireEvent.load(article);
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    await expectPrivateRecent("browser");
    fireEvent.click(screen.getByRole("button", { name: "Back to search results" }));
    expect(screen.getByRole("main", { name: "In-app browser" })).toHaveAttribute("data-private-mode", "true");
    expect(screen.getByTitle("Web page: https://example.com/private")).toBe(article);
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    const tabs = screen.getByRole("group", { name: "Open tabs cards" });
    const history = screen.getByRole("group", { name: "History list" });
    expect(within(tabs).getAllByRole("article")).toHaveLength(1);
    expect(history).toHaveTextContent("Public query");
    expect(history).not.toHaveTextContent("Secret query");
    expect(history).not.toHaveTextContent("Private article");
    // The browser footer returns to its actual owning session, restoring privacy.
    fireEvent.click(screen.getByRole("button", { name: "Back to search results" }));
    expect(screen.getByRole("main", { name: "In-app browser" })).toHaveAttribute("data-private-mode", "true");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    await expectPrivateRecent("browser");
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Public query tab: search-1" }));
    expect(screen.getByTitle("Bing results for Public query")).toBe(normal);
    expect(screen.getByRole("main", { name: "Search results" })).toHaveAttribute("data-private-mode", "false");
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const searchHistory = screen.getByRole("region", { name: "Recent searches" });
    expect(searchHistory).toHaveTextContent("Public query");
    expect(searchHistory).not.toHaveTextContent("Secret query");
  });

  it("returns from a newly enabled private Search to the gate and clears the old Recent filter when turned off", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    const input = screen.getByRole("searchbox", { name: "Search tabs, recents and bookmarks" });
    fireEvent.change(input, { target: { value: "Medium" } });
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    await expectPrivateRecent("app");
    await waitFor(() => expect(screen.getByRole("button", { name: "Turn off" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    expect(screen.getByRole("searchbox", { name: "Search tabs, recents and bookmarks" })).toHaveValue("");
    expect(screen.getByRole("region", { name: "Open tabs" })).toBeVisible();
  });

  it("returns to gated Recent when private mode was enabled in Search opened from Tabs", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    fireEvent.click(screen.getByRole("button", { name: "View all open tabs" }));
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    expect(screen.queryByRole("main", { name: "Tabs page" })).toBeNull();
    await expectPrivateRecent("app");
  });

  it("keeps both private Key screen footer variants passive", async () => {
    const { rerender } = render(<Recent privateMode />);
    await expectPrivateRecent("app");
    expect(screen.queryByRole("button", { name: "Turn off" })).toBeNull();
    rerender(<Recent privateMode footerVariant="browser" />);
    await expectPrivateRecent("browser");
    expect(screen.queryByRole("button", { name: "Turn off" })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
