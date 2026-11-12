import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Homepage } from "./Homepage";
import { BingAppPrototype } from "../BingAppPrototype";

const motion = vi.hoisted(() => ({ animate: vi.fn(), reduced: false }));
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    // Only the scroll-position timeline is controlled by this test. Screen
    // MotionValues still need real playback controls, including their Promise.
    animate: ((...args: Parameters<typeof actual.animate>) => typeof args[0] === "number"
      ? motion.animate(...args) : actual.animate(...args)) as typeof actual.animate,
    useReducedMotion: () => motion.reduced,
  };
});

let stop: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  motion.reduced = false;
  stop = vi.fn();
  motion.animate.mockReset().mockReturnValue({ stop });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function scrollSurface() {
  const content = screen.getByRole("region", { name: "Homepage content" });
  Object.defineProperties(content, {
    clientHeight: { configurable: true, value: 726 },
    scrollHeight: { configurable: true, value: 2300 },
  });
  return content;
}

function scrollDown(content: HTMLElement, position: number) {
  fireEvent.wheel(content, { deltaY: 30 });
  fireEvent.scroll(content, { target: { scrollTop: position } });
}
function idle() { act(() => vi.advanceTimersByTime(60)); }
function currentAnimation() {
  return motion.animate.mock.lastCall![2] as { onUpdate: (position: number) => void; onComplete: () => void };
}

