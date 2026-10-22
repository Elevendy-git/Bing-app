import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent, usePresenceData, useReducedMotion } from "motion/react";
import { AppSearchBox } from "../../components/AppSearchBox";
import { BingSearchBox } from "../../components/BingSearchBox";
import { IOSStatusBar } from "../../components/IOSStatusBar";
import { IOSKeyboard } from "../../components/IOSKeyboard";
import { IOSHomeIndicator } from "../../components/IOSHomeIndicator";
import { IOS_METRICS } from "../../components/IOSNative/iosMetrics";
import { Switcher } from "../../components/Switcher";
import { iosMotion } from "../../motion/iosMotion";
import { QUICK_FEATURES, RECENT_SEARCHES, type SearchHistoryItem } from "./Search.data";
import { DEFAULT_DISCOVERY_VISIBILITY, SearchDiscoverySections, type DiscoveryVisibility, type SearchDiscoverySectionsProps } from "./SearchDiscoverySections";
import type { DiscoverySection } from "../../services/searchDiscovery";
import type { SearchDiscovery } from "./useSearchDiscovery";
import { SearchHistory } from "./SearchHistory";
import { ClearSearchHistoryDialog } from "./ClearSearchHistoryDialog";
import { useSearchSuggestions } from "./useSearchSuggestions";
import { SearchSuggestions } from "./SearchSuggestions";
import { PrivateSearchIntro } from "./PrivateSearchIntro";
import type { SearchTransitionOrigin } from "./searchTransition";
import styles from "./Search.module.css";

export type SearchState = "zero-input" | "keyboard" | "input";
export type { SearchTransitionOrigin } from "./searchTransition";
export interface SearchProps {
  initialState?: SearchState;
  initialQuery?: string;
  initialPrivateMode?: boolean;
  /** Prototype shares this mode with Homepage; isolated previews can use the initial value. */
  privateMode?: boolean;
  onPrivateModeChange?: (privateMode: boolean) => void;
  timeSource?: "fixed" | "system";
  /** Key screens are exact, passive presets; Prototype owns the live flow. */
  interactive?: boolean;
  onBack?: () => void;
  onSubmit?: (query: string) => void;
  /** Actual Homepage or SERP composer geometry, normalized for workbench zoom. */
  transitionOrigin?: SearchTransitionOrigin;
  history?: readonly SearchHistoryItem[];
  onHistoryChange?: (items: readonly SearchHistoryItem[]) => void;
  /** Actual public discovery is supplied by Prototype; isolated design previews keep fixtures. */
  discovery?: SearchDiscovery;
  /** Prototype keeps these preferences across Search navigation until Reset. */
  discoveryVisibility?: DiscoveryVisibility;
  onDiscoveryVisibilityChange?: (visibility: DiscoveryVisibility) => void;
}

function DiscoveryContent({ children, ...discoveryProps }: { children: ReactNode } & SearchDiscoverySectionsProps) {
  return <>
    <div className={styles.quickFeatures} aria-label="Quick features">
      {QUICK_FEATURES.map(({ label, icon }) => <span className={styles.pill} key={label}>
        <span className={styles.featureIcon} style={{ "--gnrc-search-feature-icon": `url("${icon}")` } as CSSProperties} aria-hidden="true" />{label}
      </span>)}
    </div>
    {children}
    <SearchDiscoverySections {...discoveryProps} />
  </>;
}

