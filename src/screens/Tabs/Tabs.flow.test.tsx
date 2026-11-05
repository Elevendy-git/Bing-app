import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BingAppPrototype } from "../BingAppPrototype";

afterEach(cleanup);
const allTabs = () => within(screen.getByRole("region", { name: "All tabs" }));
const openTabs = () => fireEvent.click(screen.getByRole("button", { name: "View all open tabs" }));
const backToRecent = async (focusLabel = "View all open tabs") => {
  fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
  await waitFor(() => expect(screen.getByRole("button", { name: focusLabel })).toHaveFocus());
};

describe("Recent and Tabs flow", () => {
  it("opens a selected tab and shares single-tab deletion without changing other Recent sections", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    const history = screen.getByRole("group", { name: "History list" }).textContent;
    const bookmark = screen.getByRole("group", { name: "Bookmark list" }).textContent;
    openTabs();
    expect(allTabs().getAllByRole("article")).toHaveLength(8);
    fireEvent.click(allTabs().getByRole("button", { name: "Select Open ai tab: gallery" }));
    expect(screen.getByRole("searchbox", { name: "Edit search query" })).toHaveValue("Open ai");
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    openTabs();
    fireEvent.click(allTabs().getByRole("button", { name: "Close Open ai tab: spring" }));
    expect(allTabs().getAllByRole("article")).toHaveLength(7);
    expect(allTabs().getByRole("button", { name: "Select Open ai tab: gallery" })).toHaveAttribute("aria-pressed", "true");
    await backToRecent();
    const strip = within(screen.getByRole("group", { name: "Open tabs cards" }));
    expect(strip.queryByRole("button", { name: "Select Open ai tab: spring" })).not.toBeInTheDocument();
    expect(strip.getByRole("button", { name: "Select Open ai tab: gallery" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(strip.getByRole("button", { name: "Close Open ai tab: gallery" }));
    fireEvent.click(strip.getByRole("button", { name: "View all tabs" }));
    expect(allTabs().getAllByRole("article")).toHaveLength(6);
    expect(allTabs().queryByRole("button", { name: "Select Open ai tab: gallery" })).not.toBeInTheDocument();
    expect(allTabs().getAllByRole("button", { pressed: true })).toHaveLength(1);
    await backToRecent();
    expect(screen.getByRole("group", { name: "History list" }).textContent).toBe(history);
    expect(screen.getByRole("group", { name: "Bookmark list" }).textContent).toBe(bookmark);
  });

  it("dismisses the menu with Escape or outside press and clears tabs through the keyboard menu", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    openTabs();
    const more = screen.getByRole("button", { name: "Tab options" });
    fireEvent.click(more);
    const menu = screen.getByRole("menu", { name: "Tabs options" });
    expect(within(menu).getByRole("menuitem", { name: "Tab settings" })).toHaveAttribute("aria-disabled", "true");
    expect(within(menu).getByRole("menuitem", { name: "Feedback" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyDown(menu, { key: "Escape" });
    await waitFor(() => expect(menu).not.toBeInTheDocument());
    await waitFor(() => expect(more).toHaveFocus());
    fireEvent.click(more);
    const reopenedMenu = screen.getByRole("menu", { name: "Tabs options" });
    const layer = reopenedMenu.parentElement!.parentElement!;
    fireEvent.pointerDown(layer.querySelector('[aria-hidden="true"]')!);
    await waitFor(() => expect(reopenedMenu).not.toBeInTheDocument());
    expect(allTabs().getAllByRole("article")).toHaveLength(8);
    fireEvent.click(more);
    const clearingMenu = screen.getByRole("menu", { name: "Tabs options" });
    fireEvent.keyDown(clearingMenu, { key: "End" });
    const clear = screen.getByRole("menuitem", { name: "Close all tabs" });
    expect(clear).toHaveFocus();
    fireEvent.click(clear);
    await waitFor(() => expect(screen.getByText("Add tab to start browsing")).toBeVisible());
    expect(screen.queryByRole("region", { name: "All tabs" })).not.toBeInTheDocument();
    await waitFor(() => expect(clearingMenu).not.toBeInTheDocument());
    const plus = screen.getByRole("button", { name: "New tab" });
    fireEvent.click(plus);
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(plus).toHaveFocus());
    await waitFor(() => expect(screen.getByText("Add tab to start browsing")).toBeVisible());
    await backToRecent("New tab");
    expect(screen.queryByRole("region", { name: "Open tabs" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "History list" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "View all open tabs" })).not.toBeInTheDocument();
  });

  it("shows the empty state after closing the last remaining tab and focuses New tab", async () => {
    render(<BingAppPrototype initialPage="recent" />);
    openTabs();
    for (const close of allTabs().getAllByRole("button", { name: /^Close Open ai tab:/ })) fireEvent.click(close);
    expect(screen.queryByRole("region", { name: "All tabs" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Add tab to start browsing")).toBeVisible());
    await waitFor(() => expect(screen.getByRole("button", { name: "New tab" })).toHaveFocus());
  });

  it.each([false, true])("opens Search from Tabs and restores scroll after leaving private mode (%s)", async (privateMode) => {
    render(<BingAppPrototype initialPage="recent" initialPrivateMode={privateMode} />);
    if (privateMode) fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    openTabs();
    const tabs = screen.getByRole("main", { name: "Tabs page" });
    const content = screen.getByRole("region", { name: "All tabs" });
    const plus = screen.getByRole("button", { name: "New tab" });
    fireEvent.scroll(content, { target: { scrollTop: 180 } });
    fireEvent.click(plus);
    expect(screen.queryByRole("main", { name: "Tabs page" })).not.toBeInTheDocument();
    expect(tabs).toHaveAttribute("inert");
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("");
    expect(screen.getByRole("switch", { name: "InPrivate" })).toHaveAttribute("aria-checked", "false");
    await waitFor(() => expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(plus).toHaveFocus());
    expect(screen.getByRole("main", { name: "Tabs page" })).toBe(tabs);
    expect(content.scrollTop).toBe(180);
    expect(allTabs().getAllByRole("article")).toHaveLength(8);
    expect(allTabs().getByRole("button", { name: "Select Open ai tab: spring" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("navigation", { name: "Bing app navigation" })).not.toBeInTheDocument();
  });
});
