import { useSpeechRecognition, type SpeechRecognitionError } from "../../hooks/useSpeechRecognition";

const messages: Record<SpeechRecognitionError, string> = {
  unsupported: "Dictation isn’t supported in this browser.",
  permission: "Microphone access was denied.",
  microphone: "No microphone is available.",
  "no-speech": "No speech detected. Tap the microphone to retry.",
  network: "Dictation couldn’t connect. Tap the microphone to retry.",
  start: "Dictation couldn’t start. Please try again.",
};

/** Keyboard dictation inserts new final segments without submitting a search. */
export function useKeyboardDictation(enabled: boolean, onText?: (text: string) => void) {
  const speech = useSpeechRecognition({ enabled: enabled && Boolean(onText), continuous: true, onFinalText: onText });
  const listening = speech.phase === "requesting" || speech.phase === "listening";
  const status = speech.error ? messages[speech.error] : listening ? speech.interimTranscript || "Listening…" : "";
  return {
    listening,
    status,
    toggle: () => { if (listening) speech.stop(); else speech.start(); },
    clearStatus: speech.clearError,
  };
}