/** Query entry and InPrivate flow, filling the current mobile device canvas. */
export function Search({ initialState = "zero-input", initialQuery, initialPrivateMode = false, privateMode: controlledPrivateMode, onPrivateModeChange, timeSource = "fixed", interactive = false, onBack, onSubmit, transitionOrigin, history: controlledHistory, onHistoryChange, discovery, discoveryVisibility: controlledDiscoveryVisibility, onDiscoveryVisibilityChange }: SearchProps) {
  const [query, setQuery] = useState(initialQuery ?? (initialState === "input" ? "Weather" : ""));
  const [localPrivateMode, setLocalPrivateMode] = useState(initialPrivateMode);
  const [localHistory, setLocalHistory] = useState(RECENT_SEARCHES);
  const history = controlledHistory ?? localHistory;
  const [localDiscoveryVisibility, setLocalDiscoveryVisibility] = useState(DEFAULT_DISCOVERY_VISIBILITY);
  const discoveryVisibility = controlledDiscoveryVisibility ?? localDiscoveryVisibility;
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);
  const historyDialogTrigger = useRef<HTMLElement | null>(null);
  const privateMode = controlledPrivateMode ?? localPrivateMode;
  const [keyboard, setKeyboard] = useState({ visible: initialState !== "zero-input", navigation: Boolean(transitionOrigin) });
  const keyboardVisible = keyboard.visible;
  const restingBottomHeight = 48 + IOS_METRICS.bottomSafeArea;
  const keyboardBottomHeight = 48 + IOS_METRICS.keyboardHeight;
  const privateIntroVisible = privateMode && !query.trim();
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();
  // AnimatePresence supplies the submission destination even after this screen unmounts.
  const exitOrigin = usePresenceData() as SearchTransitionOrigin | null | undefined;
  const destination = exitOrigin ?? transitionOrigin;
  const artwork = isPresent ? transitionOrigin : destination;
  const sharedComposer = Boolean(transitionOrigin || destination);
  const suggestions = useSearchSuggestions(query, interactive, isPresent);
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

  useEffect(() => {
    if (interactive && initialState !== "zero-input") inputRef.current?.focus({ preventScroll: true });
  }, [interactive, initialState]);

  const setKeyboardVisible = (visible: boolean) => {
    // Making an outgoing screen inert can blur its input. Exit already owns the dismissal.
    if (!isPresent) return;
    setKeyboard((current) => current.visible === visible ? current : { visible, navigation: false });
  };
  const dismissKeyboard = () => { inputRef.current?.blur(); setKeyboardVisible(false); };
  const submit = (value: string) => {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!interactive || !isPresent || !normalized || !onSubmit) return;
    // The navigation exit moves the keyboard and field together; no earlier blur animation.
    setQuery(normalized);
    onSubmit(normalized);
  };
  const updateQuery = (value: string) => {
    setQuery(value);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };
  const updateHistory = (items: readonly SearchHistoryItem[]) => {
    if (controlledHistory === undefined) setLocalHistory(items);
    onHistoryChange?.(items);
  };
  const toggleDiscoverySection = (section: DiscoverySection) => {
    if (!isPresent) return;
    const next = { ...discoveryVisibility, [section]: !discoveryVisibility[section] };
    if (controlledDiscoveryVisibility === undefined) setLocalDiscoveryVisibility(next);
    onDiscoveryVisibilityChange?.(next);
  };
  const togglePrivateMode = (selected: boolean) => {
    if (!isPresent) return;
    if (controlledPrivateMode === undefined) setLocalPrivateMode(selected);
    onPrivateModeChange?.(selected);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };
  const type = (letter: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? query.length;
    const end = input?.selectionEnd ?? start;
    const inserted = query.length ? letter.toLowerCase() : letter;
    updateQuery(query.slice(0, start) + inserted + query.slice(end));
    input?.focus({ preventScroll: true });
    requestAnimationFrame(() => input?.setSelectionRange(start + inserted.length, start + inserted.length));
  };
  const removeCharacter = () => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? query.length;
    const end = input?.selectionEnd ?? start;
    const nextStart = end > start ? start : Math.max(0, start - 1);
    updateQuery(query.slice(0, nextStart) + query.slice(end));
    input?.focus({ preventScroll: true });
    requestAnimationFrame(() => input?.setSelectionRange(nextStart, nextStart));
  };

  return <motion.main className={`${styles.root} ${sharedComposer ? styles.overlay : ""}`} aria-label="Search page"
    data-private-mode={privateMode} data-product={privateMode ? "consumer" : undefined} data-theme={privateMode ? "dark" : undefined}
    aria-hidden={!isPresent || undefined} {...(!isPresent ? { inert: "" } : {})}
    initial={animate && transitionOrigin ? "enter" : false} animate="active" exit="exit"
    data-search-state={query ? "input" : keyboardVisible ? "keyboard" : "zero-input"}>
    {sharedComposer && <motion.div className={styles.background} aria-hidden="true" initial={transitionOrigin ? undefined : { opacity: 1 }} variants={fadeVariants} transition={fadeMotion} />}
    <header className={styles.header} aria-hidden={clearHistoryOpen || undefined} {...(clearHistoryOpen ? { inert: "" } : {})}>
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
            data-product="consumer" data-theme={artwork.theme}
            initial={transitionOrigin ? undefined : { opacity: 0 }}
            variants={{ enter: { opacity: 1 }, active: { opacity: 0 }, exit: { opacity: 1 } }} transition={fadeMotion}>
            {artwork.kind === "serp"
              ? <AppSearchBox variant="serp" className={styles.homeComposer} state="input" value={artwork.value} />
              : <BingSearchBox className={styles.homeComposer} compact={artwork.compact} defaultValue={artwork.value} />}
          </motion.div>}
          <motion.div className={styles.composerTarget} variants={fadeVariants} transition={fadeMotion}>
            <AppSearchBox className={styles.search} value={query} state={query ? "input" : "zero-input"} inputRef={inputRef}
              onBack={interactive ? onBack : undefined}
              onClear={interactive ? () => { updateQuery(""); inputRef.current?.focus({ preventScroll: true }); } : undefined}
              inputProps={interactive ? {
                "aria-label": "Search query", inputMode: "none", autoComplete: "off", spellCheck: false,
                onFocus: () => setKeyboardVisible(true), onBlur: () => setKeyboardVisible(false),
                onChange: (event) => updateQuery(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismissKeyboard(); }
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); submit(query); }
                },
              } : undefined} />
          </motion.div>
        </motion.div>
      </div>
      <motion.div className={styles.searchCover} aria-hidden="true" variants={fadeVariants} transition={fadeMotion} />
    </header>
    <motion.div ref={contentRef} className={`${styles.content} ${privateIntroVisible ? styles.privateContent : ""}`} role="region" aria-label="Search content" tabIndex={-1}
      aria-hidden={clearHistoryOpen || undefined} {...(clearHistoryOpen ? { inert: "" } : {})}
      variants={{
        enter: { opacity: 0, y: animate ? 12 : 0 },
        active: { opacity: 1, y: 0, transition: contentEntranceMotion },
        exit: { opacity: 0, y: animate ? 8 : 0, transition: fadeMotion },
      }}
      onWheel={interactive && keyboardVisible ? dismissKeyboard : undefined}
      onTouchMove={interactive && keyboardVisible ? dismissKeyboard : undefined}>
      {query.trim() ? <SearchSuggestions query={query} items={suggestions.items} source={suggestions.source}
        onSelect={interactive && onSubmit ? submit : undefined} /> : privateMode
        ? <PrivateSearchIntro keyboardVisible={keyboardVisible} transition={keyboardMotion} />
        : <DiscoveryContent discovery={discovery} visibility={discoveryVisibility} onToggleSection={interactive ? toggleDiscoverySection : undefined}>
          <SearchHistory items={history} interactive={interactive} onItemsChange={updateHistory}
          onInteraction={dismissKeyboard} onClearRequest={(trigger) => { historyDialogTrigger.current = trigger; setClearHistoryOpen(true); }} /></DiscoveryContent>}
    </motion.div>
    <motion.div className={styles.bottom} aria-hidden={clearHistoryOpen || undefined} {...(clearHistoryOpen ? { inert: "" } : {})}
      initial={animate ? { height: restingBottomHeight } : false}
      animate={{ height: keyboardVisible ? keyboardBottomHeight : restingBottomHeight }} exit={{ height: restingBottomHeight, transition: navigationMotion }} transition={keyboardMotion}>
      <motion.div className={styles.privateBar} variants={fadeVariants} transition={fadeMotion}>
        <span className={styles.privateControl}
          onPointerDown={interactive ? (event) => event.preventDefault() : undefined}
          onMouseDown={interactive ? (event) => event.preventDefault() : undefined}>
          <Switcher label={interactive ? "InPrivate" : `InPrivate ${privateMode ? "on" : "off"}`} selected={privateMode}
            onSelectedChange={interactive ? togglePrivateMode : undefined} /><span aria-hidden="true">InPrivate</span>
        </span>
      </motion.div>
      <motion.div className={styles.keyboardSurface} aria-hidden={!keyboardVisible || !isPresent || undefined}
        {...(!keyboardVisible || !isPresent ? { inert: "" } : {})}
        initial={animate ? { y: IOS_METRICS.keyboardHeight } : false} animate={{ y: keyboardVisible ? 0 : IOS_METRICS.keyboardHeight }}
        exit={{ y: IOS_METRICS.keyboardHeight, transition: navigationMotion }} transition={keyboardMotion}>
        <IOSKeyboard showHomeIndicator={false} onType={interactive ? type : undefined} onDelete={interactive ? removeCharacter : undefined}
          returnKey={onSubmit ? "search" : "return"} onReturn={interactive && onSubmit ? () => submit(query) : undefined} />
      </motion.div>
      <IOSHomeIndicator placement="overlay" />
    </motion.div>
    <AnimatePresence>
      {clearHistoryOpen && <ClearSearchHistoryDialog fallbackFocus={contentRef} returnFocusTo={historyDialogTrigger.current}
        onKeep={() => setClearHistoryOpen(false)} onClear={() => { updateHistory([]); setClearHistoryOpen(false); }} />}
    </AnimatePresence>
  </motion.main>;
}
