import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Recent } from "./Recent";
import { RECENT_BOOKMARKS, RECENT_CONVERSATIONS, RECENT_SITES, RECENT_TABS } from "./Recent.data";

const emptyActivity = { tabs: [], historyEntries: [], conversationEntries: [], bookmarkEntries: [] };

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Recent", () => {
  it("shows the empty page only after the remaining activity is removed, keeping navigation available", async () => {
    const onNewTab = vi.fn();
    const onBackToResults = vi.fn();
    const { rerender } = render(<Recent {...emptyActivity} historyEntries={RECENT_SITES}
      footerVariant="browser" onBackToResults={onBackToResults} onNewTab={onNewTab} />);
    expect(screen.queryByText("Your activity will appear here")).not.toBeInTheDocument();
    rerender(<Recent {...emptyActivity} footerVariant="browser" onBackToResults={onBackToResults} onNewTab={onNewTab} />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible());
    expect(screen.getByText("Start searching to build your activity")).toBeVisible();
    expect(screen.getByRole("group", { name: "Recent search box" })).toBeVisible();
    for (const title of ["Open tabs", "History", "Copilot history", "Bookmark"]) {
      expect(screen.queryByRole("region", { name: title })).not.toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to search results" }));
    expect(onNewTab).toHaveBeenCalledOnce();
    expect(onBackToResults).toHaveBeenCalledOnce();
  });

  it.each([
    { entries: { tabs: RECENT_TABS }, title: "Open tabs" }, { entries: { historyEntries: RECENT_SITES }, title: "History" },
    { entries: { conversationEntries: RECENT_CONVERSATIONS }, title: "Copilot history" }, { entries: { bookmarkEntries: RECENT_BOOKMARKS }, title: "Bookmark" },
  ])("shows only the populated $title section", ({ entries, title }) => {
    render(<Recent {...emptyActivity} {...entries} />);
    expect(screen.queryByText("Your activity will appear here")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: title })).toBeVisible();
    for (const other of ["Open tabs", "History", "Copilot history", "Bookmark"].filter(name => name !== title)) {
      expect(screen.queryByRole("region", { name: other })).not.toBeInTheDocument();
    }
    const section = screen.getByRole("region", { name: title });
    expect(section.querySelector('[data-variant="section-header"]')).toHaveStyle({ "--gnrc-list-section-padding-top": "12px" });
  });

  it("shows the trailing View all only when there are more than three tabs", async () => {
    const onViewTabs = vi.fn();
    const tabs = Array.from({ length: 4 }, (_, index) => ({ id: `tab-${index}`, title: `Tab ${index}` }));
    const { rerender } = render(<Recent {...emptyActivity} tabs={tabs} onViewTabs={onViewTabs} />);
    const strip = screen.getByRole("group", { name: "Open tabs cards" });
    expect(within(strip).getAllByRole("article")).toHaveLength(3);
    fireEvent.click(within(strip).getByRole("button", { name: "View all tabs" }));
    expect(onViewTabs).toHaveBeenCalledOnce();
    for (const count of [3, 2, 1]) {
      rerender(<Recent {...emptyActivity} tabs={tabs.slice(0, count)} onViewTabs={onViewTabs} />);
      await waitFor(() => expect(within(strip).queryByText("View all")).not.toBeInTheDocument());
      expect(within(strip).getAllByRole("article")).toHaveLength(count);
      expect(screen.getByRole("button", { name: "View all open tabs" })).toBeVisible();
    }
  });

  it("keeps unspecified actions passive and preserves all four design sections", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<Recent />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Search tabs, recents and bookmarks"));
    for (const view of screen.getAllByText("View")) fireEvent.click(view);
    expect(screen.queryByText("View all")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("img", { name: "New tab" }));
    const history = within(screen.getByRole("group", { name: "History list" }));
    fireEvent.click(history.getByText("Medium"));
    expect(open).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    for (const title of ["Open tabs", "History", "Copilot history", "Bookmark"]) {
      expect(screen.getByRole("region", { name: title })).toBeVisible();
    }
    expect(screen.queryByRole("button", { name: "Back to Recent" })).not.toBeInTheDocument();
    expect(history.queryByRole("button")).not.toBeInTheDocument();
    const tabs = within(screen.getByRole("group", { name: "Open tabs cards" }));
    const select = tabs.getByRole("button", { name: "Select Open ai tab: spring" });
    expect(select.closest("[inert]")).not.toBeNull();
    fireEvent.click(select);
    fireEvent.click(tabs.getByRole("button", { name: "Close Open ai tab: spring" }));
    expect(select).toHaveAttribute("aria-pressed", "true");
    expect(tabs.getAllByRole("article")).toHaveLength(3);
  });

  it("keeps the requested footer navigation available", () => {
    const onNavigate = vi.fn();
    render(<Recent onNavigate={onNavigate} />);
    expect(screen.getByRole("button", { name: "Recent" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(onNavigate).toHaveBeenCalledWith("home");
  });
});
