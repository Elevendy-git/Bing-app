import { useLayoutEffect, useRef } from "react";
import { Dismiss24Regular, Globe24Regular } from "@fluentui/react-icons";
import { motion, useIsPresent, useReducedMotion, type MotionValue } from "motion/react";
import { IOSStatusBar } from "../../components/IOSStatusBar";
import { IOSHomeIndicator } from "../../components/IOSHomeIndicator";
import { iosMotion } from "../../motion/iosMotion";
import { VoiceWaveform } from "./VoiceWaveform";
import styles from "./VoiceSearch.module.css";

export type VoiceSearchState = "listening" | "input" | "requesting" | "unrecognized" | "offline"
  | "permission" | "unsupported" | "microphone" | "connection" | "paused";
export interface VoiceSearchProps {
  state?: VoiceSearchState;
  transcript?: string;
  interactive?: boolean;
  active?: boolean;
  audioLevels?: MotionValue<readonly number[]>;
  timeSource?: "fixed" | "system";
  hideSystemChrome?: boolean;
  onDismiss?: () => void;
  onRetry?: () => void;
  onLanguage?: () => void;
}
const errorCopy: Partial<Record<VoiceSearchState, string>> = {
  unrecognized: "Sorry, couldn’t quite catch that. Please tap to try again",
  permission: "Microphone access was denied. Allow access in your browser settings, then tap to try again.",
  unsupported: "Voice search isn’t supported in this browser.",
  microphone: "No microphone is available. Connect a microphone, then tap to try again.",
  connection: "Voice search couldn’t connect. Please tap to try again.",
  paused: "Voice search is paused. Tap to start listening again.",
};

/** C3 Voice Search. Specimens are passive; recognition belongs to the prototype host. */
export function VoiceSearch({ state = "listening", transcript = "Best laptops", interactive = false,
  active = true, audioLevels, timeSource = "fixed", hideSystemChrome = false, onDismiss, onRetry, onLanguage }: VoiceSearchProps) {
  const root = useRef<HTMLElement>(null);
  const present = useIsPresent();
  const reducedMotion = useReducedMotion();
  const error = errorCopy[state];
  const canRetry = interactive && state !== "unsupported";
  const showPrompts = state === "listening" || state === "requesting";
  useLayoutEffect(() => {
    if (interactive && present) root.current?.focus({ preventScroll: true });
  }, [interactive, present]);

  return <section ref={root} tabIndex={interactive ? -1 : undefined} className={styles.root}
    role={interactive ? "dialog" : "main"} aria-label="Voice search" aria-modal={interactive || undefined}
    data-voice-state={state} aria-hidden={!present || undefined} {...(!present ? { inert: "" } : {})}
    onKeyDown={interactive ? event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onDismiss?.(); }
      if (event.key === "Tab") {
        event.preventDefault();
        const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = index < 0 ? (event.shiftKey ? buttons.length - 1 : 0)
          : (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        buttons[next]?.focus({ preventScroll: true });
      }
    } : undefined}>
    {state !== "offline" && <div className={styles.background} aria-hidden="true">
      <img className={`${styles.base} ${styles.light}`} src={new URL("./assets/voice-background-light.png", import.meta.url).href} alt="" />
      <div className={`${styles.base} ${styles.darkBase} ${styles.dark}`} />
      <div className={`${styles.darkDecoration} ${styles.dark}`} />
    </div>}
    {!hideSystemChrome && <IOSStatusBar timeSource={timeSource} />}
    <div className={styles.toolbar}>
      <button type="button" className={styles.language} aria-label="Choose speech language" disabled={!interactive} onClick={onLanguage}>
        <Globe24Regular aria-hidden="true" />
      </button>
    </div>
    {showPrompts && <div className={styles.suggestions}>
      <h1 className={styles.listening} role="status">{state === "requesting" ? "Connecting…" : "I'm listening"}</h1>
      <div className={styles.prompts}><p>Try saying</p><div className={styles.chips}>
        <span>Best restaurants near me</span><span>Latest news in AI</span>
      </div></div>
    </div>}
    {state === "input" && <>
      <p className={styles.transcript} role="status" aria-live="polite">{transcript}</p>
    </>}
    {(showPrompts || state === "input") && <motion.div className={styles.wavePosition} initial={false}
      animate={{ y: state === "input" ? -8 : 0 }}
      transition={interactive && !reducedMotion ? iosMotion.control : iosMotion.instant}>
      <VoiceWaveform levels={interactive ? audioLevels : undefined} input={state === "input"}
        active={interactive && active && present && (state === "listening" || state === "input")} />
    </motion.div>}
    {error && <div className={styles.error}>
      {canRetry ? <button type="button" onClick={onRetry}>{error}</button> : <p role="status">{error}</p>}
    </div>}
    {state === "offline" && <div className={styles.offline}>
      <img src={new URL("./assets/offline.png", import.meta.url).href} width={128} height={128} alt="" />
      <div className={styles.offlineCopy}><h2>You appear offline</h2>
        <p>Please find a stronger network signal, join Wi-Fi, or check your mobile data settings.</p></div>
      <button type="button" className={styles.retry} disabled={!interactive} onClick={onRetry}>
        <img src={new URL("./assets/retry.svg", import.meta.url).href} alt="" />Retry
      </button>
    </div>}
    <button type="button" className={styles.close} aria-label="Close voice search" disabled={!interactive} onClick={onDismiss}>
      <Dismiss24Regular aria-hidden="true" />
    </button>
    {!hideSystemChrome && <IOSHomeIndicator placement="overlay" />}
  </section>;
}
