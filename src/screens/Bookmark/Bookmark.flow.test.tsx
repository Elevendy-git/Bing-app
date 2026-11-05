import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { BingAppPrototype } from "../BingAppPrototype";
import { Bookmark } from "./Bookmark";
import { deleteBookmark, type BookmarkEntry } from "./Bookmark.data";

afterEach(cleanup);
const openBookmarks = () => fireEvent.click(screen.getByRole("button", { name: "View all bookmark" }));

describe("Recent and Bookmark flow", () => {
  it.each([false, true])("shows the supplied empty state after the last bookmark is deleted (folder: %s)", async (inFolder) => {
    const site: BookmarkEntry = { kind: "site", id: "saved", title: "Saved page", subtitle: "example.com" };
    function SavedBookmarks() {
      const [entries, setEntries] = useState<readonly BookmarkEntry[]>(inFolder
        ? [{ kind: "folder", id: "saved-folder", title: "Saved", favoriteCount: 1, children: [site] }]
        : [site]);
      return <Bookmark entries={entries} interactive onDelete={id => setEntries(current => deleteBookmark(current, id))} />;
    }
    render(<SavedBookmarks />);
    if (inFolder) fireEvent.click(screen.getByRole("button", { name: "Open Saved folder" }));
    fireEvent.click(screen.getByRole("button", { name: "Options for Saved page, saved" }));
    const menu = screen.getByRole("menu", { name: "Bookmark item options" });
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(menu).not.toBeInTheDocument());
    const content = screen.getByRole("region", { name: inFolder ? "Saved content" : "Bookmark content" });
    await waitFor(() => expect(within(content).queryByText("Saved page")).not.toBeInTheDocument());
    expect(within(content).getByRole("heading", { name: "Bookmarks appear here" })).toBeVisible();
    expect(within(content).getByText("Add a bookmark to easily find your favorite websites again")).toBeVisible();
    expect(content.querySelector('img')).toHaveAttribute("src", expect.stringContaining("empty-bookmark.png"));
    await waitFor(() => expect(content).toHaveFocus());
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    if (inFolder) {
      fireEvent.click(screen.getByRole("button", { name: "Back to Bookmark" }));
      await waitFor(() => expect(screen.getByRole("button", { name: "Open Saved folder" })).toHaveFocus());
      expect(screen.getByRole("button", { name: "Open Saved folder" })).toHaveTextContent("0 favorites");
    }
  });

  it("opens the supplied folder and restores list and Recent scroll plus the exact opener", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    const recent = screen.getByRole("region", { name: "Recent content" });
    fireEvent.scroll(recent, { target: { scrollTop: 450 } });
    openBookmarks();
    const content = screen.getByRole("region", { name: "Bookmark content" });
    expect(within(content).getAllByText("Robinhood")).toHaveLength(2);
    expect(within(content).getByText("The New Yorker")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Open Article folder" })).not.toBeInTheDocument();
    fireEvent.scroll(content, { target: { scrollTop: 30 } });
    const opener = screen.getByRole("button", { name: "Open Travel to Paris folder" });
    fireEvent.click(opener);
    expect(screen.getByRole("main", { name: "Travel to Paris folder" })).toBeVisible();
    expect(screen.queryByRole("main", { name: "Bookmark page" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Bookmark" })).toHaveFocus();
    expect(within(screen.getByRole("region", { name: "Travel to Paris content" })).getAllByText("Robinhood")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Back to Bookmark" }));
    await waitFor(() => expect(opener).toHaveFocus());
    expect(content.scrollTop).toBe(30);
    fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "View all bookmark" })).toHaveFocus());
    expect(recent.scrollTop).toBe(450);
  });

  it("dismisses page and item menus without mutating any lists or inventing a Share destination", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    const bookmark = screen.getByRole("group", { name: "Bookmark list" }).textContent;
    const history = screen.getByRole("group", { name: "History list" }).textContent;
    openBookmarks();
    const pageTrigger = screen.getByRole("button", { name: "Bookmark options" });
    fireEvent.click(pageTrigger);
    const pageMenu = screen.getByRole("menu", { name: "Bookmark options" });
    expect(within(pageMenu).getAllByRole("menuitem")).toHaveLength(1);
    expect(within(pageMenu).getByRole("menuitem", { name: "Feedback" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyDown(pageMenu, { key: "Escape" });
    await waitFor(() => expect(pageMenu).not.toBeInTheDocument());
    await waitFor(() => expect(pageTrigger).toHaveFocus());
    const itemTrigger = screen.getByRole("button", { name: "Options for Spotify, spotify" });
    fireEvent.click(itemTrigger);
    const itemMenu = screen.getByRole("menu", { name: "Bookmark item options" });
    expect(within(itemMenu).getByRole("menuitem", { name: "Share" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.pointerDown(itemMenu.parentElement!.parentElement!.querySelector('[aria-hidden="true"]')!);
    await waitFor(() => expect(itemMenu).not.toBeInTheDocument());
    await waitFor(() => expect(itemTrigger).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "View all bookmark" })).toHaveFocus());
    expect(screen.getByRole("group", { name: "Bookmark list" }).textContent).toBe(bookmark);
    expect(screen.getByRole("group", { name: "History list" }).textContent).toBe(history);
  });

  it("keeps static key screens passive", () => {
    render(<Bookmark />);
    for (const button of screen.getAllByRole("button")) fireEvent.click(button);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Travel to Paris folder" })).not.toBeInTheDocument();
    expect(screen.getByText("Travel to Paris")).toBeVisible();
  });

  it("deletes just the selected bookmark and synchronizes Recent without changing History or Tabs", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    const history = screen.getByRole("group", { name: "History list" }).textContent;
    const copilot = screen.getByRole("group", { name: "Copilot history list" }).textContent;
    const tabs = screen.getByRole("group", { name: "Open tabs cards" }).textContent;
    openBookmarks();
    fireEvent.click(screen.getByRole("button", { name: "Options for Spotify, spotify" }));
    const menu = screen.getByRole("menu", { name: "Bookmark item options" });
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(menu).not.toBeInTheDocument());
    const content = screen.getByRole("region", { name: "Bookmark content" });
    await waitFor(() => expect(within(content).queryByText("Spotify")).not.toBeInTheDocument());
    await waitFor(() => expect(content).toHaveFocus());
    expect(within(content).getAllByText("Robinhood")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "View all bookmark" })).toHaveFocus());
    expect(within(screen.getByRole("group", { name: "Bookmark list" })).queryByText("Spotify")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "History list" }).textContent).toBe(history);
    expect(screen.getByRole("group", { name: "Copilot history list" }).textContent).toBe(copilot);
    expect(screen.getByRole("group", { name: "Open tabs cards" }).textContent).toBe(tabs);
    openBookmarks();
    expect(within(screen.getByRole("region", { name: "Bookmark content" })).queryByText("Spotify")).not.toBeInTheDocument();
  });

  it("deletes only the selected folder entry and updates its parent's count", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    openBookmarks();
    fireEvent.click(screen.getByRole("button", { name: "Open Travel to Paris folder" }));
    fireEvent.click(screen.getByRole("button", { name: "Options for Robinhood, travel-robinhood" }));
    const menu = screen.getByRole("menu", { name: "Bookmark item options" });
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(menu).not.toBeInTheDocument());
    await waitFor(() => expect(within(screen.getByRole("region", { name: "Travel to Paris content" })).getAllByText("Robinhood")).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "Back to Bookmark" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Travel to Paris folder" })).toHaveFocus());
    expect(screen.getByRole("button", { name: "Open Travel to Paris folder" })).toHaveTextContent("3 favorites");
    expect(within(screen.getByRole("region", { name: "Bookmark content" })).getAllByText("Robinhood")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Open Travel to Paris folder" }));
    expect(within(screen.getByRole("region", { name: "Travel to Paris content" })).getAllByText("Robinhood")).toHaveLength(1);
  });
});
