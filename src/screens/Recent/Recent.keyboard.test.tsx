import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Recent } from "./Recent";

const emptyActivity = { tabs: [], historyEntries: [], conversationEntries: [], bookmarkEntries: [] };
const getInput = () => screen.getByRole("searchbox", { name: "Search tabs, recents and bookmarks" }) as HTMLInputElement;
const getKeyboard = () => screen.getByRole("group", { name: "iOS keyboard" });
const focusInput = () => act(() => getInput().focus());

beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ["", []] }))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Recent keyboard", () => {
  it.each(["👍🏽", "🇨🇳", "👩‍👩‍👧‍👦", "e\u0301"])("deletes the complete %s grapheme while filtering", character => {
    render(<Recent {...emptyActivity} onSearchSubmit={vi.fn()} />);
    focusInput();
    fireEvent.change(getInput(), { target: { value: `Find ${character} today` } });
    getInput().setSelectionRange(5 + character.length, 5 + character.length);
    fireEvent.click(within(getKeyboard()).getByRole("button", { name: "Delete character" }));
    expect(getInput()).toHaveValue("Find  today");
    expect(getInput().selectionStart).toBe(5);
  });

  it.each(["app", "browser"] as const)("opens the shared keyboard above the %s footer with one stationary indicator", (footerVariant) => {
    const { container } = render(<Recent {...emptyActivity} footerVariant={footerVariant} onSearchSubmit={vi.fn()} onNavigate={vi.fn()} onNewTab={vi.fn()} />);
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    focusInput();
    expect(getInput()).toHaveAttribute("inputmode", "none");
    expect(getKeyboard()).toHaveAttribute("data-ios-keyboard", "27");
    expect(getKeyboard()).toBeVisible();
    expect(screen.queryByRole("button", { name: "New tab" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Home" })).not.toBeInTheDocument();
    const indicators = container.querySelectorAll("[data-ios-home-indicator]");
    expect(indicators).toHaveLength(1);
    expect(getKeyboard().contains(indicators[0])).toBe(false);
    fireEvent.keyDown(getInput(), { key: "Escape" });
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New tab" })).toBeVisible();
    expect(container.querySelector("[data-ios-home-indicator]")).toBe(indicators[0]);
  });

  it("types, replaces a selection and deletes through the keyboard while retaining input focus", async () => {
    render(<Recent {...emptyActivity} onSearchSubmit={vi.fn()} />);
    focusInput();
    const keyboard = within(getKeyboard());
    fireEvent.click(keyboard.getByRole("button", { name: "W" }));
    fireEvent.click(keyboard.getByRole("button", { name: "e" }));
    expect(getInput()).toHaveValue("We");
    fireEvent.change(getInput(), { target: { value: "Weather today" } });
    getInput().setSelectionRange(8, 13);
    await act(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); });
    expect([getInput().selectionStart, getInput().selectionEnd]).toEqual([8, 13]);
    fireEvent.click(keyboard.getByRole("button", { name: "a" }));
    expect(getInput()).toHaveValue("Weather a");
    fireEvent.click(keyboard.getByRole("button", { name: "Delete character" }));
    expect(getInput()).toHaveValue("Weather ");
    expect(getInput()).toHaveFocus();
    expect(getKeyboard()).toBeVisible();
    fireEvent.change(getInput(), { target: { value: "Hello 🌍" } });
    fireEvent.click(keyboard.getByRole("button", { name: "Delete character" }));
    expect(getInput()).toHaveValue("Hello ");
  });

  it("keeps the keyboard open on Clear and submits only a nonblank query from the Search key", () => {
    const submit = vi.fn();
    render(<Recent {...emptyActivity} onSearchSubmit={submit} />);
    focusInput();
    const keyboard = getKeyboard();
    fireEvent.change(getInput(), { target: { value: "Weather" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search query" }));
    expect(getInput()).toHaveValue("");
    expect(getInput()).toHaveFocus();
    expect(getKeyboard()).toBe(keyboard);
    fireEvent.click(within(keyboard).getByRole("button", { name: "Search" }));
    expect(submit).not.toHaveBeenCalled();
    fireEvent.change(getInput(), { target: { value: "  weather  today  " } });
    fireEvent.click(within(keyboard).getByRole("button", { name: "Search" }));
    expect(submit).toHaveBeenCalledWith("weather today");
  });

  it("dismisses on vertical scrolling without clearing and reverses on refocus, ignoring horizontal swipes and zoom", () => {
    render(<Recent onSearchSubmit={vi.fn()} />);
    focusInput();
    const keyboard = getKeyboard();
    const content = screen.getByRole("region", { name: "Recent content" });
    fireEvent.change(getInput(), { target: { value: "Weather" } });
    fireEvent.wheel(content, { deltaX: 70, deltaY: 2 });
    fireEvent.wheel(content, { deltaY: 70, ctrlKey: true });
    fireEvent.touchStart(content, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(content, { touches: [{ clientX: 30, clientY: 105 }] });
    fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 60 }, { clientX: 120, clientY: 60 }] });
    expect(getKeyboard()).toBe(keyboard);
    fireEvent.touchMove(content, { touches: [{ clientX: 95, clientY: 50 }] });
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(getInput()).toHaveValue("Weather");
    focusInput();
    expect(getKeyboard()).toBe(keyboard);
    fireEvent.wheel(content, { deltaY: 20 });
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(getInput()).toHaveValue("Weather");
  });

  it("releases focus and keyboard when leaving Recent, preserving the draft without reopening on return", () => {
    const submit = vi.fn();
    const { rerender } = render(<Recent {...emptyActivity} onSearchSubmit={submit} />);
    focusInput();
    fireEvent.change(getInput(), { target: { value: "Weather" } });
    rerender(<Recent {...emptyActivity} onSearchSubmit={submit} active={false} />);
    expect(getInput()).not.toHaveFocus();
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    rerender(<Recent {...emptyActivity} onSearchSubmit={submit} active />);
    expect(getInput()).toHaveValue("Weather");
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    focusInput();
    expect(getKeyboard()).toBeVisible();
  });

  it("does not add keyboard focus or interaction to passive Figma specimens", () => {
    render(<Recent initialSearchFocused />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "New tab" })).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });
});
