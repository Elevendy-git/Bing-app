import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechRecognition } from "./useSpeechRecognition";

type ResultEvent = { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] };
class Recognition {
  static instances: Recognition[] = [];
  static startError = false;
  lang = ""; continuous = false; interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: ResultEvent) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(() => { if (Recognition.startError) throw new Error("Unavailable"); });
  stop = vi.fn();
  abort = vi.fn();
  constructor() { Recognition.instances.push(this); }
}
const results = (...parts: [text: string, final: boolean][]): ResultEvent => ({
  resultIndex: 0,
  results: parts.map(([transcript, isFinal]) => ({ isFinal, 0: { transcript } })),
});

beforeEach(() => {
  Recognition.instances = [];
  Recognition.startError = false;
  vi.stubGlobal("SpeechRecognition", Recognition);
  vi.stubGlobal("webkitSpeechRecognition", undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Shared browser speech recognition", () => {
  it("starts synchronously only on request, and announces listening only after onstart", () => {
    const { result } = renderHook(() => useSpeechRecognition({ enabled: true }));
    expect(Recognition.instances).toHaveLength(0);
    expect(result.current.phase).toBe("idle");
    act(() => {
      result.current.start();
      expect(Recognition.instances[0].start).toHaveBeenCalledOnce();
    });
    expect(result.current.phase).toBe("requesting");
    const recognition = Recognition.instances[0];
    expect(recognition).toMatchObject({ lang: "en-US", continuous: false, interimResults: true });
    act(() => recognition.onstart?.());
    expect(result.current.phase).toBe("listening");
  });

  it("updates interim text, emits each new final once, and completes once with accumulated finals", () => {
    const onFinalText = vi.fn(), onComplete = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ enabled: true, onFinalText, onComplete }));
    act(() => result.current.start());
    const recognition = Recognition.instances[0], lateEnd = recognition.onend!;
    act(() => recognition.onresult?.(results(["Weather", false])));
    expect(result.current.transcript).toBe("Weather");
    expect(onFinalText).not.toHaveBeenCalled();
    act(() => recognition.onresult?.(results(["Weather", true], ["this week", false])));
    expect(result.current.transcript).toBe("Weather this week");
    expect(result.current.interimTranscript).toBe("this week");
    expect(onFinalText).toHaveBeenCalledExactlyOnceWith("Weather");
    act(() => recognition.onresult?.(results(["Weather", true], ["tomorrow", false])));
    expect(result.current.transcript).toBe("Weather tomorrow");
    act(() => recognition.onresult?.(results(["Weather", true], ["tomorrow", true])));
    act(() => recognition.onresult?.(results(["Weather", true], ["tomorrow", true])));
    expect(result.current.interimTranscript).toBe("");
    expect(onFinalText.mock.calls).toEqual([["Weather"], ["tomorrow"]]);
    expect(onComplete).not.toHaveBeenCalled();
    act(() => recognition.onend?.());
    act(() => lateEnd());
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("Weather tomorrow");
    expect(result.current).toMatchObject({ phase: "idle", error: null, transcript: "Weather tomorrow" });
    expect(recognition.onresult).toBeNull();
    expect(recognition.onend).toBeNull();
  });

  it("batches multiple new finals so dictation consumers insert them together", () => {
    const onFinalText = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ enabled: true, onFinalText }));
    act(() => result.current.start());
    act(() => Recognition.instances[0].onresult?.(results(["New", true], ["York", true], ["weather", false])));
    expect(onFinalText).toHaveBeenCalledExactlyOnceWith("New York");
    expect(result.current.transcript).toBe("New York weather");
  });

  it("keeps start and stop idempotent while allowing stop to flush a final result", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ enabled: true, onComplete }));
    act(() => { result.current.start(); result.current.start(); });
    expect(Recognition.instances).toHaveLength(1);
    const recognition = Recognition.instances[0];
    act(() => { result.current.stop(); result.current.stop(); });
    expect(recognition.stop).toHaveBeenCalledOnce();
    expect(recognition.abort).not.toHaveBeenCalled();
    act(() => recognition.onresult?.(results(["Weather", true])));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => recognition.onend?.());
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("Weather");
  });

  it("invalidates cancel before abort and ignores old callbacks after a language restart", () => {
    const onFinalText = vi.fn(), onComplete = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ enabled: true, onFinalText, onComplete }));
    act(() => result.current.start());
    const first = Recognition.instances[0];
    const late = { start: first.onstart!, result: first.onresult!, error: first.onerror!, end: first.onend! };
    first.abort.mockImplementation(() => late.end());
    act(() => { result.current.cancel(); result.current.start("fr-FR"); });
    expect(first.abort).toHaveBeenCalledOnce();
    expect(first.onstart).toBeNull();
    expect(first.onresult).toBeNull();
    expect(first.onerror).toBeNull();
    expect(first.onend).toBeNull();
    expect(Recognition.instances[1].lang).toBe("fr-FR");
    act(() => { late.start(); late.result(results(["Old result", true])); late.error({ error: "network" }); late.end(); });
    expect(onFinalText).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ phase: "requesting", error: null, transcript: "" });
  });

  it("cancels on disable and unmount, blocking late completion and later starts", () => {
    const onComplete = vi.fn();
    const { result, rerender, unmount } = renderHook(({ enabled }) => useSpeechRecognition({ enabled, onComplete }), { initialProps: { enabled: true } });
    act(() => result.current.start());
    const first = Recognition.instances[0], late = first.onend!;
    act(() => first.onresult?.(results(["Old result", true])));
    rerender({ enabled: false });
    act(() => { late(); result.current.start(); });
    expect(onComplete).not.toHaveBeenCalled();
    expect(first.abort).toHaveBeenCalledOnce();
    expect(Recognition.instances).toHaveLength(1);
    expect(result.current).toMatchObject({ phase: "idle", error: null, transcript: "" });
    rerender({ enabled: true });
    act(() => result.current.start());
    const second = Recognition.instances[1], lateSecond = second.onend!, startAfterUnmount = result.current.start;
    unmount();
    act(() => { lateSecond(); startAfterUnmount(); });
    expect(second.abort).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    expect(Recognition.instances).toHaveLength(2);
  });

  it("hands capture to a second hook before starting, isolating old callbacks and unmount cleanup", () => {
    const oldFinal = vi.fn(), oldComplete = vi.fn(), newComplete = vi.fn();
    const previous = renderHook(() => useSpeechRecognition({ enabled: true, continuous: true, onFinalText: oldFinal, onComplete: oldComplete }));
    const next = renderHook(() => useSpeechRecognition({ enabled: true, onComplete: newComplete }));
    act(() => previous.result.current.start());
    const first = Recognition.instances[0];
    const late = { result: first.onresult!, end: first.onend!, error: first.onerror!, start: first.onstart! };
    first.abort.mockImplementation(() => late.end());
    act(() => next.result.current.start());
    const second = Recognition.instances[1];
    expect(first.abort).toHaveBeenCalledOnce();
    expect(first.abort.mock.invocationCallOrder[0]).toBeLessThan(second.start.mock.invocationCallOrder[0]);
    expect(previous.result.current).toMatchObject({ phase: "idle", error: null, transcript: "" });
    expect(next.result.current.phase).toBe("requesting");
    act(() => { late.start(); late.result(results(["Old result", true])); late.error({ error: "network" }); late.end(); });
    previous.unmount();
    expect(second.abort).not.toHaveBeenCalled();
    expect(oldFinal).not.toHaveBeenCalled();
    expect(oldComplete).not.toHaveBeenCalled();
    act(() => second.onresult?.(results(["New result", true])));
    act(() => second.onend?.());
    expect(newComplete).toHaveBeenCalledExactlyOnceWith("New result");
  });

  it("releases capture after normal completion without resetting the completed hook on the next start", () => {
    const previous = renderHook(() => useSpeechRecognition({ enabled: true }));
    const next = renderHook(() => useSpeechRecognition({ enabled: true }));
    act(() => previous.result.current.start());
    const first = Recognition.instances[0];
    act(() => first.onresult?.(results(["Completed", true])));
    act(() => first.onend?.());
    act(() => next.result.current.start());
    expect(first.abort).not.toHaveBeenCalled();
    expect(previous.result.current).toMatchObject({ phase: "idle", transcript: "Completed" });
  });

  it.each(["visibilitychange", "pagehide"])("discards a session on %s without submitting", event => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ enabled: true, onComplete }));
    act(() => result.current.start());
    const recognition = Recognition.instances[0], late = recognition.onend!;
    act(() => recognition.onresult?.(results(["Pending result", true])));
    if (event === "visibilitychange") vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => { (event === "visibilitychange" ? document : window).dispatchEvent(new Event(event)); late(); });
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ phase: "idle", error: null, transcript: "" });
  });

  it.each([
    ["not-allowed", "permission"], ["service-not-allowed", "permission"], ["audio-capture", "microphone"],
    ["no-speech", "no-speech"], ["network", "network"],
  ])("exposes %s as %s, ignores its late end, and permits retry", (browserError, error) => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ enabled: true, onComplete }));
    act(() => result.current.start());
    const first = Recognition.instances[0], lateEnd = first.onend!;
    act(() => first.onresult?.(results(["Unsubmitted", true])));
    act(() => { first.onerror?.({ error: browserError }); lateEnd(); });
    expect(result.current).toMatchObject({ phase: "error", error });
    expect(onComplete).not.toHaveBeenCalled();
    expect(first.abort).toHaveBeenCalledOnce();
    act(() => result.current.start());
    expect(Recognition.instances).toHaveLength(2);
    expect(result.current).toMatchObject({ phase: "requesting", error: null, transcript: "" });
  });

  it("treats an end with only interim text as no speech, without inventing a final result", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ enabled: true, onComplete }));
    act(() => result.current.start());
    const recognition = Recognition.instances[0];
    act(() => recognition.onresult?.(results(["Unconfirmed", false])));
    act(() => recognition.onend?.());
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ phase: "error", error: "no-speech", transcript: "" });
    act(() => result.current.clearError());
    expect(result.current).toMatchObject({ phase: "idle", error: null });
  });

  it("reports unsupported browsers and synchronous start failures without recording", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    const onComplete = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ enabled: true, onComplete }));
    act(() => result.current.start());
    expect(result.current).toMatchObject({ phase: "error", error: "unsupported" });
    expect(Recognition.instances).toHaveLength(0);
    vi.stubGlobal("SpeechRecognition", Recognition);
    Recognition.startError = true;
    act(() => result.current.start());
    expect(result.current).toMatchObject({ phase: "error", error: "start" });
    expect(Recognition.instances[0].abort).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("supports the WebKit constructor and uses the latest callbacks in an active session", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", Recognition);
    const oldFinal = vi.fn(), oldComplete = vi.fn(), newFinal = vi.fn(), newComplete = vi.fn();
    const { result, rerender } = renderHook(({ onFinalText, onComplete }) => useSpeechRecognition({ enabled: true, language: "de-DE", onFinalText, onComplete }),
      { initialProps: { onFinalText: oldFinal, onComplete: oldComplete } });
    act(() => result.current.start());
    expect(Recognition.instances[0].lang).toBe("de-DE");
    rerender({ onFinalText: newFinal, onComplete: newComplete });
    act(() => Recognition.instances[0].onresult?.(results(["Wetter", true])));
    act(() => Recognition.instances[0].onend?.());
    expect(oldFinal).not.toHaveBeenCalled();
    expect(oldComplete).not.toHaveBeenCalled();
    expect(newFinal).toHaveBeenCalledExactlyOnceWith("Wetter");
    expect(newComplete).toHaveBeenCalledExactlyOnceWith("Wetter");
  });
});
