import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IOSStatusBar } from "./IOSStatusBar";
import { PhonePreview } from "../PreviewWorkbench/PhonePreview";
import { formatIOSStatusTime } from "./useIOSStatusTime";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("IOSStatusBar", () => {
  it("updates system time at the minute boundary without rerendering the screen", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 13, 9, 41, 59, 500));
    let parentRenders = 0;
    function PhoneScreen() {
      parentRenders += 1;
      return <IOSStatusBar timeSource="system" />;
    }
    const { unmount } = render(<PhoneScreen />);
    expect(screen.getByText("9:41")).toBeVisible();
    act(() => vi.advanceTimersByTime(499));
    expect(screen.getByText("9:41")).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("9:42")).toBeVisible();
    expect(parentRenders).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("switches to fixed time and cancels system updates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 13, 12, 59, 59));
    const { rerender } = render(<IOSStatusBar timeSource="system" />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("1:00")).toBeVisible();
    rerender(<IOSStatusBar time="8:15" />);
    expect(screen.getByText("8:15")).toBeVisible();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps mounted screens on one clock while fixed specimens stay independent", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 27, 16, 29, 59, 500));
    const first = render(<IOSStatusBar timeSource="system" />);
    const second = render(<IOSStatusBar timeSource="system" />);
    const fixed = render(<IOSStatusBar />);
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(500));
    const expected = formatIOSStatusTime(new Date());
    expect(within(first.container).getByText(expected)).toBeVisible();
    expect(within(second.container).getByText(expected)).toBeVisible();
    expect(within(fixed.container).getByText("9:41")).toBeVisible();
    first.unmount();
    expect(vi.getTimerCount()).toBe(1);
    second.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["focus", "pageshow", "visibilitychange"])("resynchronizes after %s without waiting for the old timer", event => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 27, 9, 41, 12));
    render(<IOSStatusBar timeSource="system" />);
    vi.setSystemTime(new Date(2026, 9, 27, 10, 5, 59, 500));
    fireEvent(event === "visibilitychange" ? document : window, new Event(event));
    expect(screen.getByText("10:05")).toBeVisible();
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText("10:06")).toBeVisible();
  });

  it("uses the locale's 12/24-hour convention without a day-period label", () => {
    const afternoon = new Date(2026, 9, 27, 16, 5);
    expect(formatIOSStatusTime(afternoon, "en-US")).toBe("4:05");
    expect(formatIOSStatusTime(afternoon, "zh-CN")).toBe("16:05");
    expect(formatIOSStatusTime(new Date(2026, 9, 27, 0, 5), "en-GB")).toBe("0:05");
  });

  it("supports compact, expanded and minimal content while preserving the right status information", () => {
    const { rerender } = render(<IOSStatusBar />);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    rerender(<IOSStatusBar dynamicIsland={{ presentation: "compact", ariaLabel: "Ride status", compactLeading: "Car", compactTrailing: "3 min" }} />);
    expect(within(screen.getByRole("group", { name: "Ride status" })).getByText("3 min")).toBeVisible();
    expect(screen.getByText("9:41")).toBeVisible();
    rerender(<IOSStatusBar dynamicIsland={{ presentation: "expanded", ariaLabel: "Ride details", expanded: { leading: "Driver", trailing: "3 min", center: "Arriving", bottom: "At the entrance" } }} />);
    expect(within(screen.getByRole("group", { name: "Ride details" })).getByText("At the entrance")).toBeInTheDocument();
    expect(screen.queryByText("9:41")).not.toBeInTheDocument();
    rerender(<IOSStatusBar dynamicIsland={{ presentation: "minimal", ariaLabel: "Ride icon", minimal: "Car" }} />);
    expect(screen.getByRole("group", { name: "Ride icon" })).toBeInTheDocument();
    expect(screen.getByText("9:41")).toBeVisible();
  });

  it("uses independent frame overlays while standalone library previews stay inline", () => {
    render(<>
      <section aria-label="First preview"><PhonePreview theme="light" label="First screen">
        <IOSStatusBar dynamicIsland={{ presentation: "compact", ariaLabel: "First activity", compactLeading: "A", compactTrailing: "1" }} />
      </PhonePreview></section>
      <section aria-label="Second preview"><PhonePreview theme="light" label="Second screen">
        <IOSStatusBar dynamicIsland={{ presentation: "expanded", ariaLabel: "Second activity", expanded: { center: "B" } }} />
      </PhonePreview></section>
      <section aria-label="Standalone preview"><IOSStatusBar dynamicIsland={{ presentation: "minimal", ariaLabel: "Standalone activity", minimal: "C" }} /></section>
    </>);
    expect(within(screen.getByRole("region", { name: "First preview" })).getByRole("group", { name: "First activity" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Second preview" })).getByRole("group", { name: "Second activity" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "First screen" })).queryByRole("group")).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Second screen" })).queryByRole("group")).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Standalone preview" })).getByRole("group", { name: "Standalone activity" })).toBeInTheDocument();
  });

  it("supports a feature-owned activity host", () => {
    const host = { presentation: "expanded" as const, node: <button type="button">Open activity</button> };
    render(<IOSStatusBar dynamicIslandFeatureHost={host} />);
    expect(screen.getByRole("button", { name: "Open activity" })).toBeInTheDocument();
    expect(screen.queryByText("9:41")).not.toBeInTheDocument();
  });
});
