import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BingAppPrototype } from "../BingAppPrototype";
import { Settings } from "./Settings";

vi.mock("motion/react", async original => ({
  ...await original<typeof import("motion/react")>(), useReducedMotion: () => true,
}));
afterEach(cleanup);

describe("Settings screen and Profile flow", () => {
  it("uses the signed-out identity and opens only the supplied screen without inventing setting actions", async () => {
    render(<BingAppPrototype initialPage="profile" account={null} />);
    const profile = screen.getByRole("main", { name: "Profile page" });
    const opener = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(opener);
    const settings = screen.getByRole("main", { name: "Settings page" });
    expect(screen.getByRole("button", { name: "Back to Profile" })).toHaveFocus();
    expect(profile).toHaveAttribute("inert");
    expect(within(settings).getByRole("group", { name: "Account settings" })).toHaveTextContent("Tap to sign in");
    expect(settings).not.toHaveTextContent("Kate_gaming");
    expect(within(settings).getAllByRole("group")).toHaveLength(4);
    expect(within(settings).getAllByRole("button")).toHaveLength(1);
    expect(within(settings).queryByRole("navigation")).toBeNull();
    expect(settings.querySelector("[data-ios-home-indicator]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to Profile" }));
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.getByRole("main", { name: "Profile page" })).toBe(profile);
  });

  it("shares the current account and preserves the exact Profile and Homepage beneath Settings", async () => {
    const account = { name: "Actual User", email: "actual@outlook.com" };
    const { rerender } = render(<BingAppPrototype account={account} />);
    const home = screen.getByRole("main", { name: "Bing homepage" });
    const homeScroll = screen.getByRole("region", { name: "Homepage content" });
    fireEvent.scroll(homeScroll, { target: { scrollTop: 140 } });
    fireEvent.click(screen.getByRole("button", { name: "Open Profile" }));
    const profile = screen.getByRole("main", { name: "Profile page" });
    const profileScroll = screen.getByRole("region", { name: "Profile content" });
    fireEvent.scroll(profileScroll, { target: { scrollTop: 40 } });
    const opener = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(opener);
    const settingsScroll = screen.getByRole("region", { name: "Settings content" });
    fireEvent.scroll(settingsScroll, { target: { scrollTop: 100 } });
    expect(screen.getByRole("group", { name: "Account settings" })).toHaveTextContent(account.email);
    rerender(<BingAppPrototype account={{ name: "Updated User", email: "updated@outlook.com" }} />);
    expect(screen.getByRole("group", { name: "Account settings" })).toHaveTextContent("updated@outlook.com");
    expect(screen.getByRole("region", { name: "Settings content" })).toBe(settingsScroll);
    expect(settingsScroll.scrollTop).toBe(100);
    fireEvent.click(screen.getByRole("button", { name: "Back to Profile" }));
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.getByRole("main", { name: "Profile page" })).toBe(profile);
    expect(profileScroll.scrollTop).toBe(40);
    expect(within(profile).getByRole("heading", { name: "Updated User" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to Homepage" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Profile" })).toHaveFocus());
    expect(screen.getByRole("main", { name: "Bing homepage" })).toBe(home);
    expect(homeScroll.scrollTop).toBe(140);
  });

  it("keeps the Figma account in the standalone fixture without enabling extra destinations", () => {
    render(<Settings />);
    expect(screen.getByRole("group", { name: "Account settings" })).toHaveTextContent("Kate_gaming@hotmail.com");
    expect(screen.getByRole("button", { name: "Back to Profile" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("button", { name: "Theme" })).toBeNull();
    expect(screen.getByText("About")).toBeVisible();
  });
});
