import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewKeyScreens } from "./PreviewKeyScreens";

vi.mock("./PreviewScreenTile", () => ({ PreviewScreenTile: () => null }));

const titles = ["Home", "History", "Voice Search"];
const screens = titles.map((group) => ({ id: group, title: group, group, content: null }));
let nextFrame: number;
let frames: Map<number, FrameRequestCallback>;
let resizeCallbacks: ResizeObserverCallback[];
let resizeObservers: Array<{ disconnect: ReturnType<typeof vi.fn> }>;

beforeEach(() => {
  nextFrame = 0;
  frames = new Map();
  resizeCallbacks = [];
  resizeObservers = [];
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)));
  vi.stubGlobal("ResizeObserver", class {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(callback: ResizeObserverCallback) {
      resizeCallbacks.push(callback);
      resizeObservers.push(this);
    }
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function flushFrames() {
  act(() => {
    const pending = Array.from(frames.values());
    frames.clear();
    pending.forEach((callback) => callback(0));
  });
}

function rect(top: number, height: number) {
  return { x: 0, y: top, top, bottom: top + height, left: 0, right: 600, width: 600, height, toJSON: () => ({}) };
}

function renderGallery(positions = [24, 624, 1224], height = 1800) {
  const result = render(<PreviewKeyScreens screens={screens} theme="light" />);
  const gallery = screen.getByRole("region", { name: "Key screens gallery" });
  const groups = titles.map((title) => screen.getByRole("heading", { name: title }).closest("details")!);
  gallery.style.paddingTop = "24px";
  Object.defineProperties(gallery, {
    clientHeight: { configurable: true, value: 500 },
    scrollHeight: { configurable: true, value: height },
    getBoundingClientRect: { configurable: true, value: () => rect(100, 500) },
  });
  groups.forEach((group, index) => {
    Object.defineProperty(group, "getBoundingClientRect", {
      configurable: true, value: () => rect(100 + positions[index] - gallery.scrollTop, 560),
    });
  });
  flushFrames();
  return { ...result, gallery, groups, positions };
}

function scrollTo(gallery: HTMLElement, top: number) {
  gallery.scrollTop = top;
  fireEvent.scroll(gallery);
  flushFrames();
}

function expectCurrent(title: string) {
  titles.forEach((group) => {
    const button = screen.getByRole("button", { name: `Show ${group} group` });
    if (group === title) expect(button).toHaveAttribute("aria-current", "location");
    else expect(button).not.toHaveAttribute("aria-current");
  });
}

describe("Key screen section navigation", () => {
  it("follows the section in the upper part of the gallery while scrolling forward and back", () => {
    const { gallery } = renderGallery();
    expectCurrent("Home");
    scrollTo(gallery, 750);
    expectCurrent("History");
    scrollTo(gallery, 1240);
    expectCurrent("Voice Search");
    scrollTo(gallery, 400);
    expectCurrent("Home");
    scrollTo(gallery, 0);
    expectCurrent("Home");
  });

  it("switches at the upper 30% boundary before the next heading reaches the top, in both directions", () => {
    const { gallery, groups } = renderGallery();
    scrollTo(gallery, 460);
    expectCurrent("Home");
    expect(groups[1].getBoundingClientRect().top).toBeGreaterThan(250);
    scrollTo(gallery, 480);
    expectCurrent("History");
    expect(groups[1].getBoundingClientRect().top).toBeGreaterThan(100);
    expect(groups[1].getBoundingClientRect().top).toBeLessThan(250);
    scrollTo(gallery, 460);
    expectCurrent("Home");
  });

  it("selects a short final section at the bottom even when its heading cannot reach the top", () => {
    const { gallery } = renderGallery([24, 624, 1724]);
    scrollTo(gallery, 1200);
    expectCurrent("History");
    scrollTo(gallery, 1299.5);
    expectCurrent("Voice Search");
    scrollTo(gallery, 1200);
    expectCurrent("History");
  });

  it("opens and jumps to a clicked group, then resumes following manual scrolling", () => {
    const { gallery, groups, positions } = renderGallery();
    groups[1].open = false;
    const jump = vi.fn(() => { gallery.scrollTop = positions[1]; });
    Object.defineProperty(groups[1], "scrollIntoView", { configurable: true, value: jump });
    fireEvent.click(screen.getByRole("button", { name: "Show History group" }));
    expect(groups[1].open).toBe(true);
    expect(jump).toHaveBeenCalledWith({ behavior: "auto", block: "start", inline: "nearest" });
    fireEvent.scroll(gallery);
    flushFrames();
    expectCurrent("History");
    scrollTo(gallery, 100);
    expectCurrent("Home");
  });

  it("recalculates after layout changes and cancels pending updates on unmount", () => {
    const { gallery, groups, positions, unmount } = renderGallery();
    scrollTo(gallery, 750);
    expectCurrent("History");
    positions[2] = 700;
    act(() => resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver)));
    flushFrames();
    expectCurrent("Voice Search");
    positions[2] = 1224;
    fireEvent(groups[1], new Event("toggle"));
    flushFrames();
    expectCurrent("History");
    fireEvent.scroll(gallery);
    expect(frames.size).toBeGreaterThan(0);
    unmount();
    expect(frames.size).toBe(0);
    fireEvent.scroll(gallery);
    expect(frames.size).toBe(0);
    expect(resizeObservers.length).toBeGreaterThan(0);
    resizeObservers.forEach((observer) => expect(observer.disconnect).toHaveBeenCalled());
  });
});