describe("Homepage hero snap", () => {
  it("uses the short hero's threshold and destination, and cancels stale settling on resize", () => {
    const observers = new Map<Element, () => void>();
    vi.stubGlobal("ResizeObserver", class {
      constructor(private callback: () => void) {}
      observe(target: Element) { observers.set(target, this.callback); }
      disconnect() {}
    });
    render(<Homepage />);
    const root = screen.getByRole("main", { name: "Bing homepage" });
    const content = scrollSurface();
    const resize = (height: number) => {
      Object.defineProperty(root, "clientHeight", { configurable: true, value: height });
      act(() => observers.get(root)?.());
    };
    resize(450);
    scrollDown(content, 21.5);
    idle();
    expect(motion.animate).not.toHaveBeenCalled();
    scrollDown(content, 21.6);
    idle();
    expect(motion.animate).toHaveBeenCalledWith(21.6, 77, expect.objectContaining({ duration: 0.32 }));
    act(() => currentAnimation().onUpdate(36));
    resize(874);
    expect(stop).toHaveBeenCalledOnce();
    expect(content.scrollTop).toBe(166);
    expect(screen.getByRole("search").parentElement).toHaveStyle({ transform: "translateY(166px)" });
    idle();
    expect(motion.animate).toHaveBeenCalledOnce();
  });

  it("returns Home to the hero with synchronized motion without remounting existing feed cards", () => {
    const navigate = vi.fn();
    render(<Homepage onNavigate={navigate} />);
    const content = scrollSurface();
    const article = screen.getAllByRole("article")[0];
    scrollDown(content, 1500);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(navigate).toHaveBeenCalledWith("home");
    expect(motion.animate).toHaveBeenCalledWith(1500, 0, expect.objectContaining({ duration: 0.42 }));
    act(() => currentAnimation().onUpdate(200));
    expect(content.scrollTop).toBe(200);
    expect(screen.getByRole("search").parentElement).toHaveStyle({ transform: "translateY(132px)" });
    act(() => currentAnimation().onComplete());
    expect(content.scrollTop).toBe(0);
    expect(screen.getByRole("search")).toHaveAttribute("data-compact", "false");
    expect(screen.getAllByRole("article")[0]).toBe(article);
    fireEvent.scroll(content);
    idle();
    expect(motion.animate).toHaveBeenCalledOnce();
  });

  it("lets Home replace an active snap, and a new scroll gesture interrupt returning Home", () => {
    render(<Homepage />);
    const content = scrollSurface();
    scrollDown(content, 200);
    idle();
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(stop).toHaveBeenCalledOnce();
    act(() => currentAnimation().onUpdate(80));
    fireEvent.wheel(content, { deltaY: -20 });
    expect(stop).toHaveBeenCalledTimes(2);
    idle();
    expect(content.scrollTop).toBe(80);
    expect(motion.animate).toHaveBeenCalledTimes(2);
  });

  it("returns Home immediately when reduced motion is enabled", () => {
    motion.reduced = true;
    render(<Homepage />);
    const content = scrollSurface();
    fireEvent.scroll(content, { target: { scrollTop: 1500 } });
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(content.scrollTop).toBe(0);
    expect(motion.animate).not.toHaveBeenCalled();
  });

  it("waits for the gesture to settle past 30%, then moves search and cards on the same timeline", () => {
    render(<Homepage />);
    const content = scrollSurface();
    scrollDown(content, 99.5);
    idle();
    expect(motion.animate).not.toHaveBeenCalled();

    scrollDown(content, 100);
    act(() => vi.advanceTimersByTime(40));
    scrollDown(content, 120);
    act(() => vi.advanceTimersByTime(59));
    expect(motion.animate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(motion.animate).toHaveBeenCalledWith(120, 384, expect.objectContaining({ duration: 0.32, ease: [0.22, 0, 0.2, 1] }));
    act(() => currentAnimation().onUpdate(300));
    expect(content.scrollTop).toBe(300);
    expect(screen.getByRole("search").parentElement).toHaveStyle({ transform: "translateY(32px)" });
    act(() => currentAnimation().onComplete());
    expect(content.scrollTop).toBe(384);
    expect(screen.getByRole("search").parentElement).toHaveStyle({ transform: "translateY(0px)" });
    expect(screen.getByRole("search")).toHaveAttribute("data-compact", "true");
    // Programmatic animation scroll events cannot start a second snap.
    fireEvent.scroll(content);
    idle();
    expect(motion.animate).toHaveBeenCalledOnce();
  });

  it("leaves restored positions, horizontal gestures and feed scrolling alone", () => {
    render(<Homepage />);
    const content = scrollSurface();
    fireEvent.scroll(content, { target: { scrollTop: 280 } });
    idle();
    fireEvent.wheel(content, { deltaX: 100, deltaY: 5 });
    idle();
    fireEvent.wheel(content, { deltaY: 30, ctrlKey: true });
    idle();
    for (const position of [384, 555, 1600]) {
      scrollDown(content, position);
      idle();
      expect(content.scrollTop).toBe(position);
    }
    fireEvent.wheel(content, { deltaY: -100 });
    fireEvent.scroll(content, { target: { scrollTop: 280 } });
    idle();
    expect(motion.animate).not.toHaveBeenCalled();
    expect(content.scrollTop).toBe(280);
  });

  it("lets a reverse wheel interrupt an active snap without a delayed restart", () => {
    render(<Homepage />);
    const content = scrollSurface();
    scrollDown(content, 270);
    idle();
    act(() => currentAnimation().onUpdate(290));
    fireEvent.wheel(content, { deltaY: -40 });
    fireEvent.scroll(content, { target: { scrollTop: 270 } });
    idle();
    expect(stop).toHaveBeenCalledOnce();
    expect(content.scrollTop).toBe(270);
    expect(motion.animate).toHaveBeenCalledOnce();
  });

  it("holds the content under the finger until touch release and supports re-grabbing the snap", () => {
    render(<Homepage />);
    const content = scrollSurface();
    fireEvent.pointerDown(content, { pointerType: "touch" });
    fireEvent.touchStart(content, { touches: [{ clientY: 600 }] });
    fireEvent.pointerCancel(content, { pointerType: "touch" });
    fireEvent.touchMove(content, { touches: [{ clientY: 330 }] });
    fireEvent.scroll(content, { target: { scrollTop: 270 } });
    idle();
    expect(motion.animate).not.toHaveBeenCalled();
    fireEvent.touchEnd(content, { touches: [] });
    idle();
    expect(motion.animate).toHaveBeenCalledOnce();
    act(() => currentAnimation().onUpdate(280));
    fireEvent.touchStart(content, { touches: [{ clientY: 400 }] });
    expect(stop).toHaveBeenCalledOnce();
    fireEvent.touchCancel(content, { touches: [] });
    idle();
    expect(content.scrollTop).toBe(280);
    expect(motion.animate).toHaveBeenCalledOnce();
  });

  it("cancels pending and active work when another screen owns navigation", () => {
    const { rerender, unmount } = render(<Homepage />);
    const content = scrollSurface();
    scrollDown(content, 270);
    rerender(<Homepage scrollSnapEnabled={false} />);
    idle();
    expect(motion.animate).not.toHaveBeenCalled();

    rerender(<Homepage />);
    scrollDown(content, 270);
    idle();
    act(() => currentAnimation().onUpdate(280));
    rerender(<Homepage searchConcealed />);
    expect(stop).toHaveBeenCalledOnce();
    expect(content.scrollTop).toBe(280);
    rerender(<Homepage />);
    idle();
    expect(motion.animate).toHaveBeenCalledOnce();
    scrollDown(content, 280);
    unmount();
    idle();
    expect(motion.animate).toHaveBeenCalledOnce();
  });

  it("stops settling when the prototype opens Search", () => {
    render(<BingAppPrototype />);
    const content = scrollSurface();
    scrollDown(content, 270);
    idle();
    act(() => currentAnimation().onUpdate(280));
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search Bing" }));
    expect(screen.getByRole("main", { name: "Search page" })).toBeVisible();
    expect(stop).toHaveBeenCalledOnce();
    idle();
    expect(content.scrollTop).toBe(280);
  });

  it("settles keyboard scrolling at 30% and respects reduced motion", () => {
    motion.reduced = true;
    render(<Homepage />);
    const content = scrollSurface();
    fireEvent.keyDown(content, { key: "ArrowDown" });
    fireEvent.scroll(content, { target: { scrollTop: 99.6 } });
    idle();
    expect(content.scrollTop).toBe(384);
    expect(screen.getByRole("search").parentElement).toHaveStyle({ transform: "translateY(0px)" });
    expect(motion.animate).not.toHaveBeenCalled();
  });
});
