import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NativeKeyboardProvider, COMPACT_INPUT_QUERY } from "./KeyboardEnvironment";
import { Search } from "../../screens/Search/Search";
import { Recent } from "../../screens/Recent/Recent";
import { VoiceLanguageSheet } from "../../screens/VoiceSearch/VoiceLanguageSheet";
import { FindOnPage } from "../../screens/SERP/FindOnPage";

vi.mock("motion/react", async original => ({ ...await original<typeof import("motion/react")>(), useReducedMotion: () => true }));

let compact = true;
const changeListeners = new Set<() => void>();
beforeEach(() => {
  compact = true;
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    get matches() { return query === COMPACT_INPUT_QUERY && compact; },
    media: query, onchange: null,
    addEventListener: (_: string, callback: () => void) => { if (query === COMPACT_INPUT_QUERY) changeListeners.add(callback); },
    removeEventListener: (_: string, callback: () => void) => changeListeners.delete(callback),
  })));
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ["", []] })));
});
afterEach(() => { cleanup(); changeListeners.clear(); vi.unstubAllGlobals(); });

describe("compact live input environment", () => {
  it("keeps typed text and the same field while switching between simulated and device input", async () => {
    compact = false;
    render(<NativeKeyboardProvider enabled><Search interactive initialState="keyboard" history={[]} /></NativeKeyboardProvider>);
    const input = screen.getByRole("searchbox", { name: "Search query" });
    expect(input).toHaveAttribute("inputmode", "none");
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    fireEvent.change(input, { target: { value: "my draft" } });
    act(() => { compact = true; changeListeners.forEach(callback => callback()); });
    expect(screen.getByRole("searchbox", { name: "Search query" })).toBe(input);
    expect(input).toHaveValue("my draft");
    expect(input).toHaveAttribute("inputmode", "search");
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    // The InPrivate accessory remains, without an additional 332 px keyboard spacer.
    await waitFor(() => expect(screen.getByText("InPrivate").parentElement?.parentElement?.parentElement).toHaveStyle({ height: "48px" }));
  });

  it("submits device input through the existing Search flow, ignoring composition Enter", () => {
    const submit = vi.fn();
    render(<NativeKeyboardProvider enabled><Search interactive initialState="keyboard" onSubmit={submit} history={[]} /></NativeKeyboardProvider>);
    const input = screen.getByRole("searchbox", { name: "Search query" });
    fireEvent.change(input, { target: { value: "  native search  " } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(submit).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(submit).toHaveBeenCalledWith("native search");
  });

  it.each([
    { name: "Recent", input: "Search tabs, recents and bookmarks", element: <Recent onSearchSubmit={() => {}} tabs={[]} historyEntries={[]} conversationEntries={[]} bookmarkEntries={[]} /> },
    { name: "Voice language", input: "Search speech languages", element: <VoiceLanguageSheet interactive /> },
    { name: "Find", input: "Find text on page", element: <FindOnPage active state={{ query: "", total: 0, index: -1, onQueryChange: () => {}, onPrevious: () => {}, onNext: () => {}, onDismiss: () => {} }} /> },
  ])("uses the same device input policy in $name", ({ input: name, element }) => {
    render(<NativeKeyboardProvider enabled>{element}</NativeKeyboardProvider>);
    const input = screen.getByRole("searchbox", { name });
    fireEvent.focus(input);
    expect(input).toHaveAttribute("inputmode", "search");
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
  });

  it("keeps passive canvases on the supplied iOS keyboard regardless of browser width", () => {
    render(<NativeKeyboardProvider enabled={false}><Search initialState="keyboard" /></NativeKeyboardProvider>);
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
