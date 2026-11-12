import { useLayoutEffect, useRef, useState } from "react";
import { Checkmark24Regular, Dismiss20Regular, Search24Regular } from "@fluentui/react-icons";
import { motion, useIsPresent, useReducedMotion } from "motion/react";
import { IOSKeyboard } from "../../components/IOSKeyboard/IOSKeyboard";
import { IOS_METRICS } from "../../components/IOSNative/iosMetrics";
import { usePrototypeKeyboard } from "../../components/IOSNative/KeyboardEnvironment";
import { iosMotion } from "../../motion/iosMotion";
import { useSearchInput } from "../Search/useSearchInput";
import styles from "./VoiceLanguageSheet.module.css";

/** Locale requests are passed to the browser; availability depends on its speech service. */
const languages = [
  ["es-AR", "Argentina(Español)"], ["da-DK", "Dansk"], ["de-DE", "Deutsch"],
  ["en", "English"], ["en-GB", "English (United kingdom)"], ["es-ES", "Espanol (España)"],
  ["id-ID", "Indonesia"], ["it-IT", "Italiano"], ["hu-HU", "Magyar"],
  ["nl-NL", "Nederlands"], ["nb-NO", "Norsk Bokmål"], ["pl-PL", "Polski"],
] as const;
export interface VoiceLanguageSheetProps {
  language?: string;
  interactive?: boolean;
  onDone?: (language: string) => void;
}

/** Shared specimen and prototype language picker; never starts microphone capture itself. */
export function VoiceLanguageSheet({ language = "en-US", interactive = false, onDone }: VoiceLanguageSheetProps) {
  const [selected, setSelected] = useState(language);
  const [query, setQuery] = useState("");
  const [keyboard, setKeyboard] = useState(false);
  const { nativeKeyboard, keyboardHeight } = usePrototypeKeyboard(false);
  const root = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const present = useIsPresent();
  const reducedMotion = useReducedMotion();
  const enabled = interactive && present;
  const animate = interactive && !reducedMotion;
  const finish = () => { if (enabled) onDone?.(selected); };
  const editing = useSearchInput({ value: query, onChange: setQuery, inputRef, enabled,
    keyboardVisible: keyboard, onKeyboardVisibleChange: setKeyboard, onSubmit: () => editing.dismissKeyboard() });
  useLayoutEffect(() => { if (enabled) root.current?.focus({ preventScroll: true }); }, [enabled]);
  const matches = (label: string, locale: string) => `${label} ${locale}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const filtered = languages.filter(([locale, label]) => matches(label, locale));
  const showDefault = matches("English", "en-US");
  const row = (locale: string, label: string, isDefault = false) => <button type="button" key={locale}
    className={styles.row} role="radio" aria-label={isDefault ? `${label} (default)` : label}
    aria-checked={selected === locale} disabled={!enabled} onClick={() => setSelected(locale)}>
    <span>{label}</span>{selected === locale && <Checkmark24Regular aria-hidden="true" />}
  </button>;
  return <div className={styles.overlay} aria-hidden={!present || undefined} {...(!present ? { inert: "" } : {})}>
    <motion.div className={styles.backdrop} aria-hidden="true" initial={animate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={animate ? iosMotion.fade : iosMotion.instant} />
    <motion.section ref={root} tabIndex={interactive ? -1 : undefined} className={styles.sheet} role="dialog"
      aria-modal={interactive || undefined} aria-label="Speech language"
      initial={animate ? { y: "100%" } : false} animate={{ y: 0 }} exit={{ y: animate ? "100%" : 0 }}
      transition={animate ? iosMotion.sheet : iosMotion.instant}
      onKeyDownCapture={enabled ? event => {
        if (event.key === "Escape" && keyboard) {
          event.preventDefault(); event.stopPropagation(); editing.dismissKeyboard();
          root.current?.focus({ preventScroll: true });
        }
      } : undefined}
      onKeyDown={enabled ? event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(); }
        if (event.key === "Tab") {
          event.preventDefault();
          const targets = Array.from(root.current?.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input') ?? [])
            .filter(element => !element.disabled && !element.closest('[inert], [hidden], [aria-hidden="true"]'));
          const index = targets.indexOf(document.activeElement as HTMLButtonElement | HTMLInputElement);
          const next = index < 0 ? (event.shiftKey ? targets.length - 1 : 0)
            : (index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
          targets[next]?.focus({ preventScroll: true });
        }
      } : undefined}>
      <div className={styles.grabber} aria-hidden="true" />
      <header className={styles.header}><h1>Speech language</h1>
        <button type="button" disabled={!enabled} onClick={finish}>Done</button>
      </header>
      <div className={styles.searchInset}><div className={styles.search}>
        <Search24Regular aria-hidden="true" />
        <input ref={inputRef} type="search" aria-label="Search speech languages" placeholder="Search" value={query}
          {...editing.inputProps} readOnly={!enabled} tabIndex={interactive ? undefined : -1} />
        {query && <button type="button" aria-label="Clear language search" disabled={!enabled}
          onPointerDown={event => event.preventDefault()} onMouseDown={event => event.preventDefault()} onClick={() => editing.change("")}>
          <Dismiss20Regular aria-hidden="true" />
        </button>}
      </div></div>
      <motion.div className={styles.content} {...editing.scrollHandlers}
        animate={{ paddingBottom: IOS_METRICS.bottomSafeArea + (keyboard ? keyboardHeight : 0) }}
        transition={animate ? iosMotion.keyboard : iosMotion.instant}>
        <div role="radiogroup" aria-label="Speech languages">
          {showDefault && <div className={styles.group}><h2>Default</h2><div className={styles.card}>{row("en-US", "English", true)}</div></div>}
          {filtered.length > 0 && <div className={styles.group}><h2>Display Languages</h2><div className={styles.card}>
            {filtered.map(([locale, label]) => row(locale, label))}
          </div></div>}
          {!showDefault && !filtered.length && <p className={styles.empty} role="status">No languages found</p>}
        </div>
      </motion.div>
      {!nativeKeyboard && <motion.div className={styles.keyboard} aria-hidden={!keyboard || undefined} {...(!keyboard ? { inert: "" } : {})}
        initial={false} animate={{ y: keyboard ? 0 : "100%" }} transition={animate ? iosMotion.keyboard : iosMotion.instant}>
        <IOSKeyboard value={query} returnKey="done" showSuggestions={false} showHomeIndicator={false} active={enabled && keyboard}
          onType={enabled ? editing.type : undefined} onDelete={enabled ? editing.removeCharacter : undefined}
          onReturn={enabled ? () => { editing.dismissKeyboard(); root.current?.focus({ preventScroll: true }); } : undefined}
          onDictation={enabled ? editing.dictate : undefined} />
      </motion.div>}
    </motion.section>
  </div>;
}
