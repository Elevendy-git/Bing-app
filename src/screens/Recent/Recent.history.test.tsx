import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BingAppPrototype } from "../BingAppPrototype";
import { Recent } from "./Recent";

beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ["", []] }))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Recent history menu", () => {
  it("deletes the chosen visit through the shared menu and updates the full History page", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    const tabs = screen.getByRole("group", { name: "Open tabs cards" }).textContent;
    const bookmarks = screen.getByRole("group", { name: "Bookmark list" }).textContent;
    const content = screen.getByRole("region", { name: "Recent content" });
    fireEvent.click(screen.getByRole("button", { name: "Options for Spotify" }));
    const menu = screen.getByRole("menu", { name: "History item options" });
    expect(within(menu).getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    expect(content).toHaveAttribute("inert");
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(menu).not.toBeInTheDocument());
    await waitFor(() => expect(content).toHaveFocus());
    await waitFor(() => expect(within(screen.getByRole("group", { name: "History list" })).queryByText("Spotify")).not.toBeInTheDocument());
    expect(screen.getByRole("group", { name: "Open tabs cards" }).textContent).toBe(tabs);
    expect(screen.getByRole("group", { name: "Bookmark list" }).textContent).toBe(bookmarks);
    fireEvent.click(screen.getByRole("button", { name: "View all history" }));
    const history = screen.getByRole("region", { name: "History content" });
    expect(within(history).getAllByText("Spotify")).toHaveLength(2);
    expect(within(screen.getByRole("group", { name: "Today history" })).queryByText("Spotify")).not.toBeInTheDocument();
  });

  it("keeps opening a recorded query separate from its menu, and restores focus on either dismissal", async () => {
    const open = vi.fn(), remove = vi.fn();
    render(<Recent tabs={[]} conversationEntries={[]} bookmarkEntries={[]}
      historyEntries={[{ id: "query", title: "123", subtitle: "https://www.bing.com/search?q=123" }]}
      onOpenHistorySearch={open} onDeleteHistory={remove} />);
    fireEvent.click(screen.getByRole("button", { name: "123" }));
    expect(open).toHaveBeenCalledExactlyOnceWith("123");
    const trigger = screen.getByRole("button", { name: "Options for 123" });
    for (const outside of [false, true]) {
      fireEvent.click(trigger);
      const menu = screen.getByRole("menu", { name: "History item options" });
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(trigger).toHaveAttribute("aria-controls", menu.id);
      if (outside) fireEvent.pointerDown(menu.parentElement!.parentElement!.querySelector('[aria-hidden="true"]')!);
      else fireEvent.keyDown(menu, { key: "Escape" });
      await waitFor(() => expect(menu).not.toBeInTheDocument());
      await waitFor(() => expect(trigger).toHaveFocus());
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    }
    expect(open).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();
  });

  it("deletes filtered visits beyond the three-row preview, preserves the draft, and hides an empty section", async () => {
    function Example() {
      const [entries, setEntries] = useState(Array.from({ length: 4 }, (_, index) => ({
        id: String(index), title: `Query ${index}`, subtitle: `https://www.bing.com/search?q=${index}`,
      })));
      return <Recent tabs={[]} conversationEntries={[]} bookmarkEntries={[]} historyEntries={entries}
        onNavigate={() => {}} onSearchSubmit={() => {}} onDeleteHistory={id => setEntries(items => items.filter(item => item.id !== id))} />;
    }
    render(<Example />);
    const input = screen.getByRole("searchbox", { name: "Search tabs, recents and bookmarks" });
    expect(screen.queryByRole("button", { name: "Options for Query 3" })).not.toBeInTheDocument();
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "Query 3" } });
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Options for Query 3" }));
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("menu", { name: "History item options" })).not.toBeInTheDocument());
    expect(input).toHaveValue("Query 3");
    expect(screen.queryByRole("region", { name: "History" })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "" } });
    for (let index = 0; index < 3; index++) {
      fireEvent.click(screen.getByRole("button", { name: `Options for Query ${index}` }));
      fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
      await waitFor(() => expect(screen.queryByRole("menu", { name: "History item options" })).not.toBeInTheDocument());
    }
    await waitFor(() => expect(screen.queryByRole("region", { name: "History" })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible();
  });
});
