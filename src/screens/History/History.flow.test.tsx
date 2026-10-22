import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BingAppPrototype } from "../BingAppPrototype";

afterEach(cleanup);
const openHistory = () => fireEvent.click(screen.getByRole("button", { name: "View all history" }));
const backToRecent = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "View all history" })).toHaveFocus());
};

describe("Recent and browsing History flow", () => {
  it("groups visits by date and deletes only the chosen visit, sharing changes with Recent", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    const bookmark = screen.getByRole("group", { name: "Bookmark list" }).textContent;
    const copilot = screen.getByRole("group", { name: "Copilot history list" }).textContent;
    const recentContent = screen.getByRole("region", { name: "Recent content" });
    fireEvent.scroll(recentContent, { target: { scrollTop: 250 } });
    openHistory();
    const content = screen.getByRole("region", { name: "History content" });
    expect(within(content).getAllByText("Spotify")).toHaveLength(3);
    expect(screen.getByRole("group", { name: "Jul 28, 2025 history" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Options for Spotify, Today" }));
    const menu = screen.getByRole("menu", { name: "History item options" });
    const deleteItem = within(menu).getByRole("menuitem", { name: "Delete" });
    expect(deleteItem).toHaveFocus();
    fireEvent.click(deleteItem);
    await waitFor(() => expect(menu).not.toBeInTheDocument());
    expect(within(screen.getByRole("group", { name: "Today history" })).queryByText("Spotify")).not.toBeInTheDocument();
    expect(within(content).getAllByText("Spotify")).toHaveLength(2);
    expect(content).toHaveFocus();
    await backToRecent();
    expect(recentContent.scrollTop).toBe(250);
    const summary = within(screen.getByRole("group", { name: "History list" }));
    expect(summary.queryByText("Spotify")).not.toBeInTheDocument();
    expect(summary.getAllByText("Medium")).toHaveLength(2);
    expect(screen.getByRole("group", { name: "Bookmark list" }).textContent).toBe(bookmark);
    expect(screen.getByRole("group", { name: "Copilot history list" }).textContent).toBe(copilot);
    openHistory();
    expect(within(screen.getByRole("region", { name: "History content" })).getAllByText("Spotify")).toHaveLength(2);
  });

  it("dismisses either menu without deleting and returns focus to the exact trigger", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    openHistory();
    const rowMore = screen.getByRole("button", { name: "Options for Medium, Today" });
    fireEvent.click(rowMore);
    const rowMenu = screen.getByRole("menu", { name: "History item options" });
    fireEvent.keyDown(rowMenu, { key: "Escape" });
    await waitFor(() => expect(rowMenu).not.toBeInTheDocument());
    expect(rowMore).toHaveFocus();
    const pageMore = screen.getByRole("button", { name: "History options" });
    fireEvent.click(pageMore);
    const pageMenu = screen.getByRole("menu", { name: "History options" });
    expect(within(pageMenu).getByRole("menuitem", { name: "Feedback" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.pointerDown(pageMenu.parentElement!.parentElement!.querySelector('[aria-hidden="true"]')!);
    await waitFor(() => expect(pageMenu).not.toBeInTheDocument());
    expect(pageMore).toHaveFocus();
    expect(within(screen.getByRole("region", { name: "History content" })).getAllByText("Medium")).toHaveLength(3);
  });

  it("clears browsing visits, opens Search from the empty state, and returns without affecting other histories", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    const bookmark = screen.getByRole("group", { name: "Bookmark list" }).textContent;
    const copilot = screen.getByRole("group", { name: "Copilot history list" }).textContent;
    openHistory();
    fireEvent.click(screen.getByRole("button", { name: "History options" }));
    const menu = screen.getByRole("menu", { name: "History options" });
    fireEvent.keyDown(menu, { key: "End" });
    const clear = screen.getByRole("menuitem", { name: "Clear all history" });
    expect(clear).toHaveFocus();
    fireEvent.click(clear);
    await waitFor(() => expect(menu).not.toBeInTheDocument());
    expect(screen.getByText("Your browsing and search history will appear here.")).toBeVisible();
    expect(screen.queryByRole("group", { name: "Today history" })).not.toBeInTheDocument();
    const searchNow = screen.getByRole("button", { name: "Search now" });
    fireEvent.click(searchNow);
    expect(screen.queryByRole("main", { name: "History page" })).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("");
    await waitFor(() => expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible());
    // Browsing-history fixtures and Search page query history have separate ownership.
    expect(screen.getByRole("button", { name: "Edit search history" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(searchNow).toHaveFocus());
    expect(screen.getByText("Your browsing and search history will appear here.")).toBeVisible();
    await backToRecent();
    expect(screen.queryByRole("group", { name: "History list" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Bookmark list" }).textContent).toBe(bookmark);
    expect(screen.getByRole("group", { name: "Copilot history list" }).textContent).toBe(copilot);
    openHistory();
    expect(screen.getByRole("button", { name: "Search now" })).toBeVisible();
  });

  it("removes empty date groups and shows the empty state after deleting the last visit", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    openHistory();
    const labels = screen.getAllByRole("button", { name: /^Options for / }).map(button => button.getAttribute("aria-label")!);
    for (const label of labels) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      const menu = screen.getByRole("menu", { name: "History item options" });
      fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
      await waitFor(() => expect(menu).not.toBeInTheDocument());
    }
    expect(screen.queryByRole("region", { name: "Today" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search now" })).toBeVisible();
    expect(screen.getByRole("region", { name: "History content" })).toHaveFocus();
  });
});
