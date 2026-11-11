import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BingAppPrototype } from "../BingAppPrototype";
import type { ProfileAuthentication } from "./Profile";
import type { RewardsSnapshot } from "../../auth/rewards";

vi.mock("motion/react", async original => ({
  ...await original<typeof import("motion/react")>(), useReducedMotion: () => true,
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const authentication = (): ProfileAuthentication => ({ provider: "microsoft", pending: null, error: null, onSignIn: vi.fn(), onSignOut: vi.fn() });

describe("Controlled Microsoft identity in the prototype", () => {
  it("opens the official Rewards site from its Home card and keeps unrelated cards independent", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const auth = authentication();
    render(<BingAppPrototype account={null} authentication={auth} />);
    const home = screen.getByRole("main", { name: "Bing homepage" });
    const cards = within(screen.getByRole("group", { name: "Glance cards" })).getAllByRole("button");
    for (const card of cards.filter(card => card.dataset.glanceCard !== "rewards")) fireEvent.click(card);
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(cards.find(card => card.dataset.glanceCard === "rewards")!);
    expect(open).toHaveBeenCalledExactlyOnceWith("https://rewards.bing.com/", "_blank", "noopener,noreferrer");
    expect(screen.getByRole("main", { name: "Bing homepage" })).toBe(home);
    expect(auth.onSignIn).not.toHaveBeenCalled();
  });

  it("prefers matching captured points, returns to demo values on account switch, and shows the promo after sign-out", () => {
    const auth = authentication();
    const account = { name: "Actual User", email: "actual@outlook.com" };
    const snapshot: RewardsSnapshot = { accountEmail: account.email, availablePoints: 731, readyToClaim: 30, dailyStreakDays: 0,
      source: "microsoft-rewards-dashboard", observedAt: "2026-01-01T10:00:00.000Z" };
    const { rerender } = render(<BingAppPrototype initialPage="profile" account={account} authentication={auth} rewardsSnapshot={snapshot} />);
    const summary = screen.getByRole("group", { name: "Microsoft Rewards summary" });
    expect(summary).toHaveTextContent("731Available points");
    expect(summary).toHaveTextContent("30Ready to claim");
    expect(summary).toHaveTextContent("0 daysDaily streaks");
    expect(summary).not.toHaveTextContent("Daily points");
    expect(summary).not.toHaveTextContent("2,456");
    expect(screen.queryByText(/Last synced/)).toBeNull();
    expect(screen.queryByRole("group", { name: "Microsoft Rewards introduction" })).toBeNull();
    rerender(<BingAppPrototype initialPage="profile" account={{ email: "other@outlook.com" }} authentication={auth} rewardsSnapshot={snapshot} />);
    const demoSummary = screen.getByRole("group", { name: "Microsoft Rewards summary" });
    expect(demoSummary).toHaveTextContent("2,456Total points");
    expect(demoSummary).toHaveTextContent("30/270Daily points");
    expect(demoSummary).toHaveTextContent("3 daysDaily streaks");
    expect(demoSummary).not.toHaveTextContent("731");
    expect(demoSummary).not.toHaveTextContent("Ready to claim");
    rerender(<BingAppPrototype initialPage="profile" account={null} authentication={auth} rewardsSnapshot={snapshot} />);
    expect(screen.queryByRole("group", { name: "Microsoft Rewards summary" })).toBeNull();
    expect(screen.getByRole("group", { name: "Microsoft Rewards introduction" })).toBeVisible();
  });

  it.each([null, { name: "Actual User", email: "actual@outlook.com" }])("opens the available Rewards entries on the official site without changing Profile or signing in: %j", account => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const auth = authentication();
    render(<BingAppPrototype initialPage="profile" account={account} authentication={auth} />);
    const profile = screen.getByRole("main", { name: "Profile page" });
    const content = screen.getByRole("region", { name: "Profile content" });
    fireEvent.scroll(content, { target: { scrollTop: 45 } });
    const entries = account ? ["Microsoft Rewards"] : ["Explore now", "Microsoft Rewards"];
    for (const name of entries) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(open).toHaveBeenLastCalledWith("https://rewards.bing.com/", "_blank", "noopener,noreferrer");
      expect(screen.getByRole("main", { name: "Profile page" })).toBe(profile);
      expect(content.scrollTop).toBe(45);
    }
    expect(open).toHaveBeenCalledTimes(entries.length);
    expect(auth.onSignIn).not.toHaveBeenCalled();
    if (account) {
      expect(screen.getByRole("group", { name: "Microsoft Rewards summary" })).toHaveTextContent("2,456Total points");
      expect(screen.queryByRole("button", { name: "Explore now" })).toBeNull();
    } else expect(screen.queryByRole("group", { name: "Microsoft Rewards summary" })).toBeNull();
    expect(screen.queryByRole("main", { name: "Search results" })).toBeNull();
    expect(screen.queryByRole("main", { name: "In-app browser" })).toBeNull();
  });

  it("opens Microsoft login directly, shares the real identity with Home and keeps private artwork", async () => {
    const auth = authentication();
    const { rerender } = render(<BingAppPrototype initialPage="profile" account={null} authentication={auth} initialPrivateMode />);
    fireEvent.click(screen.getByRole("button", { name: "Tap to sign in" }));
    expect(auth.onSignIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<BingAppPrototype initialPage="profile" account={{ name: "Actual User", email: "actual@outlook.com" }} authentication={auth} initialPrivateMode />);
    expect(screen.getByRole("heading", { name: "Actual User" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Manage Microsoft account" })).toHaveTextContent("actual@outlook.com");
    const summary = screen.getByRole("group", { name: "Microsoft Rewards summary" });
    expect(summary).toHaveTextContent("2,456Total points");
    expect(summary).toHaveTextContent("30/270Daily points");
    expect(summary).toHaveTextContent("3 daysDaily streaks");
    expect(screen.queryByRole("group", { name: "Microsoft Rewards introduction" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to Homepage" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Profile" })).toHaveFocus());
    expect(screen.getByRole("img", { name: "Private mode" })).toBeVisible();
  });

  it("disables duplicate attempts while a popup is open and shows recovery instructions", () => {
    const auth = authentication();
    const { rerender } = render(<BingAppPrototype initialPage="profile" account={null} authentication={{ ...auth, pending: "sign-in" }} />);
    const button = screen.getByRole("button", { name: "Tap to sign in" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(auth.onSignIn).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Microsoft window");
    rerender(<BingAppPrototype initialPage="profile" account={null} authentication={{ ...auth, error: "Allow pop-ups for this site, then try signing in again." }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Allow pop-ups");
    expect(button).toBeEnabled();
  });

  it("confirms app-only sign-out and keeps the existing Home identity in sync", async () => {
    const auth = authentication();
    const account = { name: "Real Person", email: "real@outlook.com" };
    const { rerender } = render(<BingAppPrototype initialPage="profile" account={account} authentication={auth} />);
    const manage = screen.getByRole("button", { name: "Manage Microsoft account" });
    fireEvent.click(manage);
    let dialog = screen.getByRole("dialog", { name: "Microsoft account" });
    expect(dialog).toHaveTextContent("stays signed in elsewhere");
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(manage).toHaveFocus());
    expect(auth.onSignOut).not.toHaveBeenCalled();
    fireEvent.click(manage);
    dialog = screen.getByRole("dialog", { name: "Microsoft account" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));
    expect(auth.onSignOut).toHaveBeenCalledTimes(1);
    rerender(<BingAppPrototype initialPage="profile" account={null} authentication={auth} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Tap to sign in" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Back to Homepage" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Profile" })).toHaveFocus());
    expect(within(screen.getByRole("button", { name: "Open Profile" })).getByRole("img", { name: "Not signed in" })).toBeVisible();
  });
});
