import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useIsPresent, usePresenceData, useReducedMotion } from "motion/react";
import { AppSearchBox } from "../../components/AppSearchBox";
import { BingSearchBox } from "../../components/BingSearchBox";
import { IOSStatusBar } from "../../components/IOSStatusBar";
import { IOSKeyboard } from "../../components/IOSKeyboard";
import { IOSHomeIndicator } from "../../components/IOSHomeIndicator";
import { IOS_METRICS } from "../../components/IOSNative/iosMetrics";
import { usePrototypeKeyboard } from "../../components/IOSNative/KeyboardEnvironment";
import { Switcher } from "../../components/Switcher";
import { iosMotion, iosMotionCss } from "../../motion/iosMotion";
import { CrossfadeContent, useOverlayPresence } from "../../motion/MotionPresence";
import { markSearchHistorySuggestions, normalizeSearchQuery } from "../../services/searchSuggestions";
import { useSearchInput } from "./useSearchInput";
import { RECENT_SEARCHES } from "./Search.data";
import type { SearchHistoryItem } from "../activity/types";
import { SearchHistory } from "./SearchHistory";
import { ClearSearchHistoryDialog } from "./ClearSearchHistoryDialog";
import { useSearchSuggestions } from "./useSearchSuggestions";
import { keyboardSuggestions } from "./keyboardSuggestions";
import { SearchSuggestions } from "./SearchSuggestions";
import { PrivateSearchIntro } from "./PrivateSearchIntro";
import type { SearchTransitionOrigin } from "./searchTransition";
import styles from "./Search.module.css";

export type SearchState = "zero-input" | "keyboard" | "input";
export type { SearchTransitionOrigin } from "./searchTransition";
export interface SearchProps {
  initialState?: SearchState;
  /** Passive Key screen specimens for the C2 History deletion flow. */
  initialHistoryState?: "default" | "editing" | "confirm-clear";
  initialQuery?: string;
  initialPrivateMode?: boolean;
  /** Prototype shares this mode with Homepage; isolated previews can use the initial value. */
  privateMode?: boolean;
  onPrivateModeChange?: (privateMode: boolean) => void;
  timeSource?: "fixed" | "system";
  /** Key screens are exact, passive presets; Prototype owns the live flow. */
  interactive?: boolean;
  /** Pause a retained Search screen while a modal flow owns input. */
  active?: boolean;
  onBack?: () => void;
  onSubmit?: (query: string) => void;
  onVoiceSearch?: () => void;
  /** Actual Homepage or SERP composer geometry, normalized for workbench zoom. */
  transitionOrigin?: SearchTransitionOrigin;
  history?: readonly SearchHistoryItem[];
  onHistoryChange?: (items: readonly SearchHistoryItem[]) => void;
}

