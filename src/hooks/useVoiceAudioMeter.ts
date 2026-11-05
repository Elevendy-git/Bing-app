import { useEffect } from "react";
import { useMotionValue } from "motion/react";

/** Local audio-signal tuning, not iOS animation constants. UI owns visual smoothing. */
export const voiceAudioSignal = {
  bandCount: 12,
  fftSize: 512,
  minFrequencyHz: 120,
  maxFrequencyHz: 4000,
  minDecibels: -90,
  maxDecibels: -20,
  inputNoiseFloor: 0.01,
  inputGain: 12,
} as const;

const silent: readonly number[] = Object.freeze(Array<number>(voiceAudioSignal.bandCount).fill(0));
const clamp = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
const stopTracks = (stream: MediaStream) => {
  for (const track of stream.getTracks()) {
    try { track.stop(); } catch { /* Continue releasing the remaining tracks. */ }
  }
};

/** Measures captured audio locally; never records, uploads, or routes it to speakers. */
export function useVoiceAudioMeter({ enabled }: { enabled: boolean }) {
  const levels = useMotionValue<readonly number[]>(silent);

  useEffect(() => {
    levels.set(silent);
    if (!enabled) return;
    const browser = window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Context = browser.AudioContext ?? browser.webkitAudioContext;
    const mediaDevices = navigator.mediaDevices;
    if (!Context || !mediaDevices?.getUserMedia) return;

    let cancelled = false;
    let frame = 0;
    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    let analyser: AnalyserNode | undefined;
    let stateChange: (() => void) | undefined;

    const cancel = () => {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(frame);
      levels.set(silent);
      if (context && stateChange) context.removeEventListener("statechange", stateChange);
      try { source?.disconnect(); } catch { /* A node may already be detached. */ }
      try { analyser?.disconnect(); } catch { /* A node may already be detached. */ }
      if (stream) stopTracks(stream);
      try { if (context) void context.close().catch(() => {}); } catch { /* A closed context needs no further work. */ }
    };
    const hide = () => { if (document.hidden) cancel(); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", cancel);

    if (document.hidden) cancel();
    else void (async () => {
      try {
        const acquired = await mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stopTracks(acquired); return; }
        stream = acquired;
        const audio = new Context();
        context = audio;
        const input = audio.createMediaStreamSource(acquired);
        source = input;
        const meter = audio.createAnalyser();
        analyser = meter;
        meter.fftSize = voiceAudioSignal.fftSize;
        meter.minDecibels = voiceAudioSignal.minDecibels;
        meter.maxDecibels = voiceAudioSignal.maxDecibels;
        meter.smoothingTimeConstant = 0;
        input.connect(meter);
        // The analyser is deliberately not connected to audio.destination.
        if (audio.state === "suspended") await audio.resume();
        if (cancelled) return;
        if (audio.state !== "running") { cancel(); return; }
        // Initial resume may begin suspended; only a successfully running meter
        // owns interruption monitoring. Returning to running never restarts it.
        stateChange = () => { if (audio.state !== "running") cancel(); };
        audio.addEventListener("statechange", stateChange);

        const spectrum = new Uint8Array(meter.frequencyBinCount);
        const waveform = new Float32Array(meter.fftSize);
        const binWidth = audio.sampleRate / meter.fftSize;
        const highest = Math.min(voiceAudioSignal.maxFrequencyHz, audio.sampleRate / 2);
        const lowest = Math.min(voiceAudioSignal.minFrequencyHz, highest);
        const ranges = Array.from({ length: voiceAudioSignal.bandCount }, (_, index) => {
          const ratio = highest / lowest;
          const start = Math.max(1, Math.min(spectrum.length - 1, Math.floor(lowest * ratio ** (index / voiceAudioSignal.bandCount) / binWidth)));
          const end = Math.max(start + 1, Math.min(spectrum.length, Math.ceil(lowest * ratio ** ((index + 1) / voiceAudioSignal.bandCount) / binWidth)));
          return { start, end };
        });
        const sample = () => {
          frame = 0;
          if (cancelled) return;
          if (audio.state !== "running") { cancel(); return; }
          try {
            meter.getByteFrequencyData(spectrum);
            meter.getFloatTimeDomainData(waveform);
            const rms = Math.sqrt(waveform.reduce((sum, value) => sum + value * value, 0) / waveform.length);
            const amplitude = clamp((rms - voiceAudioSignal.inputNoiseFloor) * voiceAudioSignal.inputGain);
            levels.set(ranges.map(({ start, end }) => {
              let power = 0;
              for (let index = start; index < end; index++) power += (spectrum[index] / 255) ** 2;
              return clamp(Math.sqrt(power / (end - start)) * amplitude);
            }));
            if (!cancelled) frame = requestAnimationFrame(sample);
          } catch { cancel(); }
        };
        frame = requestAnimationFrame(sample);
      } catch { cancel(); }
    })();

    return () => {
      cancel();
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", cancel);
    };
  }, [enabled, levels]);

  return { levels };
}
