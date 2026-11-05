import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { AnimatePresence } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrossfadeContent, MotionPresence, ScreenLayer, useOverlayPresence } from "./MotionPresence";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Interruptible presence", () => {
  it("slides an opaque screen right, reverses without jumping, and retains its content after exit", async () => {
    const view = (visible: boolean) => <ScreenLayer data-testid="screen" visible={visible} exitToRight={!visible}
      aria-hidden={!visible || undefined} {...(!visible ? { inert: "" } : {})}><button>Retained page</button></ScreenLayer>;
    const { rerender } = render(view(true));
    const layer = screen.getByTestId("screen");
    const page = screen.getByRole("button", { name: "Retained page" });
    const position = () => Number(layer.style.transform.match(/translateX\(([-\d.]+)%\)/)?.[1] ?? 0);
    rerender(view(false));
    expect(layer).toHaveAttribute("inert");
    await waitFor(() => expect(position()).toBeGreaterThan(0));
    const interruptedPosition = position();
    expect(interruptedPosition).toBeLessThan(100);
    expect(layer).toHaveStyle({ opacity: "1" });
    rerender(view(true));
    expect(position()).toBeCloseTo(interruptedPosition, 1);
    await waitFor(() => expect(position()).toBe(0));
    expect(layer).toHaveStyle({ opacity: "1" });
    expect(screen.getByRole("button", { name: "Retained page" })).toBe(page);
    rerender(view(false));
    await waitFor(() => expect(layer).toHaveStyle({ opacity: "0" }));
    expect(position()).toBe(0);
    expect(page).toBeInTheDocument();
  });

  it("keeps outgoing controls inert while their artwork finishes disappearing", async () => {
    const view = (open: boolean) => <AnimatePresence>{open && <MotionPresence key="menu" initial={false}
      animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}><button>Delete</button></MotionPresence>}</AnimatePresence>;
    const { rerender } = render(view(true));
    const action = screen.getByRole("button", { name: "Delete" });
    rerender(view(false));
    expect(action).toBeInTheDocument();
    expect(action.closest("[inert]")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    await waitFor(() => expect(action).not.toBeInTheDocument());
  });

  it("restores the same content when its fade-out is reversed, without leaving it transparent", async () => {
    const view = (mode: string) => <AnimatePresence initial={false} mode="popLayout">
      <CrossfadeContent key={mode} enabled enter={false}><button>{mode}</button></CrossfadeContent>
    </AnimatePresence>;
    const { rerender } = render(view("Discovery"));
    const original = screen.getByRole("button", { name: "Discovery" });
    rerender(view("Private"));
    expect(original.closest("[inert]")).not.toBeNull();
    rerender(view("Discovery"));
    expect(screen.getByRole("button", { name: "Discovery" })).toBe(original);
    await waitFor(() => expect(original).toBeVisible());
    await waitFor(() => expect(screen.queryByText("Private")).not.toBeInTheDocument());
    expect(original.closest("[inert]")).toBeNull();
  });

  it("retains modal ownership through exit and cancels stale completion/focus when reopened", () => {
    vi.useFakeTimers();
    const closed = vi.fn();
    const { result, rerender, unmount } = renderHook(({ open }) => useOverlayPresence(open, closed), { initialProps: { open: true } });
    const oldFinish = result.current.finishExit;
    rerender({ open: false });
    expect(result.current.presented).toBe(true);
    rerender({ open: true });
    act(oldFinish);
    expect(result.current.presented).toBe(true);
    rerender({ open: false });
    act(() => result.current.finishExit());
    expect(result.current.presented).toBe(false);
    rerender({ open: true });
    act(() => vi.runAllTimers());
    expect(closed).not.toHaveBeenCalled();
    rerender({ open: false });
    act(() => result.current.finishExit());
    unmount();
    act(() => vi.runAllTimers());
    expect(closed).not.toHaveBeenCalled();
  });
});
