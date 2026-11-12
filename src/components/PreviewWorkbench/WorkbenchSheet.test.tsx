import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { MotionValue, Transition } from "motion/react";
import { WorkbenchSheet } from "./WorkbenchSheet";
import { iosMotion } from "../../motion/iosMotion";

const motionTest = vi.hoisted(() => ({
  reduced: false,
  animations: [] as Array<{
    value: MotionValue;
    target: string | number;
    transition: Transition;
    complete: () => void;
    stop: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: () => motionTest.reduced,
    animate: (value: MotionValue, target: string | number, transition: Transition) => {
      let complete!: () => void;
      const animation = new Promise<void>((resolve) => { complete = resolve; });
      const stop = vi.fn();
      motionTest.animations.push({ value, target, transition, complete, stop });
      return Object.assign(animation, { stop });
    },
  };
});

// JSDOM cannot model the browser top layer or Tab trap; native-browser QA covers those.
const dialogMethods = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype);
const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
  this.querySelector<HTMLButtonElement>("button")?.focus();
});
const close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open"); });

beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: showModal },
    close: { configurable: true, value: close },
  });
});
afterAll(() => {
  for (const name of ["showModal", "close"]) {
    if (dialogMethods[name]) Object.defineProperty(HTMLDialogElement.prototype, name, dialogMethods[name]);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});
beforeEach(() => {
  motionTest.reduced = false;
  motionTest.animations = [];
  showModal.mockClear();
  close.mockClear();
});
afterEach(cleanup);

async function finish(animations = motionTest.animations.slice(-2)) {
  await act(async () => { animations.forEach((animation) => animation.complete()); });
}

describe("WorkbenchSheet", () => {
  it("opens natively with an accessible title and retains modal ownership through dismissal", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const view = render(<WorkbenchSheet title="Settings" open onClose={onClose}><input aria-label="Theme" /></WorkbenchSheet>);
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(showModal).toHaveBeenCalledOnce();
    expect(within(dialog).getByRole("button", { name: "Close settings" })).toHaveFocus();
    expect(within(dialog).getByRole("textbox", { name: "Theme" })).toBeVisible();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close settings" }));
    expect(onClose).toHaveBeenCalledOnce();
    view.rerender(<WorkbenchSheet title="Settings" open={false} onClose={onClose}><input aria-label="Theme" /></WorkbenchSheet>);
    expect(dialog).toHaveAttribute("open");
    expect(close).not.toHaveBeenCalled();
    await finish();
    expect(dialog).not.toHaveAttribute("open");
    expect(close).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
    view.unmount();
    expect(close).toHaveBeenCalledOnce();
    trigger.remove();
  });

  it("prevents native cancel from releasing the modal before its exit and dismisses only backdrop clicks", () => {
    const onClose = vi.fn();
    render(<WorkbenchSheet title="Navigation" open onClose={onClose}><button>Browse</button></WorkbenchSheet>);
    const dialog = screen.getByRole("dialog", { name: "Navigation" });
    const cancel = new Event("cancel", { bubbles: false, cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
    expect(dialog).toHaveAttribute("open");
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Browse" }));
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.click(dialog.querySelector("[aria-hidden='true']")!);
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("reverses the retained values and ignores a stale exit completion after reopening", async () => {
    const onClose = vi.fn();
    const view = render(<WorkbenchSheet title="Settings" open onClose={onClose}>Settings content</WorkbenchSheet>);
    const initial = motionTest.animations.slice(-2);
    view.rerender(<WorkbenchSheet title="Settings" open={false} onClose={onClose}>Settings content</WorkbenchSheet>);
    const exit = motionTest.animations.slice(-2);
    expect(initial.every((animation) => animation.stop.mock.calls.length === 1)).toBe(true);
    act(() => { exit[0].value.set("37%"); exit[1].value.set(0.6); });
    view.rerender(<WorkbenchSheet title="Settings" open onClose={onClose}>Settings content</WorkbenchSheet>);
    const reopened = motionTest.animations.slice(-2);
    expect(reopened[0].value).toBe(exit[0].value);
    expect(reopened[0].value.get()).toBe("37%");
    expect(reopened[1].value).toBe(exit[1].value);
    expect(reopened[1].value.get()).toBe(0.6);
    expect(reopened[0].target).toBe("0%");
    expect(reopened[0].transition).toBe(iosMotion.sheet);
    expect(reopened[1].transition).toBe(iosMotion.fade);
    await finish(exit);
    expect(screen.getByRole("dialog", { name: "Settings" })).toHaveAttribute("open");
    expect(showModal).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
  });

  it("releases a modal once on cleanup and ignores pending animation completions", async () => {
    const view = render(<WorkbenchSheet title="Settings" open onClose={vi.fn()}>Settings content</WorkbenchSheet>);
    const pending = motionTest.animations.slice(-2);
    view.unmount();
    expect(close).toHaveBeenCalledOnce();
    expect(pending.every((animation) => animation.stop.mock.calls.length === 1)).toBe(true);
    await finish(pending);
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps an initially closed sheet closed and skips translation for reduced motion", async () => {
    motionTest.reduced = true;
    const onClose = vi.fn();
    const view = render(<WorkbenchSheet title="Settings" open={false} onClose={onClose}>Settings content</WorkbenchSheet>);
    expect(showModal).not.toHaveBeenCalled();
    expect(motionTest.animations).toHaveLength(0);
    view.rerender(<WorkbenchSheet title="Settings" open onClose={onClose}>Settings content</WorkbenchSheet>);
    expect(motionTest.animations.slice(-2).every((animation) => animation.transition === iosMotion.instant)).toBe(true);
    view.rerender(<WorkbenchSheet title="Settings" open={false} onClose={onClose}>Settings content</WorkbenchSheet>);
    expect(motionTest.animations.at(-2)?.target).toBe("0%");
    expect(motionTest.animations.slice(-2).every((animation) => animation.transition === iosMotion.instant)).toBe(true);
    await finish();
    expect(close).toHaveBeenCalledOnce();
  });
});
