import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MotionValue } from "motion/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedCard } from "./FeedCard";

const motion = vi.hoisted(() => ({ animate: vi.fn(), reduced: false }));
vi.mock("motion/react", async importOriginal => ({
  ...await importOriginal<typeof import("motion/react")>(),
  animate: motion.animate,
  useReducedMotion: () => motion.reduced,
}));
beforeEach(() => { motion.reduced = false; motion.animate.mockReset().mockReturnValue({ stop: vi.fn() }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Feed carousel motion", () => {
  it("paints a controlled initial slide directly and snaps to resized canvas geometry", () => {
    let resize!: () => void;
    let width = 362;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => width);
    vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
    render(<FeedCard variant="multi" activeSlideIndex={2} />);
    expect(motion.animate).not.toHaveBeenCalled();
    width = 330;
    act(() => resize());
    expect(motion.animate).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: /Slide 3 of 4/ })).toBeInTheDocument();
  });

  it("continues a re-grab from the current position and measures the gesture in phone pixels", () => {
    render(<FeedCard variant="multi" />);
    const carousel = screen.getByRole("group", { name: /Slide 1 of 4/ });
    Object.defineProperty(carousel, "clientWidth", { configurable: true, value: 318 });
    vi.spyOn(carousel, "getBoundingClientRect").mockReturnValue({ width: 159 } as DOMRect);
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));
    const x = motion.animate.mock.lastCall![0] as MotionValue<number>;
    act(() => x.set(-100)); // Midway through the settling spring.
    fireEvent.pointerDown(carousel, { pointerId: 1, clientX: 180, button: 0 });
    expect(x.get()).toBe(-100);
    fireEvent.pointerMove(carousel, { pointerId: 1, clientX: 145 });
    expect(x.get()).toBe(-170); // 35 viewport px = 70 phone px at 50% zoom.
    fireEvent.pointerUp(carousel, { pointerId: 1, clientX: 145 });
    // Settle to the next visible page, not an extra page beyond the old target.
    expect(carousel).toHaveAccessibleName(expect.stringContaining("Slide 2 of 4"));
    expect(motion.animate.mock.lastCall![1]).toBe(-330);
  });

  it("locks a diagonal vertical gesture to the feed before moving the carousel", () => {
    const change = vi.fn();
    render(<FeedCard variant="multi" onActiveSlideChange={change} />);
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));
    const carousel = screen.getByRole("group", { name: /Slide 2 of 4/ });
    const x = motion.animate.mock.lastCall![0] as MotionValue<number>;
    act(() => x.set(-330));
    change.mockClear();
    fireEvent.pointerDown(carousel, { pointerId: 1, clientX: 200, clientY: 200, button: 0 });
    fireEvent.pointerMove(carousel, { pointerId: 1, clientX: 140, clientY: 80 });
    expect(x.get()).toBe(-330);
    // Once vertical intent wins, a later horizontal turn cannot steal the gesture.
    fireEvent.pointerMove(carousel, { pointerId: 1, clientX: 0, clientY: 190 });
    expect(x.get()).toBe(-330);
    fireEvent.pointerUp(carousel, { pointerId: 1 });
    expect(carousel).toHaveAccessibleName(expect.stringContaining("Slide 2 of 4"));
    expect(change).not.toHaveBeenCalled();
  });

  it("recognizes horizontal intent once and keeps direct movement when the drag turns vertically", () => {
    render(<FeedCard variant="multi" />);
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));
    const carousel = screen.getByRole("group", { name: /Slide 2 of 4/ });
    const x = motion.animate.mock.lastCall![0] as MotionValue<number>;
    act(() => x.set(-330));
    fireEvent.pointerDown(carousel, { pointerId: 1, clientX: 200, clientY: 200, button: 0 });
    fireEvent.pointerMove(carousel, { pointerId: 1, clientX: 140, clientY: 190 });
    expect(x.get()).toBe(-390);
    fireEvent.pointerMove(carousel, { pointerId: 1, clientX: 130, clientY: 50 });
    expect(x.get()).toBe(-400);
    fireEvent.pointerUp(carousel, { pointerId: 1 });
    expect(carousel).toHaveAccessibleName(expect.stringContaining("Slide 3 of 4"));
    expect(motion.animate.mock.lastCall![1]).toBe(-660);
  });

  it.each(["tap", "vertical"] as const)("resumes the pending target after a %s interrupts settling", gesture => {
    const change = vi.fn();
    render(<FeedCard variant="multi" onActiveSlideChange={change} />);
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 3" }));
    const carousel = screen.getByRole("group", { name: /Slide 3 of 4/ });
    const x = motion.animate.mock.lastCall![0] as MotionValue<number>;
    act(() => x.set(-100));
    change.mockClear();
    fireEvent.pointerDown(carousel, { pointerId: 1, clientX: 200, clientY: 200, button: 0 });
    fireEvent.pointerMove(carousel, { pointerId: 1, clientX: 197, clientY: gesture === "vertical" ? 100 : 198 });
    expect(x.get()).toBe(-100);
    fireEvent.pointerUp(carousel, { pointerId: 1 });
    expect(carousel).toHaveAccessibleName(expect.stringContaining("Slide 3 of 4"));
    expect(motion.animate.mock.lastCall![1]).toBe(-660);
    expect(change).not.toHaveBeenCalled();
  });

  it("changes slides immediately under reduced motion", () => {
    motion.reduced = true;
    render(<FeedCard variant="multi" />);
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));
    expect(screen.getByRole("group", { name: /Slide 2 of 4/ })).toBeInTheDocument();
    expect(motion.animate).not.toHaveBeenCalled();
  });
});
