import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Search } from "./Search";
import { BingAppPrototype } from "../BingAppPrototype";

vi.mock("motion/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("motion/react")>(),
  useReducedMotion: () => true,
}));

afterEach(cleanup);
const recent = () => screen.getByRole("region", { name: "Recent searches" });
const edit = () => fireEvent.click(screen.getByRole("button", { name: "Edit search history" }));
const openClear = () => fireEvent.click(within(recent()).getByRole("button", { name: "Clear all" }));

describe("Search history editing", () => {
  it("enters editing, dismisses the keyboard, and removes only the chosen duplicate", () => {
    render(<Search interactive initialState="keyboard" />);
    edit();
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    const removes = within(recent()).getAllByRole("button", { name: "Remove Facebook from history" });
    expect(removes).toHaveLength(2);
    fireEvent.click(removes[0]);
    expect(within(recent()).getAllByRole("button", { name: "Remove Facebook from history" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(within(recent()).queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit search history" })).toBeVisible();
    expect(screen.getByRole("group", { name: "You might like" })).toBeVisible();
  });

  it("keeps history on cancellation, contains keyboard focus, and clears only after confirmation", async () => {
    render(<Search interactive />);
    edit();
    openClear();
    const dialog = screen.getByRole("alertdialog", { name: "Clear all search history" });
    const keep = within(dialog).getByRole("button", { name: "Keep" });
    const clear = within(dialog).getByRole("button", { name: "Clear all" });
    expect(keep).toHaveFocus();
    expect(screen.queryByRole("region", { name: "Search content" })).not.toBeInTheDocument();
    fireEvent.keyDown(keep, { key: "Tab" });
    expect(clear).toHaveFocus();
    fireEvent.keyDown(clear, { key: "Tab" });
    expect(keep).toHaveFocus();
    fireEvent.click(keep);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(within(recent()).getAllByRole("button", { name: /Remove/ })).toHaveLength(8);
    openClear();
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(recent()).toBeVisible();
    openClear();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "You might like" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Search content" })).toHaveFocus();
  });

  it("retains cleared history when leaving Search and entering it again", async () => {
    render(<BingAppPrototype />);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    edit();
    openClear();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    await waitFor(() => expect(screen.queryByRole("main", { name: "Search page" })).not.toBeInTheDocument());
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    expect(screen.getByRole("main", { name: "Search page" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "You might like" })).toBeVisible();
  });
});
