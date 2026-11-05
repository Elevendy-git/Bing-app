import { act, cleanup, render, waitFor } from "@testing-library/react";
import { motionValue } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceSearch } from "./VoiceSearch";

const settings = vi.hoisted(() => ({ reduced: false }));
vi.mock("motion/react", async original => ({
  ...await original<typeof import("motion/react")>(), useReducedMotion: () => settings.reduced,
}));
afterEach(() => { cleanup(); settings.reduced = false; });
const signal = (level: number) => Array<number>(12).fill(level);
const bars = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('[data-voice-waveform] > span'));
const height = (bar: HTMLElement) => Number.parseFloat(bar.style.height);

describe("Voice Search audio feedback", () => {
  it("reacts to live levels and settles to the original dots in silence without replacing the bars", async () => {
    const levels = motionValue<readonly number[]>(signal(0));
    const { container, rerender } = render(<VoiceSearch interactive state="listening" audioLevels={levels} />);
    const original = bars(container);
    expect(original).toHaveLength(12);
    expect(original.every(bar => height(bar) === 8)).toBe(true);
    act(() => levels.set(signal(1)));
    await waitFor(() => expect(original.every(bar => height(bar) > 22)).toBe(true));
    rerender(<VoiceSearch interactive state="input" transcript="Good morning" audioLevels={levels} />);
    expect(bars(container)).toEqual(original);
    act(() => levels.set(signal(0)));
    await waitFor(() => expect(original.every(bar => Math.abs(height(bar) - 8) < 0.1)).toBe(true));
  });

  it("freezes the drawn waveform while covered, then continues from it on resume", async () => {
    const levels = motionValue<readonly number[]>(signal(0));
    const { container, rerender } = render(<VoiceSearch interactive audioLevels={levels} />);
    act(() => levels.set(signal(1)));
    await waitFor(() => expect(height(bars(container)[0])).toBeGreaterThan(22));
    rerender(<VoiceSearch interactive active={false} audioLevels={levels} />);
    const frozen = height(bars(container)[0]);
    act(() => levels.set(signal(0)));
    await new Promise(resolve => setTimeout(resolve, 70));
    expect(height(bars(container)[0])).toBe(frozen);
    rerender(<VoiceSearch interactive audioLevels={levels} />);
    expect(height(bars(container)[0])).toBeGreaterThan(8);
    await waitFor(() => expect(height(bars(container)[0])).toBeLessThan(8.1));
  });

  it("retains static Figma specimens and Reduce Motion feedback even if a signal source changes", async () => {
    const levels = motionValue<readonly number[]>(signal(1));
    const { container, rerender } = render(<VoiceSearch state="input" audioLevels={levels} />);
    const specimen = bars(container).map(height);
    act(() => levels.set(signal(0)));
    expect(bars(container).map(height)).toEqual(specimen);
    settings.reduced = true;
    rerender(<VoiceSearch interactive state="input" audioLevels={levels} />);
    act(() => levels.set(signal(1)));
    await waitFor(() => expect(bars(container).every(bar => height(bar) === 8)).toBe(true));
  });

  it("resumes an interrupted silent settling even when the signal target has not changed", async () => {
    const levels = motionValue<readonly number[]>(signal(1));
    const { container, rerender } = render(<VoiceSearch interactive audioLevels={levels} />);
    act(() => levels.set(signal(0)));
    await waitFor(() => {
      expect(height(bars(container)[0])).toBeLessThan(23);
      expect(height(bars(container)[0])).toBeGreaterThan(8.2);
    });
    rerender(<VoiceSearch interactive active={false} audioLevels={levels} />);
    const frozen = height(bars(container)[0]);
    await new Promise(resolve => setTimeout(resolve, 70));
    expect(height(bars(container)[0])).toBe(frozen);
    rerender(<VoiceSearch interactive audioLevels={levels} />);
    expect(height(bars(container)[0])).toBe(frozen);
    await waitFor(() => expect(height(bars(container)[0])).toBeLessThan(8.1));
  });
});
