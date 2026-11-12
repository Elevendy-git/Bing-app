import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWorkbenchViewport } from "./useWorkbenchViewport";

function mockVisualViewport() {
  const visual = Object.assign(new EventTarget(), {
    width: 390,
    height: 844,
    offsetTop: 0,
    scale: 1,
  });
  vi.stubGlobal("visualViewport", visual);
  const change = (values: Partial<Pick<typeof visual, "width" | "height" | "offsetTop" | "scale">>, type = "resize") => {
    act(() => {
      Object.assign(visual, values);
      visual.dispatchEvent(new Event(type));
    });
  };
  return { visual, change };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("useWorkbenchViewport", () => {
  it("keeps controls inside the visible keyboard canvas while anchoring content to its resting height", () => {
    const { change } = mockVisualViewport();
    const { result } = renderHook(() => useWorkbenchViewport(true));
    expect(result.current).toMatchObject({
      "--gnrc-workbench-height": "844px",
      "--gnrc-workbench-top": "0px",
      "--gnrc-workbench-resting-height": "844px",
    });

    // The device keyboard reduces and pans the visible area. The empty-state anchor stays put.
    change({ height: 504, offsetTop: 36 });
    expect(result.current).toMatchObject({
      "--gnrc-workbench-height": "504px",
      "--gnrc-workbench-top": "36px",
      "--gnrc-workbench-resting-height": "844px",
    });
    change({ offsetTop: 12 }, "scroll");
    expect(result.current).toHaveProperty("--gnrc-workbench-top", "12px");
    // Closing the keyboard may leave browser chrome visible; it must not shift the illustration.
    change({ height: 800, offsetTop: 0 });
    expect(result.current).toMatchObject({
      "--gnrc-workbench-height": "800px",
      "--gnrc-workbench-top": "0px",
      "--gnrc-workbench-resting-height": "844px",
    });
    change({ height: 900 });
    expect(result.current).toHaveProperty("--gnrc-workbench-resting-height", "900px");
  });

  it("reestablishes the resting canvas when orientation changes instead of retaining a portrait anchor", () => {
    const { change } = mockVisualViewport();
    const { result } = renderHook(() => useWorkbenchViewport(true));
    change({ height: 504 });
    change({ width: 844, height: 390 });
    expect(result.current).toMatchObject({
      "--gnrc-workbench-height": "390px",
      "--gnrc-workbench-resting-height": "390px",
    });
    change({ height: 220 });
    expect(result.current).toHaveProperty("--gnrc-workbench-resting-height", "390px");
    change({ width: 390, height: 780 });
    expect(result.current).toMatchObject({
      "--gnrc-workbench-height": "780px",
      "--gnrc-workbench-resting-height": "780px",
    });
  });

  it("leaves layout stable during pinch magnification and transient zero-sized viewports", () => {
    const { change } = mockVisualViewport();
    const { result } = renderHook(() => useWorkbenchViewport(true));
    const restingLayout = result.current;
    change({ scale: 2, width: 195, height: 422, offsetTop: 120 });
    expect(result.current).toBe(restingLayout);
    change({ offsetTop: 180 }, "scroll");
    expect(result.current).toBe(restingLayout);
    change({ scale: 1, width: 390, height: 0, offsetTop: 0 });
    expect(result.current).toBe(restingLayout);
    change({ height: 504, offsetTop: 0 });
    expect(result.current).toMatchObject({
      "--gnrc-workbench-height": "504px",
      "--gnrc-workbench-top": "0px",
      "--gnrc-workbench-resting-height": "844px",
    });
  });

  it("releases mobile viewport listeners on desktop and unmount, then measures a fresh mobile canvas", () => {
    const { visual, change } = mockVisualViewport();
    const add = vi.spyOn(visual, "addEventListener");
    const remove = vi.spyOn(visual, "removeEventListener");
    const { result, rerender, unmount } = renderHook(({ compact }) => useWorkbenchViewport(compact), {
      initialProps: { compact: true },
    });
    const initialListeners = add.mock.calls.slice();
    rerender({ compact: false });
    expect(result.current).toBeUndefined();
    for (const [type, listener] of initialListeners) expect(remove).toHaveBeenCalledWith(type, listener);
    change({ height: 600 });
    expect(result.current).toBeUndefined();
    rerender({ compact: true });
    expect(result.current).toMatchObject({
      "--gnrc-workbench-height": "600px",
      "--gnrc-workbench-resting-height": "600px",
    });
    const resumedListeners = add.mock.calls.slice(initialListeners.length);
    unmount();
    for (const [type, listener] of resumedListeners) expect(remove).toHaveBeenCalledWith(type, listener);
  });

  it("falls back to CSS sizing when the browser has no Visual Viewport API", () => {
    vi.stubGlobal("visualViewport", undefined);
    const { result } = renderHook(() => useWorkbenchViewport(true));
    expect(result.current).toBeUndefined();
  });
});
