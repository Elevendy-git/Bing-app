import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechRecognitionPhase = "idle" | "requesting" | "listening" | "error";
export type SpeechRecognitionError = "unsupported" | "permission" | "microphone" | "no-speech" | "network" | "start";

interface RecognitionResult { isFinal: boolean; [index: number]: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
}
type RecognitionConstructor = new () => Recognition;
interface Session {
  recognition: Recognition;
  final: Map<number, string>;
  stopping: boolean;
}
interface Snapshot {
  phase: SpeechRecognitionPhase;
  error: SpeechRecognitionError | null;
  /** The current session's accumulated final text followed by live interim text. */
  transcript: string;
  /** Uncommitted text, for dictation UIs that already inserted the final segments. */
  interimTranscript: string;
}

export interface SpeechRecognitionOptions {
  enabled: boolean;
  language?: string;
  continuous?: boolean;
  /** Newly finalized segments, batched once per result event; old finals never repeat. */
  onFinalText?: (text: string) => void;
  /** One successful end with nonempty accumulated final text; never called after cancel/error. */
  onComplete?: (text: string) => void;
}

const empty: Snapshot = { phase: "idle", error: null, transcript: "", interimTranscript: "" };
// Browser speech services share one microphone capture; a new user-started owner
// releases the previous hook before creating its recognizer.
let cancelOwner: (() => void) | null = null;
const recognitionConstructor = () => {
  if (typeof window === "undefined") return undefined;
  const browser = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
};
const textFrom = (parts: Map<number, string>) => [...parts].sort(([left], [right]) => left - right).map(([, text]) => text).filter(Boolean).join(" ");
const detach = (recognition: Recognition) => {
  recognition.onstart = null;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
};
const errorFrom = (error: string): SpeechRecognitionError => error === "not-allowed" || error === "service-not-allowed" ? "permission"
  : error === "audio-capture" ? "microphone" : error === "no-speech" ? "no-speech" : "network";

/** A user-started browser speech session. Stop flushes results; cancel discards them. */
export function useSpeechRecognition({ enabled, language = "en-US", continuous = false, onFinalText, onComplete }: SpeechRecognitionOptions) {
  const active = useRef<Session | null>(null);
  const ownerCancel = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  const enabledRef = useRef(enabled); enabledRef.current = enabled;
  const callbacks = useRef({ onFinalText, onComplete }); callbacks.current = { onFinalText, onComplete };
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);

  const discard = useCallback(() => {
    const current = active.current;
    // Invalidate before abort: implementations may dispatch end/error synchronously.
    active.current = null;
    if (cancelOwner === ownerCancel.current) cancelOwner = null;
    if (!current) return;
    detach(current.recognition);
    try { current.recognition.abort(); } catch { /* The browser may already have released its session. */ }
  }, []);
  const cancel = useCallback(() => {
    discard();
    if (mounted.current) setSnapshot(empty);
  }, [discard]);
  ownerCancel.current = cancel;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; discard(); };
  }, [discard]);
  useEffect(() => { if (!enabled) cancel(); }, [enabled, cancel]);
  useEffect(() => {
    const hide = () => { if (document.hidden) cancel(); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", cancel);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", cancel);
    };
  }, [cancel]);

  const start = useCallback((languageOverride?: string) => {
    if (!enabledRef.current || !mounted.current || active.current) return;
    cancelOwner?.();
    const Constructor = recognitionConstructor();
    if (!Constructor) { setSnapshot({ ...empty, phase: "error", error: "unsupported" }); return; }
    let recognition: Recognition;
    try { recognition = new Constructor(); }
    catch { setSnapshot({ ...empty, phase: "error", error: "start" }); return; }
    const current: Session = { recognition, final: new Map(), stopping: false };
    active.current = current;
    cancelOwner = ownerCancel.current;
    const isCurrent = () => mounted.current && enabledRef.current && active.current === current;
    const fail = (error: SpeechRecognitionError) => {
      if (!isCurrent()) return;
      discard();
      setSnapshot({ ...empty, phase: "error", error, transcript: textFrom(current.final) });
    };
    recognition.lang = languageOverride ?? language;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.onstart = () => { if (isCurrent()) setSnapshot(value => ({ ...value, phase: "listening" })); };
    recognition.onresult = event => {
      if (!isCurrent()) return;
      const interim = new Map<number, string>(), newFinal: string[] = [];
      for (let index = 0; index < event.results.length; index++) {
        const result = event.results[index];
        const text = result[0]?.transcript.trim() ?? "";
        if (result.isFinal) {
          if (!current.final.has(index)) {
            current.final.set(index, text);
            if (text) newFinal.push(text);
          }
        } else if (!current.final.has(index)) interim.set(index, text);
      }
      const transcript = textFrom(new Map([...current.final, ...interim]));
      setSnapshot(value => ({ ...value, transcript, interimTranscript: textFrom(interim) }));
      if (newFinal.length) callbacks.current.onFinalText?.(newFinal.join(" "));
    };
    recognition.onerror = event => fail(errorFrom(event.error));
    recognition.onend = () => {
      if (!isCurrent()) return;
      active.current = null;
      if (cancelOwner === ownerCancel.current) cancelOwner = null;
      detach(recognition);
      const transcript = textFrom(current.final);
      if (!transcript) { setSnapshot({ ...empty, phase: "error", error: "no-speech" }); return; }
      setSnapshot({ ...empty, transcript });
      callbacks.current.onComplete?.(transcript);
    };
    setSnapshot({ ...empty, phase: "requesting" });
    // Keep start in the caller's user-activation stack; never auto-start in an effect.
    try { recognition.start(); } catch { fail("start"); }
  }, [continuous, language, discard]);

  const stop = useCallback(() => {
    const current = active.current;
    if (!current || current.stopping || !enabledRef.current || !mounted.current) return;
    current.stopping = true;
    try { current.recognition.stop(); }
    catch {
      discard();
      setSnapshot(value => ({ ...value, phase: "error", error: "start" }));
    }
  }, [discard]);
  const clearError = useCallback(() => {
    if (!active.current && mounted.current) setSnapshot(value => ({ ...value, phase: "idle", error: null }));
  }, []);

  return { ...snapshot, start, stop, cancel, clearError };
}
