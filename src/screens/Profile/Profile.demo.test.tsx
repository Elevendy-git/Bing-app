import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BingAppPrototype } from "../BingAppPrototype";
import { Profile } from "./Profile";

vi.mock("motion/react", async original => ({
  ...await original<typeof import("motion/react")>(), useReducedMotion: () => true,
}));
beforeEach(() => vi.stubGlobal("fetch", vi.fn(async (path: string) => {
  const endpoint = new URL(path, "http://localhost");
  const query = endpoint.searchParams.get("query") ?? "";
  return { ok: true, json: async () => endpoint.pathname === "/api/bing-serp"
    ? { query, html: `<p>Results for ${query}</p>`, sourceUrl: `https://www.bing.com/search?${new URLSearchParams({ q: query })}`, fetchedAt: "2026-10-28T00:00:00Z" }
    : [query, [query, `${query} today`]] };
})));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const profile = () => screen.getByRole("main", { name: "Profile page" });
async function signIn() {
  fireEvent.click(screen.getByRole("button", { name: "Tap to sign in" }));
  const dialog = screen.getByRole("dialog", { name: "Demo sign-in" });
  expect(dialog).toHaveTextContent("This demo does not connect to Microsoft.");
  expect(within(dialog).queryByRole("textbox")).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(within(profile()).getByRole("heading", { name: "Eleven" })).toBeVisible();
}
async function signOut() {
  fireEvent.click(screen.getByRole("button", { name: "Manage demo account" }));
  fireEvent.click(within(screen.getByRole("dialog", { name: "Demo account" })).getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("button", { name: "Tap to sign in" })).toBeVisible();
}

describe("Prototype demo account", () => {
  it("keeps cancellation signed out, traps focus and restores the existing sign-in control", async () => {
    render(<BingAppPrototype initialPage="profile" account={null} demoSignIn />);
    const trigger = screen.getByRole("button", { name: "Tap to sign in" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Demo sign-in" });
    expect(dialog).toHaveFocus();
    expect(trigger.closest("[inert]")).not.toBeNull();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(within(dialog).getByRole("button", { name: "Continue" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.getByRole("img", { name: "Not signed in" })).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shares demo identity with Homepage and keeps it through Profile navigation", async () => {
    render(<BingAppPrototype account={null} demoSignIn />);
    fireEvent.click(screen.getByRole("button", { name: "Open Profile" }));
    await signIn();
    const accountButton = screen.getByRole("button", { name: "Manage demo account" });
    await waitFor(() => expect(accountButton).toHaveFocus());
    expect(accountButton).toHaveTextContent("Eleven@hotmail.com");
    fireEvent.click(screen.getByRole("button", { name: "Back to Homepage" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Profile" })).toHaveFocus());
    expect(within(screen.getByRole("button", { name: "Open Profile" })).getByRole("img", { name: "Profile avatar" })).toHaveAttribute("data-variant", "image");
    fireEvent.click(screen.getByRole("button", { name: "Open Profile" }));
    expect(screen.getByRole("button", { name: "Manage demo account" })).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the account on Done and signs out only on the explicit action", async () => {
    render(<BingAppPrototype initialPage="profile" account={null} demoSignIn />);
    await signIn();
    const trigger = screen.getByRole("button", { name: "Manage demo account" });
    fireEvent.click(trigger);
    fireEvent.click(within(screen.getByRole("dialog", { name: "Demo account" })).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.getByRole("heading", { name: "Eleven" })).toBeVisible();
    await signOut();
    await waitFor(() => expect(screen.getByRole("button", { name: "Tap to sign in" })).toHaveFocus());
    expect(screen.getByRole("group", { name: "Microsoft Rewards introduction" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to Homepage" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Profile" })).toHaveFocus());
    expect(within(screen.getByRole("button", { name: "Open Profile" })).getByRole("img", { name: "Not signed in" })).toBeVisible();
  });

  it("preserves real submitted activity and bookmarks through a complete sign-in/out cycle", async () => {
    render(<BingAppPrototype demoSignIn account={null} />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    const input = screen.getByRole("searchbox", { name: "Search query" });
    fireEvent.change(input, { target: { value: "Saved before login" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await screen.findByTitle("Bing results for Saved before login");
    await waitFor(() => expect(document.querySelector('[aria-label="Search page"]')).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Profile" }));
    await signIn();
    await signOut();
    fireEvent.click(screen.getByRole("button", { name: "Back to Homepage" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Profile" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.getByRole("group", { name: "History list" })).toHaveTextContent("Saved before login");
    expect(screen.getByRole("group", { name: "Bookmark list" })).toHaveTextContent("Spotify");
    fireEvent.click(screen.getByRole("button", { name: "View all open tabs" }));
    expect(screen.getByRole("button", { name: "Select Saved before login tab: search-1" })).toBeVisible();
  });

  it("keeps private Homepage identity private when the demo account changes", async () => {
    render(<BingAppPrototype initialPage="profile" initialPrivateMode account={null} demoSignIn />);
    await signIn();
    fireEvent.click(screen.getByRole("button", { name: "Back to Homepage" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Profile" })).toHaveFocus());
    expect(screen.getByRole("img", { name: "Private mode" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Open Profile" }));
    await signOut();
    fireEvent.click(screen.getByRole("button", { name: "Back to Homepage" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Profile" })).toHaveFocus());
    expect(screen.getByRole("img", { name: "Private mode" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Turn off" })).toBeVisible());
  });

  it("leaves standalone design fixtures passive", () => {
    const { rerender } = render(<Profile account={null} />);
    expect(screen.getByRole("heading", { name: "Tap to sign in" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Tap to sign in" })).toBeNull();
    rerender(<Profile />);
    expect(screen.queryByRole("button", { name: "Manage demo account" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
