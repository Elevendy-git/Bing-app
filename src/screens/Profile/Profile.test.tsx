import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Profile } from "./Profile";
import { PROFILE_ACCOUNTS, profileAvatar } from "./Profile.data";
import { BingAppPrototype } from "../BingAppPrototype";

afterEach(cleanup);

describe("Profile identity and navigation", () => {
  it.each([
    ["History", "History page"],
    ["Bookmarks", "Bookmark page"],
  ])("opens %s from Profile and restores its exact entry and scroll position", async (entry, page) => {
    render(<BingAppPrototype initialPage="profile" />);
    const profile = screen.getByRole("main", { name: "Profile page" });
    const content = screen.getByRole("region", { name: "Profile content" });
    const opener = screen.getByRole("button", { name: entry });
    fireEvent.scroll(content, { target: { scrollTop: 45 } });
    fireEvent.click(opener);
    expect(screen.getByRole("main", { name: page })).toBeVisible();
    expect(screen.getByRole("button", { name: "Back to Profile" })).toHaveFocus();
    expect(profile).toHaveAttribute("inert");
    expect(screen.queryByRole("main", { name: "Recent page" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Profile" }));
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.getByRole("main", { name: "Profile page" })).toBe(profile);
    expect(content.scrollTop).toBe(45);
  });

  it("retains Profile as the return destination after a bookmark folder and shares deletions with Recent", async () => {
    render(<BingAppPrototype initialPage="profile" />);
    fireEvent.click(screen.getByRole("button", { name: "Bookmarks" }));
    const folderOpener = screen.getByRole("button", { name: "Open Travel to Paris folder" });
    fireEvent.click(folderOpener);
    fireEvent.click(screen.getByRole("button", { name: "Back to Bookmark" }));
    await waitFor(() => expect(folderOpener).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Options for Spotify, spotify" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Back to Profile" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Bookmarks" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Back to Homepage" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Profile" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(within(screen.getByRole("group", { name: "Bookmark list" })).queryByText("Spotify")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View all bookmark" }));
    expect(screen.getByRole("button", { name: "Back to Recent" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Back to Recent" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "View all bookmark" })).toHaveFocus());
  });

  it("returns through History to Profile after Search from empty history", async () => {
    render(<BingAppPrototype initialPage="profile" initialRecentState="empty" account={null} />);
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    const searchNow = screen.getByRole("button", { name: "Search now" });
    fireEvent.click(searchNow);
    await waitFor(() => expect(screen.getByRole("main", { name: "Search page" })).toBeVisible());
    expect(screen.queryByRole("main", { name: "Profile page" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(searchNow).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Back to Profile" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "History" })).toHaveFocus());
    expect(screen.getByRole("heading", { name: "Tap to sign in" })).toBeVisible();
  });

  it.each([
    [{ name: "  eleven ", email: "other@example.com" }, "E"],
    [{ name: " ", email: "  alex@example.com" }, "A"],
    [{ name: "林晓" }, "林"],
  ])("uses the first name letter, falling back to email: %j", (account, initial) => {
    render(<Profile account={account} />);
    expect(screen.getByRole("img", { name: `Avatar ${initial}` })).toHaveAttribute("data-variant", "initials");
  });

  it("uses a photo and falls back to the initial when the image cannot load", () => {
    const { rerender } = render(<Profile account={PROFILE_ACCOUNTS.image} />);
    const avatar = screen.getByRole("img", { name: "Profile avatar" });
    expect(avatar).toHaveAttribute("data-size", "large");
    fireEvent.error(avatar.querySelector("img")!);
    expect(screen.getByRole("img", { name: "Avatar E" })).toHaveAttribute("data-variant", "initials");
    rerender(<Profile account={{ ...PROFILE_ACCOUNTS.image, imageSrc: "/new-photo.png" }} />);
    expect(screen.getByRole("img", { name: "Profile avatar" })).toHaveAttribute("data-variant", "image");
    expect(profileAvatar({ name: "Eleven", imageSrc: "  " }).variant).toBe("initials");
  });

  it("replaces private account data with the sign-in and Rewards introduction when signed out", () => {
    render(<Profile account={null} />);
    expect(screen.getByRole("img", { name: "Not signed in" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Tap to sign in" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Microsoft Rewards introduction" })).toBeVisible();
    expect(screen.queryByText("Eleven@hotmail.com")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Microsoft Rewards summary" })).not.toBeInTheDocument();
    expect(screen.getByText("Explore now").tagName).toBe("SPAN");
    expect(within(screen.getByRole("group", { name: "General options" })).queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("navigation", { name: "Bing app navigation" })).not.toBeInTheDocument();
  });

  it("opens from the homepage avatar and returns to the same homepage and scroll position", async () => {
    render(<BingAppPrototype account={PROFILE_ACCOUNTS.initials} />);
    const avatar = screen.getByRole("button", { name: "Open Profile" });
    const home = screen.getByRole("main", { name: "Bing homepage" });
    const scroll = screen.getByRole("region", { name: "Homepage content" });
    fireEvent.scroll(scroll, { target: { scrollTop: 40 } });
    fireEvent.click(avatar);
    expect(screen.getByRole("main", { name: "Profile page" })).toBeVisible();
    expect(home.closest("[inert]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Back to Homepage" })).toHaveFocus();
    expect(screen.getByRole("img", { name: "Avatar E" })).toHaveAttribute("data-size", "large");
    fireEvent.click(screen.getByRole("button", { name: "Back to Homepage" }));
    await waitFor(() => expect(avatar).toHaveFocus());
    expect(screen.getByRole("main", { name: "Bing homepage" })).toBe(home);
    expect(scroll.scrollTop).toBe(40);
    expect(within(avatar).getByRole("img")).toHaveAttribute("data-variant", "initials");
  });
});
