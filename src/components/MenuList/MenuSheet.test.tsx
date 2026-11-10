import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AnimatePresence } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserMenu } from "../BrowserMenu";
import { FeedOptionsSheet } from "../../screens/Homepage/FeedOptionsSheet";
import { MenuSheet } from "./MenuSheet";

const preferences = vi.hoisted(() => ({ reducedMotion: false }));
vi.mock("motion/react", async original => ({ ...await original<typeof import("motion/react")>(),
  useReducedMotion: () => preferences.reducedMotion }));
afterEach(() => { cleanup(); preferences.reducedMotion = false; });

describe("Shared contextual menu sheet", () => {
  it("autofocuses an enabled browser action and cycles Tab in both directions", () => {
    render(<MenuSheet label="Search results options" interactive>
      <BrowserMenu autoFocus onAction={vi.fn()} onDismiss={vi.fn()} />
    </MenuSheet>);
    const first = screen.getByRole("menuitem", { name: "Refresh" });
    const last = screen.getByRole("menuitem", { name: "Cancel" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();
  });

  it("skips disabled controls and enters the last control when Shift-Tab starts outside", () => {
    render(<><button>Outside page</button><MenuSheet label="Actions" interactive>
      <button disabled>Unavailable</button><button aria-disabled="true">Passive artwork</button>
      <button>First action</button><button>Last action</button>
    </MenuSheet></>);
    const dialog = screen.getByRole("dialog", { name: "Actions" });
    act(() => screen.getByRole("button", { name: "Outside page" }).focus());
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Last action" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(screen.getByRole("button", { name: "First action" })).toHaveFocus();
  });

  it("dismisses once on Escape or an outside press, while presses inside the sheet do not dismiss", () => {
    const dismiss = vi.fn(), outerKey = vi.fn();
    render(<div onKeyDown={outerKey}><MenuSheet label="Actions" interactive onDismiss={dismiss}>
      <BrowserMenu autoFocus onAction={vi.fn()} onDismiss={dismiss} />
    </MenuSheet></div>);
    const dialog = screen.getByRole("dialog", { name: "Actions" });
    fireEvent.click(dialog);
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(dismiss).toHaveBeenCalledOnce();
    expect(outerKey).not.toHaveBeenCalled();
    fireEvent.click(dialog.parentElement!);
    expect(dismiss).toHaveBeenCalledTimes(2);
  });

  it("keeps departing sheets inert until their exit finishes and blocks late dismissal events", async () => {
    const dismiss = vi.fn();
    const view = (open: boolean) => <AnimatePresence>{open && <MenuSheet key="sheet" label="Actions" interactive onDismiss={dismiss}>
      <button>Retained action</button>
    </MenuSheet>}</AnimatePresence>;
    const { rerender } = render(view(true));
    const dialog = screen.getByRole("dialog", { name: "Actions" });
    const overlay = dialog.parentElement!;
    rerender(view(false));
    expect(dialog).toBeInTheDocument();
    expect(overlay).toHaveAttribute("inert");
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(overlay);
    fireEvent.keyDown(overlay, { key: "Escape" });
    expect(dismiss).not.toHaveBeenCalled();
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });

  it("leaves passive specimens unfocused and nonmodal", () => {
    const dismiss = vi.fn();
    render(<MenuSheet label="Library artwork" onDismiss={dismiss}><span>Passive content</span></MenuSheet>);
    const dialog = screen.getByRole("dialog", { name: "Library artwork" });
    expect(dialog).not.toHaveAttribute("aria-modal");
    expect(dialog).not.toHaveFocus();
    fireEvent.click(dialog.parentElement!);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("removes translation and exits promptly under reduced motion", async () => {
    preferences.reducedMotion = true;
    const view = (open: boolean) => <AnimatePresence>{open && <MenuSheet key="sheet" label="Reduced motion actions" interactive>
      <button>Action</button>
    </MenuSheet>}</AnimatePresence>;
    const { rerender } = render(view(true));
    const dialog = screen.getByRole("dialog", { name: "Reduced motion actions" });
    expect(dialog.style.transform).not.toMatch(/translate/);
    const backdrop = dialog.previousElementSibling as HTMLElement;
    expect(backdrop).toHaveStyle({ opacity: "1" });
    rerender(view(false));
    expect(dialog.style.transform).not.toMatch(/translate/);
    await waitFor(() => expect(dialog).not.toBeInTheDocument(), { timeout: 200 });
  });

  it("preserves Feed follow/unfollow behavior, enabled focus and menu dismissal through the shared wrapper", () => {
    const toggle = vi.fn(), dismiss = vi.fn();
    const target = { kind: "publisher" as const, name: "Reuters" };
    const { rerender } = render(<FeedOptionsSheet interactive target={target} onToggleFollow={toggle} onDismiss={dismiss} />);
    const dialog = screen.getByRole("dialog", { name: "Feed options" });
    const menu = within(dialog).getByRole("menu", { name: "Feed options for Reuters" });
    const follow = within(menu).getByRole("menuitem", { name: "Follow Reuters" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(follow).toHaveFocus();
    expect(within(menu).getByRole("menuitem", { name: "Share" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(follow);
    expect(toggle).toHaveBeenCalledOnce();
    expect(dismiss).not.toHaveBeenCalled();
    rerender(<FeedOptionsSheet interactive followed target={target} onToggleFollow={toggle} onDismiss={dismiss} />);
    const unfollow = within(menu).getByRole("menuitem", { name: "Unfollow Reuters" });
    expect(unfollow).toBe(follow);
    expect(unfollow).toHaveFocus();
    fireEvent.keyDown(unfollow, { key: "Tab" });
    expect(unfollow).toHaveFocus();
    fireEvent.click(unfollow);
    expect(toggle).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(unfollow, { key: "Escape" });
    expect(dismiss).toHaveBeenCalledOnce();
  });
});
