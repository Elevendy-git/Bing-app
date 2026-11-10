import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Homepage } from "./Homepage";
import { useFeedFollow } from "./useFeedFollow";

afterEach(cleanup);

describe("Feed follow flow", () => {
  it("shares publisher state across cards, confirms follow/unfollow and reverses each with Undo", async () => {
    render(<Homepage interactiveFeed initialState="scrolled" />);
    const first = screen.getAllByRole("button", { name: "More options" })[0];
    fireEvent.click(first);
    const dialog = screen.getByRole("dialog", { name: "Feed options" });
    expect(within(dialog).getAllByRole("menuitem")).toHaveLength(7);
    expect(within(dialog).getByRole("menuitem", { name: "Share" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("menuitem", { name: "Follow Medium" }));
    await waitFor(() => expect(screen.getByText("You've followed this channel")).toBeVisible());
    await waitFor(() => expect(first).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    fireEvent.click(first);
    fireEvent.click(screen.getByRole("menuitem", { name: "Follow Medium" }));
    await screen.findByText("You've followed this channel");
    fireEvent.click(screen.getAllByRole("button", { name: "More options" })[1]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Unfollow Medium" }));
    await waitFor(() => expect(screen.getByText("You've unfollowed this channel")).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    fireEvent.click(first);
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Unfollow Medium" })).toBeVisible());
  });

  it("dismisses without changing state, traps focus, and leaves the original scroll position intact", async () => {
    render(<Homepage interactiveFeed initialState="scrolled" />);
    const content = screen.getByRole("region", { name: "Homepage content" });
    const first = screen.getAllByRole("button", { name: "More options" })[0];
    fireEvent.click(first);
    const follow = screen.getByRole("menuitem", { name: "Follow Medium" });
    expect(follow).toHaveFocus();
    fireEvent.keyDown(follow, { key: "Tab" });
    expect(follow).toHaveFocus();
    fireEvent.keyDown(follow, { key: "Escape" });
    await waitFor(() => expect(screen.getByRole("searchbox")).toBeInTheDocument());
    expect(content.scrollTop).toBe(384);
    await waitFor(() => expect(first).toHaveFocus());
    fireEvent.click(first);
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Follow Medium" })).toBeVisible());
    // The dimming artwork is pointer-transparent; an outside click targets the overlay.
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    await waitFor(() => expect(screen.getByRole("searchbox")).toBeInTheDocument());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps topic and publisher identities separate and clears preferences when the prototype remounts", () => {
    const publisher = { kind: "publisher", name: "Example" } as const;
    const topic = { kind: "topic", name: "Example" } as const;
    const trigger = document.createElement("button");
    const { result, unmount } = renderHook(() => useFeedFollow());
    act(() => result.current.openMenu(publisher, trigger));
    act(() => result.current.toggleFollow());
    expect(result.current.isFollowed({ ...publisher, name: " example " })).toBe(true);
    expect(result.current.isFollowed(topic)).toBe(false);
    act(() => result.current.openMenu(topic, trigger));
    act(() => result.current.toggleFollow());
    expect(result.current.isFollowed(topic)).toBe(true);
    act(() => result.current.undo());
    expect(result.current.isFollowed(topic)).toBe(false);
    expect(result.current.isFollowed(publisher)).toBe(true);
    act(() => result.current.dismissToast());
    expect(result.current.isFollowed(publisher)).toBe(true);
    unmount();
    const fresh = renderHook(() => useFeedFollow());
    expect(fresh.result.current.isFollowed(publisher)).toBe(false);
  });

  it("keeps Figma menu and toast previews passive", () => {
    const { rerender } = render(<Homepage initialState="scrolled" initialFeedOverlay="menu" />);
    expect(screen.getByRole("menuitem", { name: "Follow FIFA World Cup" })).toHaveAttribute("aria-disabled", "true");
    rerender(<Homepage key="toast" initialState="scrolled" initialFeedOverlay="unfollowed-toast" />);
    expect(screen.getByRole("status")).toHaveTextContent("You've unfollowed this channel");
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });
});