/** Query entry and InPrivate flow, filling the current mobile device canvas. */
export function Search({ initialState = "zero-input", initialHistoryState = "default", initialQuery, initialPrivateMode = false, privateMode: controlledPrivateMode, onPrivateModeChange, timeSource = "fixed", interactive = false, active = true, onBack, onSubmit, onVoiceSearch, transitionOrigin, history: controlledHistory, onHistoryChange }: SearchProps) {
  const [query, setQuery] = useState(initialQuery ?? (initialState === "input" ? "Weather" : ""));
  const [localPrivateMode, setLocalPrivateMode] = useState(initialPrivateMode);
  const [localHistory, setLocalHistory] = useState(RECENT_SEARCHES);
  const history = controlledHistory ?? localHistory;
  const [clearHistoryOpen, setClearHistoryOpen] = useState(initialHistoryState === "confirm-clear");
  const historyDialogTrigger = useRef<HTMLElement | null>(null);
  const privateMode = controlledPrivateMode ?? localPrivateMode;
  const [keyboard, setKeyboard] = useState({ visible: initialState !== "zero-input" && initialHistoryState !== "confirm-clear", navigation: Boolean(transitionOrigin) });
  const keyboardVisible = keyboard.visible && active;
  const { nativeKeyboard, keyboardHeight } = usePrototypeKeyboard();
  const restingBottomHeight = 48 + IOS_METRICS.bottomSafeArea;
  const keyboardBottomHeight = 48 + keyboardHeight;
  const privateIntroVisible = privateMode && !query.trim();
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const historyOverlay = useOverlayPresence(clearHistoryOpen, () => {
    if (!interactive || !active) return;
    const trigger = historyDialogTrigger.current;
    const target = trigger?.isConnected && !trigger.closest("[inert], [hidden]") ? trigger : contentRef.current;
    target?.focus({ preventScroll: true });
  });
  const contentMounted = useRef(false);
  useEffect(() => { contentMounted.current = true; }, []);
  const isPresent = useIsPresent();
  const screenActive = active && isPresent;
  // AnimatePresence supplies the submission destination even after this screen unmounts.
  const exitOrigin = usePresenceData() as SearchTransitionOrigin | null | undefined;
  const destination = exitOrigin ?? transitionOrigin;
  const artwork = isPresent ? transitionOrigin : destination;
  const sharedComposer = Boolean(transitionOrigin || destination);
  const suggestions = useSearchSuggestions(query, interactive, screenActive);
  const suggestionItems = interactive
    ? markSearchHistorySuggestions(suggestions.items, history.map(item => item.query), privateMode)
    : suggestions.items;
  const reducedMotion = useReducedMotion();
  const animate = interactive && !reducedMotion;
  const navigationMotion = animate ? iosMotion.navigation : iosMotion.instant;
  const contentEntranceMotion = animate ? iosMotion.navigationContent : iosMotion.instant;
  // Navigation owns the initial keyboard entrance; later focus/scroll changes are independent.
  const keyboardMotion = animate ? (keyboard.navigation ? iosMotion.navigation : iosMotion.keyboard) : iosMotion.instant;
  const fadeMotion = animate ? iosMotion.fade : iosMotion.instant;
  const homeComposerLayout = {
    "--gnrc-search-action-width": "48px",
    "--gnrc-search-text-inset-start": "6px",
    "--gnrc-search-text-inset-end": "6px",
  };
  const searchComposerLayout = {
    "--gnrc-search-action-width": "44px",
    "--gnrc-search-text-inset-start": "2px",
    "--gnrc-search-text-inset-end": "10px",
  };
  const composerGeometry = (origin?: SearchTransitionOrigin) => ({
    y: animate ? origin?.offsetY ?? 0 : 0,
    height: origin?.height ?? 56,
    marginRight: origin?.insetEnd ?? 0,
    ...(origin?.kind === "home" ? homeComposerLayout : searchComposerLayout),
  });
  const fadeVariants = { enter: { opacity: 0 }, active: { opacity: 1 }, exit: { opacity: 0 } };

  const initializedFocus = useRef(false);
  useEffect(() => {
    if (initializedFocus.current) return;
    initializedFocus.current = true;
    if (interactive && screenActive && initialState !== "zero-input" && initialHistoryState !== "confirm-clear") inputRef.current?.focus({ preventScroll: true });
  }, [interactive, screenActive, initialState, initialHistoryState]);
  useEffect(() => {
    if (active) return;
    inputRef.current?.blur();
    setKeyboard(current => current.visible ? { visible: false, navigation: false } : current);
  }, [active]);

  const setKeyboardVisible = (visible: boolean) => {
    // Making an outgoing screen inert can blur its input. Exit already owns the dismissal.
    if (!screenActive) return;
    setKeyboard((current) => current.visible === visible ? current : { visible, navigation: false });
  };
  const submit = (value: string) => {
    const normalized = normalizeSearchQuery(value);
    if (!interactive || !screenActive || !normalized || !onSubmit) return;
    // The navigation exit moves the keyboard and field together; no earlier blur animation.
    setQuery(normalized);
    onSubmit(normalized);
  };
  const { change: updateQuery, dismissKeyboard, type, removeCharacter, replaceQuery, dictate, inputProps, scrollHandlers } = useSearchInput({
    value: query, inputRef, enabled: interactive && screenActive && !historyOverlay.presented, keyboardVisible,
    onKeyboardVisibleChange: setKeyboardVisible, onSubmit: submit,
    onChange: value => {
      setQuery(value);
      if (contentRef.current) contentRef.current.scrollTop = 0;
    },
  });
  const updateHistory = (items: readonly SearchHistoryItem[]) => {
    if (controlledHistory === undefined) setLocalHistory(items);
    onHistoryChange?.(items);
  };
  const togglePrivateMode = (selected: boolean) => {
    if (!screenActive) return;
    if (controlledPrivateMode === undefined) setLocalPrivateMode(selected);
    onPrivateModeChange?.(selected);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  return <motion.main className={`${styles.root} ${sharedComposer ? styles.overlay : ""}`} aria-label="Search page"
    style={iosMotionCss as CSSProperties} data-live-motion={animate || undefined}
    data-private-mode={privateMode} data-product={privateMode ? "consumer" : undefined} data-theme={privateMode ? "dark" : undefined}
    aria-hidden={!screenActive || undefined} {...(!screenActive ? { inert: "" } : {})}
    initial={animate && transitionOrigin ? "enter" : false} animate="active" exit="exit"
    data-search-state={query ? "input" : keyboardVisible ? "keyboard" : "zero-input"}>
    {sharedComposer && <motion.div className={styles.background} aria-hidden="true" initial={transitionOrigin ? undefined : { opacity: 1 }} variants={fadeVariants} transition={fadeMotion} />}
    <header className={styles.header} aria-hidden={historyOverlay.presented || undefined} {...(historyOverlay.presented ? { inert: "" } : {})}>
      <motion.div variants={fadeVariants} transition={fadeMotion}>
        <IOSStatusBar timeSource={timeSource} className={styles.statusBar} tone={privateMode ? "light" : "inherit"} />
      </motion.div>
      <div className={styles.searchRegion}>
        <motion.div className={styles.composerMotion} variants={{
          enter: composerGeometry(transitionOrigin),
          active: { y: 0, height: 56, marginRight: 0, ...searchComposerLayout },
          exit: composerGeometry(destination),
        }} transition={navigationMotion}>
          {artwork && <motion.div className={styles.composerOrigin} aria-hidden="true" {...{ inert: "" }}
            data-product="consumer" data-theme={artwork.theme} data-private-mode={artwork.privateMode || undefined}
            initial={transitionOrigin ? undefined : { opacity: 0 }}
            variants={{ enter: { opacity: 1 }, active: { opacity: 0 }, exit: { opacity: 1 } }} transition={fadeMotion}>
            {artwork.kind === "serp"
              ? <AppSearchBox variant="serp" className={styles.homeComposer} state="input" value={artwork.value} />
              : <BingSearchBox className={styles.homeComposer} compact={artwork.compact} defaultValue={artwork.value} />}
          </motion.div>}
          <motion.div className={styles.composerTarget} variants={fadeVariants} transition={fadeMotion}>
            <AppSearchBox className={styles.search} value={query} state={query ? "input" : "zero-input"} inputRef={inputRef}
              onBack={interactive && screenActive ? onBack : undefined}
              onVoiceSearch={interactive && screenActive ? onVoiceSearch : undefined}
              onClear={interactive && screenActive ? () => { updateQuery(""); inputRef.current?.focus({ preventScroll: true }); } : undefined}
              inputProps={interactive ? { ...inputProps, "aria-label": "Search query" } : undefined} />
          </motion.div>
        </motion.div>
      </div>
    </header>
    <motion.div ref={contentRef} className={`${styles.content} ${privateIntroVisible ? styles.privateContent : ""}`} role="region" aria-label="Search content" tabIndex={-1}
      aria-hidden={historyOverlay.presented || undefined} {...(historyOverlay.presented ? { inert: "" } : {})}
      variants={{
        enter: { opacity: 0, y: animate ? 12 : 0 },
        active: { opacity: 1, y: 0, transition: contentEntranceMotion },
        exit: { opacity: 0, y: animate ? 8 : 0, transition: fadeMotion },
      }}
      {...scrollHandlers}>
      <AnimatePresence initial={false} mode="popLayout">
      <CrossfadeContent key={query.trim() ? "suggestions" : privateMode ? "private" : "history"} className={styles.contentMode}
        enabled={animate} enter={animate && contentMounted.current}>
      {query.trim() ? <SearchSuggestions query={query} items={suggestionItems} source={suggestions.source}
        onRetry={interactive && screenActive ? suggestions.retry : undefined}
        onSelect={interactive && screenActive && onSubmit ? submit : undefined} /> : privateMode
        ? <PrivateSearchIntro keyboardVisible={keyboardVisible} transition={keyboardMotion} />
        : <SearchHistory items={history} interactive={interactive && screenActive} onItemsChange={updateHistory}
          onEmptyFocus={() => { if (screenActive && !historyOverlay.presented) inputRef.current?.focus({ preventScroll: true }); }}
          initialEditing={initialHistoryState !== "default"}
          onSelect={interactive && screenActive && onSubmit ? submit : undefined}
          onClearRequest={(trigger) => { historyDialogTrigger.current = trigger; dismissKeyboard(); setClearHistoryOpen(true); }} />}
      </CrossfadeContent>
      </AnimatePresence>
    </motion.div>
    <motion.div className={styles.bottom} aria-hidden={historyOverlay.presented || undefined} {...(historyOverlay.presented ? { inert: "" } : {})}
      initial={animate ? { height: restingBottomHeight } : false}
      animate={{ height: keyboardVisible ? keyboardBottomHeight : restingBottomHeight }} exit={{ height: restingBottomHeight, transition: navigationMotion }} transition={keyboardMotion}>
      <motion.div className={styles.privateBar} variants={{ ...fadeVariants, active: { opacity: clearHistoryOpen ? 0 : 1 } }} transition={fadeMotion}>
        <span className={styles.privateControl}
          onPointerDown={interactive ? (event) => event.preventDefault() : undefined}
          onMouseDown={interactive ? (event) => event.preventDefault() : undefined}>
          <Switcher label={interactive ? "InPrivate" : `InPrivate ${privateMode ? "on" : "off"}`} selected={privateMode}
            onSelectedChange={interactive && screenActive ? togglePrivateMode : undefined} /><span aria-hidden="true">InPrivate</span>
        </span>
      </motion.div>
      {!nativeKeyboard && <motion.div className={styles.keyboardSurface} aria-hidden={!keyboardVisible || !screenActive || undefined}
        {...(!keyboardVisible || !screenActive ? { inert: "" } : {})}
        initial={animate ? { y: keyboardHeight } : false} animate={{ y: keyboardVisible ? 0 : keyboardHeight }}
        exit={{ y: keyboardHeight, transition: navigationMotion }} transition={keyboardMotion}>
        <IOSKeyboard showHomeIndicator={false} onType={interactive ? type : undefined} onDelete={interactive ? removeCharacter : undefined}
          value={query} active={interactive && screenActive && keyboardVisible && !historyOverlay.presented}
          suggestions={keyboardSuggestions(query, suggestions)} onSelectSuggestion={interactive ? replaceQuery : undefined}
          onDictation={interactive ? dictate : undefined}
          returnKey={onSubmit ? "search" : "return"} onReturn={interactive && onSubmit ? () => submit(query) : undefined} />
      </motion.div>}
    </motion.div>
    <AnimatePresence onExitComplete={historyOverlay.finishExit}>
      {clearHistoryOpen && <ClearSearchHistoryDialog interactive={interactive}
        onKeep={() => setClearHistoryOpen(false)} onClear={() => { updateHistory([]); setClearHistoryOpen(false); }} />}
    </AnimatePresence>
    <IOSHomeIndicator placement="overlay" className={styles.homeIndicator} />
  </motion.main>;
}
