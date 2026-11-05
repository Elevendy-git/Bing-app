import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceAudioMeter, voiceAudioSignal } from "./useVoiceAudioMeter";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((accept, decline) => { resolve = accept; reject = decline; });
  return { promise, resolve, reject };
};
const capture = () => {
  const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
  const stream = { getTracks: vi.fn(() => tracks) } as unknown as MediaStream;
  return { stream, tracks };
};
class Analyser {
  fftSize = 2048;
  get frequencyBinCount() { return this.fftSize / 2; }
  minDecibels = -100;
  maxDecibels = -30;
  smoothingTimeConstant = 0.8;
  disconnect = vi.fn();
  frequency = 255;
  amplitude = 0.1;
  getByteFrequencyData = vi.fn((array: Uint8Array) => array.fill(this.frequency));
  getFloatTimeDomainData = vi.fn((array: Float32Array) => array.fill(this.amplitude));
}
class Context extends EventTarget {
  static instances: Context[] = [];
  static initialState: AudioContextState = "running";
  static resumedState: AudioContextState = "running";
  static resumePending: Promise<void> | null = null;
  static failConstruction = false;
  sampleRate = 48000;
  state: AudioContextState | "interrupted" = Context.initialState;
  destination = {};
  analyser = new Analyser();
  source = { connect: vi.fn(), disconnect: vi.fn() };
  createAnalyser = vi.fn(() => this.analyser);
  createMediaStreamSource = vi.fn((_stream: MediaStream) => this.source);
  resume = vi.fn(async () => {
    if (Context.resumePending) await Context.resumePending;
    if (this.state !== "closed") this.state = Context.resumedState;
  });
  close = vi.fn(async () => { this.state = "closed"; });
  constructor() {
    super();
    if (Context.failConstruction) throw new Error("Audio unavailable");
    Context.instances.push(this);
  }
}

let stream: ReturnType<typeof capture>;
let getUserMedia: ReturnType<typeof vi.fn>;
let mediaDescriptor: PropertyDescriptor | undefined;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
const flush = () => act(async () => { await Promise.resolve(); });
const sample = () => act(() => {
  const [id, callback] = frames.entries().next().value!;
  frames.delete(id);
  callback(16);
});

