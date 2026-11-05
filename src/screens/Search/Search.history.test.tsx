import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

describe("Search history", () => {
  it("shows all history as shared AS rows without completion emphasis, arrows or two-line clipping", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ id: String(i), query: `Saved query ${i}` }));
    render(<Search history={items} />);
    const card = screen.getByRole("group", { name: "Search history" });
    expect(within(card).getAllByRole("img", { name: "From search history" })).toHaveLength(8);
    expect(within(card).queryByRole("img", { name: "Suggested query" })).not.toBeInTheDocument();
    expect(card.querySelectorAll('[data-variant="as"]')).toHaveLength(8);
    expect(within(card).getByText("Saved query 7")).toBeVisible();
    expect(card.querySelectorAll('[class*="dividerSlot"]')).toHaveLength(7);
    expect(card.lastElementChild?.querySelector('[class*="dividerSlot"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /Show all|Collapse search history/ })).not.toBeInTheDocument();
  });

  it("submits a recent query without starting a separate keyboard dismissal", () => {
    const onSubmit = vi.fn();
    const onHistoryChange = vi.fn();
    render(<Search interactive initialState="keyboard" history={[{ id: "baidu", query: "baidu" }]}
      onSubmit={onSubmit} onHistoryChange={onHistoryChange} />);
    fireEvent.click(within(recent()).getByRole("button", { name: "baidu" }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("baidu");
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveValue("baidu");
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    expect(onHistoryChange).not.toHaveBeenCalled();
  });

  it("prevents searches while editing and keeps remove separate from query selection", () => {
    const onSubmit = vi.fn();
    render(<Search interactive onSubmit={onSubmit} />);
    edit();
    const weather = within(recent()).getByRole("button", { name: "Weather" });
    expect(weather).toBeDisabled();
    fireEvent.click(weather);
    fireEvent.click(within(recent()).getByRole("button", { name: "Remove Weather from history" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(within(recent()).queryByRole("button", { name: "Weather" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    const remaining = within(recent()).getByRole("button", { name: "Weather today" });
    expect(remaining).toBeEnabled();
    fireEvent.click(remaining);
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Weather today");
  });

  it("keeps Key screen history passive even when a submission callback is supplied", () => {
    const onSubmit = vi.fn();
    render(<Search history={[{ id: "baidu", query: "baidu" }]} onSubmit={onSubmit} />);
    expect(within(recent()).queryByRole("button", { name: "baidu" })).not.toBeInTheDocument();
    fireEvent.click(within(recent()).getAllByText("baidu")[0]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps the input focused and keyboard open through editing, row deletion and Done", () => {
    render(<Search interactive initialState="keyboard" />);
    const input = screen.getByRole("searchbox", { name: "Search query" });
    expect(input).toHaveFocus();
    expect(fireEvent.pointerDown(screen.getByRole("button", { name: "Edit search history" }))).toBe(false);
    edit();
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    const remove = within(recent()).getByRole("button", { name: "Remove Weather from history" });
    expect(fireEvent.pointerDown(remove)).toBe(false);
    fireEvent.click(remove);
    expect(within(recent()).queryByText("Weather", { exact: true })).not.toBeInTheDocument();
    expect(within(recent()).getAllByRole("button", { name: /Remove/ })).toHaveLength(4);
    expect(fireEvent.pointerDown(screen.getByRole("button", { name: "Done" }))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(within(recent()).queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit search history" })).toBeVisible();
    expect(input).toHaveFocus();
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    expect(screen.queryByText("You might like")).not.toBeInTheDocument();
  });

  it("leaves content blank after the last individual deletion without dismissing the keyboard", () => {
    render(<Search interactive initialState="keyboard" initialHistoryState="editing" />);
    for (const button of within(recent()).getAllByRole("button", { name: /Remove/ })) fireEvent.click(button);
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Search content" })).not.toHaveTextContent(/\S/);
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
  });

  it("moves physical-keyboard focus between Edit and Done while preserving pointer editing", () => {
    render(<Search interactive initialState="keyboard" />);
    const editButton = screen.getByRole("button", { name: "Edit search history" });
    act(() => editButton.focus());
    fireEvent.click(editButton);
    const done = screen.getByRole("button", { name: "Done" });
    expect(done).toHaveFocus();
    fireEvent.click(done);
    expect(editButton).toHaveFocus();
  });

  it("focuses the next remove control, then the previous one, and returns to input after the final row", () => {
    render(<Search interactive initialState="keyboard" />);
    edit();
    const first = screen.getByRole("button", { name: "Remove Weather from history" });
    act(() => first.focus());
    fireEvent.click(first);
    expect(screen.getByRole("button", { name: "Remove Weather forecast from history" })).toHaveFocus();
    const last = screen.getByRole("button", { name: "Remove Weather Nanning from history" });
    act(() => last.focus());
    fireEvent.click(last);
    expect(screen.getByRole("button", { name: "Remove Weather hk from history" })).toHaveFocus();
    for (const button of within(recent()).getAllByRole("button", { name: /Remove/ })) {
      act(() => button.focus());
      fireEvent.click(button);
    }
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search query" })).toHaveFocus();
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
  });

  it("shows passive edit and confirmation specimens without stealing focus or accepting actions", () => {
    const onHistoryChange = vi.fn();
    const { unmount } = render(<Search initialState="keyboard" initialHistoryState="editing" onHistoryChange={onHistoryChange} />);
    expect(within(recent()).getByRole("button", { name: "Done" })).toBeDisabled();
    expect(within(recent()).getByRole("button", { name: "Clear all" })).toBeDisabled();
    expect(within(recent()).queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    unmount();
    render(<><button>Workbench focus</button><Search initialHistoryState="confirm-clear" onHistoryChange={onHistoryChange} /></>);
    const dialog = screen.getByRole("alertdialog", { name: "Clear all search history" });
    const keep = within(dialog).getByRole("button", { name: "Keep" });
    expect(keep).toBeDisabled();
    expect(keep).not.toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dialog).toBeVisible();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear all" }));
    expect(onHistoryChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
  });

  it("keeps history on cancellation, contains keyboard focus, and clears only after confirmation", async () => {
    render(<Search interactive initialState="keyboard" />);
    edit();
    openClear();
    const dialog = screen.getByRole("alertdialog", { name: "Clear all search history" });
    const keep = within(dialog).getByRole("button", { name: "Keep" });
    const clear = within(dialog).getByRole("button", { name: "Clear all" });
    expect(screen.getByRole("main", { name: "Search page" })).toHaveAttribute("data-search-state", "zero-input");
    expect(dialog).toHaveFocus();
    expect(screen.queryByRole("region", { name: "Search content" })).not.toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(clear).toHaveFocus();
    fireEvent.keyDown(clear, { key: "Tab" });
    expect(keep).toHaveFocus();
    fireEvent.keyDown(keep, { key: "Tab" });
    expect(clear).toHaveFocus();
    fireEvent.keyDown(clear, { key: "Tab" });
    expect(keep).toHaveFocus();
    fireEvent.click(keep);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(within(recent()).getAllByRole("button", { name: /Remove/ })).toHaveLength(5);
    openClear();
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(recent()).toBeVisible();
    openClear();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("region", { name: "Recent searches" })).not.toBeInTheDocument();
    expect(screen.queryByText("You might like")).not.toBeInTheDocument();
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
    expect(screen.queryByText("You might like")).not.toBeInTheDocument();
  });
});
