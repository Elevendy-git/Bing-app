import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown24Regular, ChevronUp24Regular } from "@fluentui/react-icons";
import { motion, useIsPresent, useReducedMotion } from "motion/react";
import { AppSearchBox } from "../../components/AppSearchBox";
import { IOSKeyboard } from "../../components/IOSKeyboard";
import { getIOSKeyboardHeight } from "../../components/IOSNative/iosMetrics";
import { iosMotion } from "../../motion/iosMotion";
import { MotionPresence } from "../../motion/MotionPresence";
import { useSearchInput } from "../Search/useSearchInput";
import styles from "./FindOnPage.module.css";

export interface FindOnPageState {
  query: string; total: number; index: number;
  onQueryChange: (query: string) => void;
  onPrevious: () => void; onNext: () => void; onDismiss: () => void;
}

/** A document search task using the same input and onscreen keyboard as Search/Recent. */
export function FindOnPage({ state, active }: { state: FindOnPageState; active: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const [keyboard, setKeyboard] = useState(true);
  const present = useIsPresent();
  const reducedMotion = useReducedMotion();
  const enabled = active && present;
  const editing = useSearchInput({ value: state.query, onChange: state.onQueryChange, inputRef, enabled,
    keyboardVisible: keyboard, onKeyboardVisibleChange: setKeyboard, onSubmit: state.onNext });
  const dismissKeyboard = () => {
    if (!enabled) return;
    editing.dismissKeyboard();
    doneRef.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => { if (enabled) inputRef.current?.focus({ preventScroll: true }); }, [enabled]);
  return <MotionPresence className={styles.root} role="region" aria-label="Find on page" initial={false}
    animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
    transition={reducedMotion ? iosMotion.instant : { height: iosMotion.keyboard, opacity: iosMotion.fade }}>
    <div className={styles.field}>
      <AppSearchBox variant="search" state={state.query ? "input" : "focus"} value={state.query} placeholder="Find on page"
        ariaLabel="Find on page search box" className={styles.search} inputRef={inputRef} showSearchActions={false}
        inputProps={{ ...editing.inputProps, "aria-label": "Find text on page", readOnly: !enabled, tabIndex: enabled ? undefined : -1, onKeyDown: event => {
          if (!enabled || event.nativeEvent.isComposing) return;
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); state.onDismiss(); }
          else editing.inputProps.onKeyDown?.(event);
        } }} onBack={enabled ? state.onDismiss : undefined}
        onClear={enabled ? () => { editing.change(""); inputRef.current?.focus({ preventScroll: true }); } : undefined} />
    </div>
    <div className={styles.controls}>
      <span role="status" aria-live="polite">{!state.query ? "Find in this page" : state.total ? `${state.index + 1} of ${state.total}` : "No matches"}</span>
      <button type="button" aria-label="Previous match" disabled={!enabled || !state.total} onMouseDown={event => event.preventDefault()} onClick={state.onPrevious}><ChevronUp24Regular /></button>
      <button type="button" aria-label="Next match" disabled={!enabled || !state.total} onMouseDown={event => event.preventDefault()} onClick={state.onNext}><ChevronDown24Regular /></button>
      <button ref={doneRef} type="button" disabled={!enabled} onClick={state.onDismiss}>Done</button>
    </div>
    <motion.div className={styles.keyboardSpace} initial={active && !reducedMotion ? { height: 0 } : false} animate={{ height: keyboard ? getIOSKeyboardHeight(false) : 0 }}
      transition={reducedMotion ? iosMotion.instant : iosMotion.keyboard}>
      <motion.div className={styles.keyboard} initial={active && !reducedMotion ? { y: "100%" } : false} animate={{ y: keyboard ? 0 : "100%" }}
        transition={reducedMotion ? iosMotion.instant : iosMotion.keyboard} aria-hidden={!keyboard || undefined} {...(!keyboard ? { inert: "" } : {})}>
        <IOSKeyboard value={state.query} returnKey="done" showSuggestions={false} showHomeIndicator={false} active={enabled && keyboard}
          onType={active ? editing.type : undefined} onDelete={active ? editing.removeCharacter : undefined}
          onReturn={active ? dismissKeyboard : undefined} onDictation={active ? editing.dictate : undefined} />
      </motion.div>
    </motion.div>
  </MotionPresence>;
}
