import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toast } from "./Toast";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Toast", () => {
  it("offers Undo and gives focused/hovering users time to act before dismissal", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const onAction = vi.fn();
    render(<Toast message="You've followed this channel" actionLabel="Undo" onAction={onAction} onDismiss={onDismiss} />);
    const toast = screen.getByRole("status");
    act(() => vi.advanceTimersByTime(4000));
    fireEvent.pointerEnter(toast);
    act(() => vi.advanceTimersByTime(6000));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.pointerLeave(toast);
    fireEvent.focus(screen.getByRole("button", { name: "Undo" }));
    act(() => vi.advanceTimersByTime(6000));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onAction).toHaveBeenCalledOnce();
    fireEvent.blur(screen.getByRole("button", { name: "Undo" }));
    act(() => vi.advanceTimersByTime(5000));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("cancels the previous timer when a new message replaces it or it unmounts", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { rerender, unmount } = render(<Toast message="Followed" onDismiss={onDismiss} />);
    act(() => vi.advanceTimersByTime(4000));
    rerender(<Toast message="Unfollowed" onDismiss={onDismiss} />);
    act(() => vi.advanceTimersByTime(4000));
    expect(onDismiss).not.toHaveBeenCalled();
    unmount();
    act(() => vi.advanceTimersByTime(6000));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
