import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BingAppPrototype } from "./BingAppPrototype";

afterEach(cleanup);

describe("Bing app navigation", () => {
  it("opens Search from the empty Recent page and returns without restoring sample activity", async () => {
    render(<BingAppPrototype initialPage="recent" initialRecentState="empty" />);
    const newTab = screen.getByRole("button", { name: "New tab" });
    expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible();
    fireEvent.click(newTab);
    expect(await screen.findByRole("searchbox", { name: "Search query" })).toHaveValue("");
    await waitFor(() => expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(newTab).toHaveFocus());
    expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(screen.getByRole("main", { name: "Bing homepage" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.getByRole("heading", { name: "Your activity will appear here" })).toBeVisible();
  });

  it("opens Recent from the third footer item and preserves both screens when returning", () => {
    render(<BingAppPrototype />);
    const homeInput = screen.getByRole("searchbox", { name: "Search Bing" });
    const homeScroll = screen.getByRole("region", { name: "Homepage content" });
    fireEvent.change(homeInput, { target: { value: "weekend ideas" } });
    fireEvent.scroll(homeScroll, { target: { scrollTop: 384 } });
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.getByRole("main", { name: "Recent page" })).toBeVisible();
    expect(screen.getAllByRole("navigation", { name: "Bing app navigation" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Recent" })).toHaveAttribute("aria-current", "page");
    const recentScroll = screen.getByRole("region", { name: "Recent content" });
    fireEvent.scroll(recentScroll, { target: { scrollTop: 300 } });
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(screen.getByRole("searchbox", { name: "Search Bing" })).toBe(homeInput);
    expect(homeInput).toHaveValue("weekend ideas");
    expect(homeScroll.scrollTop).toBe(384);
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.getByRole("region", { name: "Recent content" }).scrollTop).toBe(300);
  });

  it.each([false, true])("opens a fresh Search from Recent and returns to the same scroll position (private: %s)", async (privateMode) => {
    render(<BingAppPrototype initialPage="recent" initialPrivateMode={privateMode} />);
    const recent = screen.getByRole("main", { name: "Recent page" });
    const content = screen.getByRole("region", { name: "Recent content" });
    const newTab = screen.getByRole("button", { name: "New tab" });
    fireEvent.scroll(content, { target: { scrollTop: 300 } });
    fireEvent.click(newTab);
    await waitFor(() => expect(screen.getByRole("main", { name: "Search page" })).toBeVisible());
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("");
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveFocus();
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    expect(screen.getByRole("switch", { name: "InPrivate" })).toHaveAttribute("aria-checked", String(privateMode));
    expect(screen.queryByRole("main", { name: "Recent page" })).not.toBeInTheDocument();
    expect(recent.closest("[inert]")).not.toBeNull();
    expect(screen.queryByRole("main", { name: "Bing homepage" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(newTab).toHaveFocus());
    expect(screen.getByRole("main", { name: "Recent page" })).toBe(recent);
    expect(content.scrollTop).toBe(300);
    expect(screen.getByRole("button", { name: "Recent" })).toHaveAttribute("aria-current", "page");
  });

  it("opens Search from Homepage and restores focus and scroll after the return transition", async () => {
    render(<BingAppPrototype />);
    const input = screen.getByRole("searchbox", { name: "Search Bing" });
    const content = screen.getByRole("region", { name: "Homepage content" });
    fireEvent.scroll(content, { target: { scrollTop: 384 } });
    fireEvent.focus(input);
    const searchPage = screen.getByRole("main", { name: "Search page" });
    expect(searchPage).toBeVisible();
    // The transition artwork must not introduce a second accessible input.
    expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Bing app navigation" })).not.toBeInTheDocument();
    const searchInput = screen.getByRole("searchbox", { name: "Search query" });
    fireEvent.change(searchInput, { target: { value: "Weather" } });
    fireEvent.click(screen.getByRole("switch", { name: "InPrivate" }));
    expect(searchPage).toHaveAttribute("data-private-mode", "true");
    const back = screen.getByRole("button", { name: "Back from search" });
    // Browser focus normally moves on press, before click. Cancel that default
    // so a held press cannot dismiss the keyboard ahead of the field's return.
    expect(fireEvent.pointerDown(back, { pointerType: "touch" })).toBe(false);
    expect(fireEvent.mouseDown(back)).toBe(false);
    expect(searchInput).toHaveFocus();
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    expect(searchPage).not.toHaveAttribute("inert");
    fireEvent.pointerUp(back, { pointerType: "touch" });
    fireEvent.mouseUp(back);
    fireEvent.click(back);
    expect(searchPage).toHaveAttribute("inert");
    expect(screen.queryByRole("main", { name: "Search page" })).not.toBeInTheDocument();
    expect(await screen.findByRole("searchbox", { name: "Search Bing" })).toBe(input);
    await waitFor(() => expect(content).toHaveFocus());
    expect(content.scrollTop).toBe(384);
    expect(screen.getByRole("img", { name: "Private mode" })).toHaveAttribute("data-variant", "private");
    fireEvent.focus(input);
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("");
    expect(screen.getByRole("switch", { name: "InPrivate" })).toHaveAttribute("aria-checked", "true");
  });

  it("retains private mode through footer navigation and restores the profile avatar when switched off", async () => {
    render(<BingAppPrototype initialPrivateMode />);
    const homeInput = screen.getByRole("searchbox", { name: "Search Bing" });
    const homeContent = screen.getByRole("region", { name: "Homepage content" });
    expect(screen.getByRole("img", { name: "Private mode" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(screen.getByRole("img", { name: "Private mode" })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "Search Bing" })).toBe(homeInput);

    fireEvent.focus(homeInput);
    const toggle = screen.getByRole("switch", { name: "InPrivate" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    expect(await screen.findByRole("img", { name: "Profile avatar" })).toBeVisible();
    await waitFor(() => expect(homeContent).toHaveFocus());
    expect(screen.queryByRole("img", { name: "Private mode" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Homepage content" })).toBe(homeContent);
    fireEvent.focus(homeInput);
    expect(screen.getByRole("switch", { name: "InPrivate" })).toHaveAttribute("aria-checked", "false");
  });

  it("does not start a separate keyboard dismissal when the outgoing screen blurs", async () => {
    render(<BingAppPrototype />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const searchPage = screen.getByRole("main", { name: "Search page" });
    const searchInput = screen.getByRole("searchbox", { name: "Search query" });
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    // Outgoing inertness can trigger blur; the navigation exit must retain control.
    fireEvent.blur(searchInput);
    expect(searchPage).toHaveAttribute("data-search-state", "keyboard");
    await waitFor(() => expect(searchPage).not.toBeInTheDocument());
  });
});
