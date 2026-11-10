import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AnimatePresence } from "motion/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FindOnPage, type FindOnPageState } from "./FindOnPage";

const preferences = vi.hoisted(() => ({ reducedMotion: false }));
vi.mock("motion/react", async original => ({ ...await original<typeof import("motion/react")>(),
  useReducedMotion: () => preferences.reducedMotion }));
beforeEach(() => { vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); preferences.reducedMotion = false; vi.restoreAllMocks(); });
const callbacks = () => ({ onPrevious: vi.fn(), onNext: vi.fn(), onDismiss: vi.fn() });
function Editor({ active = true, initialQuery = "", total = 0, index = -1, ...actions }: Pick<FindOnPageState, "onPrevious" | "onNext" | "onDismiss"> & {
  active?: boolean; initialQuery?: string; total?: number; index?: number;
}) {
  const [query, setQuery] = useState(initialQuery);
  return <FindOnPage active={active} state={{ query, total, index, onQueryChange: setQuery, ...actions }} />;
}
const keyboard = () => within(screen.getByRole("group", { name: "iOS keyboard" }));

describe("Find on page task", () => {
  it("focuses the shared input and uses the real shared keyboard for editing selected text", () => {
    render(<Editor initialQuery="alpha beta" total={3} index={1} {...callbacks()} />);
    const input = screen.getByRole("searchbox", { name: "Find text on page" }) as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("2 of 3");
    input.setSelectionRange(0, 5);
    fireEvent.click(keyboard().getByRole("button", { name: "z" }));
    expect(input).toHaveValue("z beta");
    expect(input.selectionStart).toBe(1);
    fireEvent.click(keyboard().getByRole("button", { name: "Delete character" }));
    expect(input).toHaveValue(" beta");
    expect(input).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Clear search query" }));
    expect(input).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("Find in this page");
    expect(input).toHaveFocus();
  });

  it("navigates matches while pointer presses preserve input focus and the keyboard", () => {
    const actions = callbacks();
    render(<Editor initialQuery="alpha" total={3} index={1} {...actions} />);
    const input = screen.getByRole("searchbox", { name: "Find text on page" });
    const next = screen.getByRole("button", { name: "Next match" });
    expect(fireEvent.mouseDown(next)).toBe(false);
    fireEvent.click(next);
    fireEvent.click(screen.getByRole("button", { name: "Previous match" }));
    expect(actions.onNext).toHaveBeenCalledOnce();
    expect(actions.onPrevious).toHaveBeenCalledOnce();
    expect(input).toHaveFocus();
    expect(screen.getByRole("group", { name: "iOS keyboard" })).toBeVisible();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(actions.onNext).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(actions.onNext).toHaveBeenCalledTimes(2);
  });

  it("shows no matches honestly, disables navigation, and lets Back or Escape dismiss once", () => {
    const actions = callbacks(), outerKey = vi.fn();
    render(<div onKeyDown={outerKey}><Editor initialQuery="missing" {...actions} /></div>);
    expect(screen.getByRole("status")).toHaveTextContent("No matches");
    const previous = screen.getByRole("button", { name: "Previous match" });
    const next = screen.getByRole("button", { name: "Next match" });
    expect(previous).toBeDisabled(); expect(next).toBeDisabled();
    fireEvent.click(previous); fireEvent.click(next);
    expect(actions.onNext).not.toHaveBeenCalled(); expect(actions.onPrevious).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Back from search" }));
    expect(actions.onDismiss).toHaveBeenCalledOnce();
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "Find text on page" }), { key: "Escape" });
    expect(actions.onDismiss).toHaveBeenCalledTimes(2);
    expect(outerKey).not.toHaveBeenCalled();
  });

  it("dismisses only the keyboard through keyboard Done and restores visible task focus", () => {
    preferences.reducedMotion = true;
    const actions = callbacks();
    render(<Editor initialQuery="alpha" total={2} index={0} {...actions} />);
    const region = screen.getByRole("region", { name: "Find on page" });
    fireEvent.click(keyboard().getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("group", { name: "iOS keyboard" })).not.toBeInTheDocument();
    expect(actions.onDismiss).not.toHaveBeenCalled();
    expect(region).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).not.toBe(document.body);
    fireEvent.click(within(region).getByRole("button", { name: "Done" }));
    expect(actions.onDismiss).toHaveBeenCalledOnce();
  });

  it("keeps IME Escape from dismissing the document task", () => {
    const actions = callbacks();
    render(<Editor initialQuery="alpha" {...actions} />);
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "Find text on page" }), { key: "Escape", isComposing: true });
    expect(actions.onDismiss).not.toHaveBeenCalled();
  });

  it("blocks editing, keyboard actions and dismissal while the task is inactive", () => {
    const actions = callbacks(), onQueryChange = vi.fn();
    render(<FindOnPage active={false} state={{ query: "alpha", total: 3, index: 0, onQueryChange, ...actions }} />);
    const input = screen.getByRole("searchbox", { name: "Find text on page" });
    expect(input).not.toHaveFocus();
    fireEvent.change(input, { target: { value: "changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("tabindex", "-1");
    expect(screen.queryByRole("button", { name: "Back from search" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear search query" })).not.toBeInTheDocument();
    expect(keyboard().queryByRole("button")).not.toBeInTheDocument();
    expect(onQueryChange).not.toHaveBeenCalled();
    expect(actions.onDismiss).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Next match" })).toBeDisabled();
  });

  it("uses no translated keyboard movement when reduced motion is enabled", () => {
    preferences.reducedMotion = true;
    render(<Editor {...callbacks()} />);
    const keys = screen.getByRole("group", { name: "iOS keyboard" });
    expect(keys.parentElement!.style.transform).not.toMatch(/translate/);
    act(() => screen.getByRole("searchbox", { name: "Find text on page" }).focus());
    expect(keys.parentElement!.style.transform).not.toMatch(/translate/);
  });

  it("opens the keyboard continuously from below while its spacer grows", async () => {
    render(<Editor initialQuery="alpha" {...callbacks()} />);
    const keys = screen.getByRole("group", { name: "iOS keyboard" });
    const keyboardLayer = keys.parentElement!;
    const spacer = keyboardLayer.parentElement!;
    expect(spacer).toHaveStyle({ height: "0px" });
    expect(keyboardLayer).toHaveStyle({ transform: "translateY(100%)" });
    await waitFor(() => expect(Number.parseFloat(spacer.style.height)).toBeGreaterThan(0));
    expect(Number.parseFloat(spacer.style.height)).toBeLessThan(307);
    await waitFor(() => expect(spacer).toHaveStyle({ height: "307px" }));
    expect(keyboardLayer.style.transform).not.toMatch(/translate/);
  });

  it("retains and disables the departing task while only its root collapses", async () => {
    const actions = callbacks(), onQueryChange = vi.fn();
    const state = { query: "alpha", total: 3, index: 0, onQueryChange, ...actions };
    const view = (open: boolean) => <AnimatePresence>{open && <FindOnPage key="find" active state={state} />}</AnimatePresence>;
    const { rerender } = render(view(true));
    const region = screen.getByRole("region", { name: "Find on page" });
    const input = screen.getByRole("searchbox", { name: "Find text on page" });
    const next = screen.getByRole("button", { name: "Next match" });
    const done = within(region).getAllByRole("button", { name: "Done" })[0];
    const key = keyboard().getByRole("button", { name: "a" });
    const spacer = key.closest('[aria-label="iOS keyboard"]')!.parentElement!.parentElement! as HTMLElement;
    await waitFor(() => expect(spacer).toHaveStyle({ height: "307px" }));
    rerender(view(false));
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("inert");
    expect(region).toHaveAttribute("aria-hidden", "true");
    expect(region).toHaveAttribute("data-exiting", "true");
    expect(input).toHaveAttribute("readonly");
    expect(next).toBeDisabled(); expect(done).toBeDisabled();
    fireEvent.click(next); fireEvent.click(done); fireEvent.click(key);
    fireEvent.change(input, { target: { value: "late edit" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(actions.onDismiss).not.toHaveBeenCalled();
    expect(actions.onNext).not.toHaveBeenCalled();
    expect(onQueryChange).not.toHaveBeenCalled();
    expect(spacer).toHaveStyle({ height: "307px" });
    await waitFor(() => expect(region).not.toBeInTheDocument());
  });

  it("reverses a dismissed task without replacing its controls or jumping its opacity", async () => {
    const view = (open: boolean) => <AnimatePresence>{open && <Editor key="find" initialQuery="alpha" total={3} index={0} {...callbacks()} />}</AnimatePresence>;
    const { rerender } = render(view(true));
    const region = screen.getByRole("region", { name: "Find on page" });
    const input = screen.getByRole("searchbox", { name: "Find text on page" });
    rerender(view(false));
    await waitFor(() => expect(Number(region.style.opacity)).toBeLessThan(1));
    const interruptedOpacity = Number(region.style.opacity);
    rerender(view(true));
    expect(screen.getByRole("region", { name: "Find on page" })).toBe(region);
    expect(Number(region.style.opacity)).toBeCloseTo(interruptedOpacity, 1);
    expect(region).not.toHaveAttribute("inert");
    expect(input).toHaveFocus();
    await waitFor(() => expect(region).toHaveStyle({ opacity: "1" }));
    expect(screen.getByRole("button", { name: "Next match" })).not.toBeDisabled();
  });

  it("finishes reduced-motion task exit without a translated keyboard", async () => {
    preferences.reducedMotion = true;
    const view = (open: boolean) => <AnimatePresence>{open && <Editor key="find" {...callbacks()} />}</AnimatePresence>;
    const { rerender } = render(view(true));
    const region = screen.getByRole("region", { name: "Find on page" });
    const keys = screen.getByRole("group", { name: "iOS keyboard" });
    expect(keys.parentElement!.style.transform).not.toMatch(/translate/);
    rerender(view(false));
    expect(keys.parentElement!.style.transform).not.toMatch(/translate/);
    await waitFor(() => expect(region).not.toBeInTheDocument());
  });
});