beforeEach(() => {
  stream = capture();
  getUserMedia = vi.fn().mockResolvedValue(stream.stream);
  mediaDescriptor = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  Context.instances = [];
  Context.initialState = "running";
  Context.resumedState = "running";
  Context.resumePending = null;
  Context.failConstruction = false;
  vi.stubGlobal("AudioContext", Context);
  vi.stubGlobal("webkitAudioContext", undefined);
  frames = new Map();
  nextFrame = 0;
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)));
});
afterEach(() => {
  cleanup();
  if (mediaDescriptor) Object.defineProperty(navigator, "mediaDevices", mediaDescriptor);
  else Reflect.deleteProperty(navigator, "mediaDevices");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Voice microphone audio meter", () => {
  it("keeps twelve silent motion values and requests no device while disabled", async () => {
    const { result } = renderHook(() => useVoiceAudioMeter({ enabled: false }));
    await flush();
    expect(result.current.levels.get()).toEqual(Array(12).fill(0));
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(Context.instances).toHaveLength(0);
    expect(frames.size).toBe(0);
  });

  it("samples real frequency bands into a MotionValue without React renders or speaker routing", async () => {
    let renders = 0;
    const { result } = renderHook(() => { renders++; return useVoiceAudioMeter({ enabled: true }); });
    const motionValue = result.current.levels;
    await flush();
    const audio = Context.instances[0];
    expect(getUserMedia).toHaveBeenCalledExactlyOnceWith({ audio: true });
    expect(audio.createMediaStreamSource).toHaveBeenCalledExactlyOnceWith(stream.stream);
    expect(audio.source.connect).toHaveBeenCalledExactlyOnceWith(audio.analyser);
    expect(audio.source.connect).not.toHaveBeenCalledWith(audio.destination);
    const before = renders;
    sample();
    const levels = motionValue.get();
    expect(levels).toHaveLength(12);
    expect(levels.every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
    expect(levels.some(value => value > 0)).toBe(true);
    expect(result.current.levels).toBe(motionValue);
    expect(renders).toBe(before);
    expect(audio.analyser.getByteFrequencyData).toHaveBeenCalledOnce();
    expect(audio.analyser.getFloatTimeDomainData).toHaveBeenCalledOnce();
    audio.analyser.getByteFrequencyData.mockImplementation(array => { array.fill(0); array[2] = 255; return array; });
    sample();
    expect(motionValue.get().some(value => value > 0)).toBe(true);
    expect(motionValue.get().some(value => value === 0)).toBe(true);
    expect(renders).toBe(before);
  });

  it("gates silence and background noise, and clamps loud input to normalized finite levels", async () => {
    const { result } = renderHook(() => useVoiceAudioMeter({ enabled: true }));
    await flush();
    const meter = Context.instances[0].analyser;
    meter.amplitude = 0;
    sample();
    expect(result.current.levels.get()).toEqual(Array(12).fill(0));
    meter.amplitude = voiceAudioSignal.inputNoiseFloor / 2;
    sample();
    expect(result.current.levels.get()).toEqual(Array(12).fill(0));
    meter.amplitude = 1;
    sample();
    expect(result.current.levels.get()).toEqual(Array(12).fill(1));
    meter.frequency = 0;
    sample();
    expect(result.current.levels.get()).toEqual(Array(12).fill(0));
  });

  it.each(["disable", "unmount", "hidden", "pagehide"])("releases tracks, nodes, context and animation frames on %s", async event => {
    const { result, rerender, unmount } = renderHook(({ enabled }) => useVoiceAudioMeter({ enabled }), { initialProps: { enabled: true } });
    const levels = result.current.levels;
    await flush();
    sample();
    const audio = Context.instances[0], lateFrame = [...frames.values()][0];
    const reads = audio.analyser.getByteFrequencyData.mock.calls.length;
    if (event === "disable") rerender({ enabled: false });
    if (event === "unmount") unmount();
    if (event === "hidden") {
      vi.spyOn(document, "hidden", "get").mockReturnValue(true);
      act(() => document.dispatchEvent(new Event("visibilitychange")));
    }
    if (event === "pagehide") act(() => window.dispatchEvent(new Event("pagehide")));
    expect(stream.tracks.every(track => track.stop.mock.calls.length === 1)).toBe(true);
    expect(audio.source.disconnect).toHaveBeenCalledOnce();
    expect(audio.analyser.disconnect).toHaveBeenCalledOnce();
    expect(audio.close).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
    expect(levels.get()).toEqual(Array(12).fill(0));
    act(() => lateFrame(32));
    expect(audio.analyser.getByteFrequencyData).toHaveBeenCalledTimes(reads);
    expect(frames.size).toBe(0);
    if (event !== "unmount") unmount();
    expect(audio.close).toHaveBeenCalledOnce();
  });

  it("stops a late permission grant immediately without creating a context or interfering with a newer capture", async () => {
    const pending = deferred<MediaStream>(), later = capture();
    getUserMedia.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(later.stream);
    const { result, rerender } = renderHook(({ enabled }) => useVoiceAudioMeter({ enabled }), { initialProps: { enabled: true } });
    rerender({ enabled: false });
    rerender({ enabled: true });
    await flush();
    expect(Context.instances).toHaveLength(1);
    await act(async () => pending.resolve(stream.stream));
    expect(stream.tracks.every(track => track.stop.mock.calls.length === 1)).toBe(true);
    expect(later.tracks.every(track => track.stop.mock.calls.length === 0)).toBe(true);
    expect(Context.instances).toHaveLength(1);
    sample();
    expect(result.current.levels.get().some(value => value > 0)).toBe(true);
  });

  it("does not restart on visibility restoration, but permits an explicit enabled cycle", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const { rerender } = renderHook(({ enabled }) => useVoiceAudioMeter({ enabled }), { initialProps: { enabled: true } });
    await flush();
    hidden.mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    rerender({ enabled: true });
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
    const later = capture();
    getUserMedia.mockResolvedValueOnce(later.stream);
    rerender({ enabled: false });
    rerender({ enabled: true });
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(frames.size).toBe(1);
  });

  it("discards a pending permission request on hide and never restarts it just by becoming visible", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const pending = deferred<MediaStream>();
    getUserMedia.mockReturnValue(pending.promise);
    renderHook(() => useVoiceAudioMeter({ enabled: true }));
    hidden.mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await act(async () => pending.resolve(stream.stream));
    expect(stream.tracks.every(track => track.stop.mock.calls.length === 1)).toBe(true);
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(Context.instances).toHaveLength(0);
    expect(frames.size).toBe(0);
  });

  it.each(["audio", "media"])("keeps unsupported %s analysis silent without requesting a device", async missing => {
    if (missing === "audio") vi.stubGlobal("AudioContext", undefined);
    else Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
    const { result } = renderHook(() => useVoiceAudioMeter({ enabled: true }));
    await flush();
    expect(result.current.levels.get()).toEqual(Array(12).fill(0));
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });

  it("keeps a denied capture silent without retrying on rerender", async () => {
    getUserMedia.mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
    const { result, rerender } = renderHook(() => useVoiceAudioMeter({ enabled: true }));
    await flush();
    rerender();
    await flush();
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(Context.instances).toHaveLength(0);
    expect(frames.size).toBe(0);
    expect(result.current.levels.get()).toEqual(Array(12).fill(0));
  });

  it("releases a granted stream if audio-context initialization fails", async () => {
    Context.failConstruction = true;
    const { result } = renderHook(() => useVoiceAudioMeter({ enabled: true }));
    await flush();
    expect(stream.tracks.every(track => track.stop.mock.calls.length === 1)).toBe(true);
    expect(result.current.levels.get()).toEqual(Array(12).fill(0));
    expect(frames.size).toBe(0);
  });

  it("resumes a suspended context, while remaining silent and releasing capture if it stays suspended", async () => {
    Context.initialState = "suspended";
    Context.resumedState = "suspended";
    const { result } = renderHook(() => useVoiceAudioMeter({ enabled: true }));
    await flush();
    const audio = Context.instances[0];
    expect(audio.resume).toHaveBeenCalledOnce();
    expect(audio.close).toHaveBeenCalledOnce();
    expect(stream.tracks.every(track => track.stop.mock.calls.length === 1)).toBe(true);
    expect(frames.size).toBe(0);
    expect(result.current.levels.get()).toEqual(Array(12).fill(0));
  });

  it("cleans up a pending resume and ignores its later resolution", async () => {
    Context.initialState = "suspended";
    const pending = deferred<void>();
    Context.resumePending = pending.promise;
    const { result, rerender } = renderHook(({ enabled }) => useVoiceAudioMeter({ enabled }), { initialProps: { enabled: true } });
    await flush();
    const audio = Context.instances[0];
    expect(audio.resume).toHaveBeenCalledOnce();
    rerender({ enabled: false });
    await act(async () => pending.resolve());
    expect(audio.close).toHaveBeenCalledOnce();
    expect(stream.tracks.every(track => track.stop.mock.calls.length === 1)).toBe(true);
    expect(frames.size).toBe(0);
    expect(result.current.levels.get()).toEqual(Array(12).fill(0));
  });

  it("uses the WebKit AudioContext fallback when available", async () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", Context);
    const { result } = renderHook(() => useVoiceAudioMeter({ enabled: true }));
    await flush();
    sample();
    expect(result.current.levels.get().some(value => value > 0)).toBe(true);
  });

  it("does not treat the initial suspended resume as a later OS interruption", async () => {
    Context.initialState = "suspended";
    const pending = deferred<void>();
    Context.resumePending = pending.promise;
    const { result } = renderHook(() => useVoiceAudioMeter({ enabled: true }));
    await flush();
    const audio = Context.instances[0];
    act(() => audio.dispatchEvent(new Event("statechange")));
    expect(audio.close).not.toHaveBeenCalled();
    expect(stream.tracks.every(track => track.stop.mock.calls.length === 0)).toBe(true);
    await act(async () => pending.resolve());
    expect(frames.size).toBe(1);
    sample();
    expect(result.current.levels.get().some(value => value > 0)).toBe(true);
    act(() => { audio.state = "suspended"; audio.dispatchEvent(new Event("statechange")); });
    expect(audio.close).toHaveBeenCalledOnce();
    expect(result.current.levels.get()).toEqual(Array(12).fill(0));
  });

  it.each(["suspended", "interrupted", "closed"] as const)("releases an active meter and clears its signal after an OS %s statechange", async state => {
    const { result, rerender } = renderHook(({ enabled }) => useVoiceAudioMeter({ enabled }), { initialProps: { enabled: true } });
    await flush();
    const audio = Context.instances[0];
    const removeListener = vi.spyOn(audio, "removeEventListener");
    sample();
    expect(result.current.levels.get().some(value => value > 0)).toBe(true);
    const reads = audio.analyser.getByteFrequencyData.mock.calls.length;
    const lateFrame = [...frames.values()][0];
    act(() => { audio.state = state; audio.dispatchEvent(new Event("statechange")); });
    expect(result.current.levels.get()).toEqual(Array(12).fill(0));
    expect(stream.tracks.every(track => track.stop.mock.calls.length === 1)).toBe(true);
    expect(audio.source.disconnect).toHaveBeenCalledOnce();
    expect(audio.analyser.disconnect).toHaveBeenCalledOnce();
    expect(audio.close).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledExactlyOnceWith("statechange", expect.any(Function));
    expect(frames.size).toBe(0);
    act(() => { audio.state = "running"; audio.dispatchEvent(new Event("statechange")); lateFrame(32); });
    rerender({ enabled: true });
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(audio.analyser.getByteFrequencyData).toHaveBeenCalledTimes(reads);
    expect(frames.size).toBe(0);
    expect(result.current.levels.get()).toEqual(Array(12).fill(0));
  });
});
