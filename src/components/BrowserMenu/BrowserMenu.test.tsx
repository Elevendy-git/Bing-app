import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserMenu } from "./BrowserMenu";
import { MenuListOverview } from "../MenuList/MenuList.examples";
import { FeedMenu } from "../FeedMenu";
import { TabsMenu } from "../MenuList";

afterEach(cleanup);

const sharedActions = [
  ["Refresh", "refresh"],
  ["Copy link", "copy-link"],
  ["Open in default browser", "open-in-default-browser"],
  ["Share", "share"],
] as const;
const trailingActions = [["Feedback", "feedback"], ["Find on page", "find-on-page"]] as const;

describe("Browser Menu", () => {
  it.each(["serp", "webpage"] as const)("presents the %s actions in the supplied order and reports the selected action", variant => {
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    render(<BrowserMenu variant={variant} onAction={onAction} onDismiss={onDismiss} />);
    const actions = [...sharedActions, ...(variant === "serp" ? [["Search settings", "search-settings"] as const] : []), ...trailingActions];
    const menu = screen.getByRole("menu", { name: variant === "serp" ? "Search results options" : "Webpage options" });
    expect(within(menu).getAllByRole("menuitem").map(item => item.textContent)).toEqual([...actions.map(([label]) => label), "Cancel"]);
    for (const [label] of actions) fireEvent.click(within(menu).getByRole("menuitem", { name: label }));
    expect(onAction.mock.calls).toEqual(actions.map(([, action]) => [action]));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("uses the search variant by default and dismisses through Cancel or Escape", () => {
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    render(<BrowserMenu onAction={onAction} onDismiss={onDismiss} />);
    expect(screen.getByRole("menuitem", { name: "Search settings" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Cancel" }));
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(2);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("focuses an enabled action and includes the separate Cancel footer in keyboard navigation", () => {
    render(<BrowserMenu autoFocus onAction={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByRole("menuitem", { name: "Refresh" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "End" });
    expect(screen.getByRole("menuitem", { name: "Cancel" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Home" });
    expect(screen.getByRole("menuitem", { name: "Refresh" })).toHaveFocus();
  });

  it("allows dismissal-only hosts and keeps unsupplied actions passive", () => {
    const onDismiss = vi.fn();
    render(<BrowserMenu autoFocus onDismiss={onDismiss} />);
    expect(screen.getByRole("menuitem", { name: "Refresh" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("menuitem", { name: "Cancel" })).toHaveFocus();
    fireEvent.click(screen.getByRole("menuitem", { name: "Refresh" }));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("adds no Cancel footer to existing Feed and flyout menu consumers", () => {
    const { rerender } = render(<FeedMenu />);
    expect(screen.getAllByRole("menuitem")).toHaveLength(7);
    expect(screen.queryByRole("menuitem", { name: "Cancel" })).not.toBeInTheDocument();
    rerender(<TabsMenu />);
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    expect(screen.queryByRole("menuitem", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("exposes both passive browser sheets through the existing Library Type control", () => {
    render(<MenuListOverview />);
    const type = screen.getByRole("combobox", { name: "Type" });
    fireEvent.change(type, { target: { value: "browser-serp" } });
    const searchMenu = screen.getByRole("menu", { name: "Search results options" });
    expect(searchMenu.closest("[inert]")).not.toBeNull();
    expect(within(searchMenu).getByRole("menuitem", { name: "Search settings" })).toHaveAttribute("aria-disabled", "true");
    expect(within(searchMenu).getByRole("menuitem", { name: "Cancel" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.change(type, { target: { value: "browser-webpage" } });
    const webpageMenu = screen.getByRole("menu", { name: "Webpage options" });
    expect(webpageMenu.closest("[inert]")).not.toBeNull();
    expect(within(webpageMenu).queryByRole("menuitem", { name: "Search settings" })).not.toBeInTheDocument();
    expect(within(webpageMenu).getByRole("menuitem", { name: "Find on page" })).toHaveAttribute("aria-disabled", "true");
  });
});
