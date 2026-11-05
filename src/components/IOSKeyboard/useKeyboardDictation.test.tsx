import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useKeyboardDictation } from "./useKeyboardDictation";

type ResultEvent = { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] };
class Recognition {
  static instances: Recognition[] = [];
  lang = ""; continuous = false; interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: ResultEvent) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(); stop = vi.fn(); abort = vi.fn();
  constructor() { Recognition.instances.push(this); }
}
beforeEach(() => { Recognition.instances = []; vi.stubGlobal("SpeechRecognition", Recognition); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const transcript = (text: string, isFinal: boolean): ResultEvent => ({ resultIndex: 0, results: [{ isFinal, 0: { transcript: text } }] });

describe("Browser keyboard dictation", () => {
  it("starts only on request, displays interim speech and inserts final text only", () => {
    const insert = vi.fn();
    const { result } = renderHook(() => useKeyboardDictation(true, insert));
    expect(Recognition.instances).toHaveLength(0);
    act(() => result.current.toggle());
    const session = Recognition.instances[0];
    expect(session.start).toHaveBeenCalledOnce();
    expect(session).toMatchObject({ lang: "en-US", continuous: true, interimResults: true });
    act(() => session.onresult?.(transcript("Weather", false)));
    expect(result.current.status).toBe("Weather");
    expect(insert).not.toHaveBeenCalled();
    act(() => session.onresult?.(transcript("Weather tomorrow", true)));
    expect(insert).toHaveBeenCalledExactlyOnceWith("Weather tomorrow");
    expect(result.current.status).toBe("Listening…");
    act(() => result.current.toggle());
    expect(session.stop).toHaveBeenCalledOnce();
    act(() => session.onend?.());
    expect(result.current.listening).toBe(false);
    expect(result.current.status).toBe("");
  });

  it.each(["not-allowed", "audio-capture", "network", "no-speech"])("reports %s failures and permits a fresh attempt", error => {
    const { result } = renderHook(() => useKeyboardDictation(true, vi.fn()));
    act(() => result.current.toggle());
    const first = Recognition.instances[0];
    act(() => first.onerror?.({ error }));
    expect(result.current.listening).toBe(false);
    expect(result.current.status).not.toBe("");
    expect(first.abort).toHaveBeenCalledOnce();
    act(() => result.current.toggle());
    expect(Recognition.instances).toHaveLength(2);
    expect(result.current.listening).toBe(true);
  });

  it("aborts when hidden or unmounted and ignores late or superseded callbacks", () => {
    const insert = vi.fn();
    const { result, rerender, unmount } = renderHook(({ enabled }) => useKeyboardDictation(enabled, insert), { initialProps: { enabled: true } });
    act(() => result.current.toggle());
    const first = Recognition.instances[0], late = first.onresult!;
    rerender({ enabled: false });
    expect(first.abort).toHaveBeenCalledOnce();
    act(() => late(transcript("Old speech", true)));
    expect(insert).not.toHaveBeenCalled();
    rerender({ enabled: true });
    act(() => result.current.toggle());
    act(() => late(transcript("Stale speech", true)));
    expect(insert).not.toHaveBeenCalled();
    unmount();
    expect(Recognition.instances[1].abort).toHaveBeenCalledOnce();
  });

  it("reports unsupported browsers rather than simulating a recording", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    const { result } = renderHook(() => useKeyboardDictation(true, vi.fn()));
    act(() => result.current.toggle());
    expect(result.current.listening).toBe(false);
    expect(result.current.status).toContain("isn’t supported");
  });

  it("keeps callback-free keyboard specimens passive", () => {
    const { result } = renderHook(() => useKeyboardDictation(true));
    act(() => result.current.toggle());
    expect(Recognition.instances).toHaveLength(0);
    expect(result.current).toMatchObject({ listening: false, status: "" });
  });

  it("inserts only new finals while retaining continuous dictation", () => {
    const insert = vi.fn();
    const { result } = renderHook(() => useKeyboardDictation(true, insert));
    act(() => result.current.toggle());
    const recognition = Recognition.instances[0];
    act(() => recognition.onstart?.());
    act(() => recognition.onresult?.(transcript("Weather", true)));
    act(() => recognition.onresult?.(transcript("Weather", true)));
    act(() => recognition.onresult?.({ resultIndex: 1, results: [
      { isFinal: true, 0: { transcript: "Weather" } },
      { isFinal: true, 0: { transcript: "tomorrow" } },
    ] }));
    expect(insert.mock.calls).toEqual([["Weather"], ["tomorrow"]]);
    expect(recognition.continuous).toBe(true);
    expect(result.current.listening).toBe(true);
    expect(recognition.stop).not.toHaveBeenCalled();
  });

  it("preserves permission error copy and clears it when keyboard input resumes", () => {
    const { result } = renderHook(() => useKeyboardDictation(true, vi.fn()));
    act(() => result.current.toggle());
    act(() => Recognition.instances[0].onerror?.({ error: "not-allowed" }));
    expect(result.current.status).toBe("Microphone access was denied.");
    act(() => result.current.clearStatus());
    expect(result.current).toMatchObject({ listening: false, status: "" });
  });
});
