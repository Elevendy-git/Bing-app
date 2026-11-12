import { ChevronRight20Regular } from "@fluentui/react-icons";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CollapsingContent, MotionPresence } from "../../motion/MotionPresence";
import { iosMotion } from "../../motion/iosMotion";
import { IABFooter, AppList, AppListCard, AppSearchBox, HistoryMenu, IOSHomeIndicator, IOSKeyboard, IOSStatusBar, TabsCard, type AppFooterProps } from "../../components";
import { IOS_METRICS } from "../../components/IOSNative/iosMetrics";
import { usePrototypeKeyboard } from "../../components/IOSNative/KeyboardEnvironment";
import { ScreenFooter } from "../ScreenFooter";
import { NewTabButton } from "../NewTabButton";
import { RECENT_BOOKMARKS, RECENT_CONVERSATIONS, RECENT_SITES, RECENT_TABS } from "./Recent.data";
import type { RecentEntry, RecentTab } from "../activity/types";
import { HistoryListRow } from "../History/HistoryListRow";
import { recentTabPreview } from "../Tabs/Tabs.data";
import { SearchSuggestions } from "../Search/SearchSuggestions";
import { useSearchSuggestions } from "../Search/useSearchSuggestions";
import { keyboardSuggestions } from "../Search/keyboardSuggestions";
import { markSearchHistorySuggestions, normalizeSearchQuery } from "../../services/searchSuggestions";
import { bingSearchQuery } from "../../services/bingPage";
import { useSearchInput } from "../Search/useSearchInput";
import { AnchoredMenu, useAnchoredMenu } from "../../components/MenuList/AnchoredMenu";
import { ActivityEmptyState } from "../ActivityEmptyState";
import { filterRecentEntries, filterRecentTabs } from "./recentSearch";
import styles from "./Recent.module.css";

const sectionSpacing = (first: boolean): CSSProperties => ({
  "--gnrc-list-section-padding-top": first ? "12px" : "32px",
  "--gnrc-list-section-padding-bottom": "16px",
} as CSSProperties);

export interface RecentProps {
  /** Hidden mounted screens preserve their draft without requesting suggestions. */
  active?: boolean;
  initialQuery?: string;
  /** A new footer entry clears transient search state while retaining activity. */
  searchResetKey?: number;
  /** Passive Key screen caret; the Prototype uses real input focus. */
  initialSearchFocused?: boolean;
  onSearchSubmit?: (query: string) => void;
  timeSource?: "fixed" | "system";
  footerVariant?: "app" | "browser";
  privateMode?: boolean;
  onPrivateModeChange?: (privateMode: boolean) => void;
  onBackToResults?: () => void;
  onNewTab?: () => void;
  tabs?: readonly RecentTab[];
  selectedTabId?: string | null;
  onViewTabs?: () => void;
  onSelectTab?: (id: string) => void;
  onCloseTab?: (id: string) => void;
  historyEntries?: readonly RecentEntry[];
  onViewHistory?: () => void;
  onOpenHistorySearch?: (query: string) => void;
  onOpenHistoryPage?: (url: string) => void;
  onDeleteHistory?: (id: string) => void;
  conversationEntries?: readonly RecentEntry[];
  bookmarkEntries?: readonly RecentEntry[];
  /** Full saved-site collection, including supplied folder contents. */
  searchableBookmarks?: readonly RecentEntry[];
  onViewBookmarks?: () => void;
  onNavigate?: AppFooterProps["onSelectedTabChange"];
}

/** Recent fills the mobile canvas with shared search and content insets. */
export function Recent({ active = true, initialQuery = "", searchResetKey = 0, initialSearchFocused = false, onSearchSubmit,
  timeSource = "fixed", footerVariant = "app", privateMode = false, onPrivateModeChange, onBackToResults, onNewTab, onNavigate,
  tabs = RECENT_TABS, selectedTabId = "spring", onViewTabs, onSelectTab, onCloseTab,
  historyEntries = RECENT_SITES, onViewHistory, onOpenHistorySearch, onOpenHistoryPage, onDeleteHistory, conversationEntries = RECENT_CONVERSATIONS,
  bookmarkEntries = RECENT_BOOKMARKS, searchableBookmarks = bookmarkEntries, onViewBookmarks }: RecentProps) {
  const reducedMotion = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabStripRef = useRef<HTMLDivElement>(null);
  const resultsId = useId();
  const historyOverlay = useAnchoredMenu({ root, fallback: scrollRef, active: active && !privateMode });
  const { state: historyMenu, id: historyMenuId } = historyOverlay;
  const [input, setInput] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const previousSearchResetKey = useRef(searchResetKey);
  useLayoutEffect(() => {
    if (previousSearchResetKey.current === searchResetKey) return;
    previousSearchResetKey.current = searchResetKey;
    inputRef.current?.blur();
    changeQuery("");
    setFocused(false);
  }, [searchResetKey]);
  const query = normalizeSearchQuery(input);
  const searching = Boolean(query);
  const interactive = Boolean(onNavigate);
  const searchInteractive = Boolean(onSearchSubmit) && !privateMode;
  const keyboardVisible = searchInteractive && active && focused;
  const { nativeKeyboard, keyboardHeight } = usePrototypeKeyboard();
  const keyboardMotion = searchInteractive && !reducedMotion ? iosMotion.keyboard : iosMotion.instant;
  const footerHeight = 52 + IOS_METRICS.bottomSafeArea;
  const animate = interactive && !searching && !reducedMotion;
  const suggestions = useSearchSuggestions(query, searchInteractive, active);
  // Live sources reflect real query visits; the supplied passive frames retain
  // their prediction-only icons without optional source logos.
  const suggestionItems = searchInteractive
    ? markSearchHistorySuggestions(suggestions.items, historyEntries.flatMap(entry => {
      const query = bingSearchQuery(entry.subtitle ?? "");
      return query ? [query] : [];
    }), privateMode)
    : suggestions.items.map(item => ({ query: item.query, source: "prediction" as const }));
  const visibleTabs = searching ? filterRecentTabs(tabs, query) : recentTabPreview(tabs);
  const isEmpty = !searching && [tabs, historyEntries, conversationEntries, bookmarkEntries].every(entries => entries.length === 0);
  const listSections = [
    { title: "History", variant: "bing-search-history", entries: searching ? filterRecentEntries(historyEntries, query) : historyEntries.slice(0, 3), onView: onViewHistory },
    { title: "Copilot history", variant: "copilot-history", entries: searching ? filterRecentEntries(conversationEntries, query) : conversationEntries, onView: undefined },
    { title: "Bookmark", variant: "bing-search-history", entries: searching ? filterRecentEntries(searchableBookmarks, query) : bookmarkEntries, onView: onViewBookmarks },
  ] as const;
  const populatedSections = listSections.filter(({ entries }) => entries.length > 0);
  const historyMenuEntryId = historyMenu?.kind === "item" ? historyMenu.entryId : undefined;
  useEffect(() => {
    if (!active) { inputRef.current?.blur(); setFocused(false); }
  }, [active]);
  useEffect(() => {
    if (historyMenu?.kind === "item" && !historyEntries.some(entry => entry.id === historyMenu.entryId)) historyOverlay.close(true);
  }, [active, historyEntries, historyMenu]);
  const submit = (value: string) => {
    const normalized = normalizeSearchQuery(value);
    if (active && normalized) onSearchSubmit?.(normalized);
  };
  const { change: changeQuery, dismissKeyboard, type, removeCharacter, replaceQuery, dictate, inputProps, scrollHandlers } = useSearchInput({
    value: input, inputRef, enabled: searchInteractive && active, keyboardVisible,
    onKeyboardVisibleChange: setFocused, onSubmit: submit,
    onChange: value => {
      setInput(value);
      // A new filter starts at its first result, rather than inheriting a long list's offset.
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      if (tabStripRef.current) tabStripRef.current.scrollLeft = 0;
    },
  });
  const openHistoryMenu = (entryId: string, button: HTMLButtonElement) => {
    historyOverlay.openItem(entryId, button, { height: 56,
      bottomInset: keyboardVisible ? keyboardHeight : footerHeight });
    dismissKeyboard();
  };
  const closeTab = (id: string) => {
    const remaining = tabs.filter(tab => tab.id !== id);
    const preview = searching ? filterRecentTabs(remaining, query) : recentTabPreview(remaining);
    const index = Math.max(0, visibleTabs.findIndex(tab => tab.id === id));
    const next = preview[Math.min(index, preview.length - 1)];
    onCloseTab?.(id);
    requestAnimationFrame(() => {
      const target = next ? root.current?.querySelector<HTMLElement>(`[data-tab-id="${next.id}"] button:last-child`)
        : root.current?.querySelector<HTMLElement>('[aria-label="New tab"]');
      target?.focus({ preventScroll: true });
    });
  };
  return (
    <motion.main ref={root} className={styles.root} aria-label="Recent page" data-keyboard-visible={keyboardVisible} data-private-mode={privateMode}
      initial={false} animate={{ paddingBottom: keyboardVisible ? keyboardHeight : footerHeight }} transition={keyboardMotion}>
      <header className={styles.header} {...(historyOverlay.presented ? { inert: "" } : {})}>
        <IOSStatusBar timeSource={timeSource} className={styles.statusBar} tone={privateMode ? "light" : "inherit"} />
        {!privateMode && <div className={styles.searchRegion}>
          <AppSearchBox variant="recent" className={styles.search} value={input} inputRef={inputRef}
            state={input ? "input" : (searchInteractive ? focused : initialSearchFocused) ? "focus" : "zero-input"}
            onClear={searchInteractive ? () => { changeQuery(""); inputRef.current?.focus({ preventScroll: true }); } : undefined}
            inputProps={searchInteractive ? { ...inputProps,
              "aria-label": "Search tabs, recents and bookmarks", "aria-controls": resultsId,
            } : undefined} />
        </div>}
      </header>
      {privateMode ? <section className={styles.privateState} aria-label="InPrivate activity" data-product="consumer" data-theme="dark">
        <img src={new URL("../Search/assets/incognito.svg", import.meta.url).href} width={64} height={64} alt="" draggable={false} />
        <p>Turn off the private mode to view recent tabs and history. <span className={styles.learnMore}>Learn more.</span></p>
        {onPrivateModeChange
          ? <button type="button" className={styles.turnOff} data-private-turn-off onClick={() => onPrivateModeChange(false)}>Turn off</button>
          : <span className={styles.turnOff}>Turn off</span>}
      </section> : <motion.div ref={scrollRef} id={resultsId} className={[styles.scrollContent, isEmpty && styles.emptyContent].filter(Boolean).join(" ")}
        role="region" aria-label="Recent content" tabIndex={0}
        {...(historyOverlay.presented ? { inert: "" } : {})}
        initial={false} animate={{ paddingBottom: isEmpty ? 0 : keyboardVisible ? 20 : 96 }} transition={keyboardMotion}
        {...scrollHandlers}>
        <AnimatePresence key={searching ? "search" : "browse"} initial={false}>
        {isEmpty && <ActivityEmptyState key="empty" kind="recent" animated={animate} />}
        {visibleTabs.length > 0 && <CollapsingContent key="tabs" enabled={animate} role="region" aria-label="Open tabs">
          <AppList variant="section-header" title="Open tabs" className={styles.sectionHeader}
            style={sectionSpacing(true)} onClick={onViewTabs} ariaLabel="View all open tabs" />
          <div ref={tabStripRef} className={styles.tabStrip} role="group" aria-label="Open tabs cards" tabIndex={0}>
            <AnimatePresence initial={false}>
            {visibleTabs.map((tab) => (
              <MotionPresence key={tab.id} className={styles.tabItem} initial={false} animate={{ width: 140, opacity: 1, marginRight: 0 }}
                exit={{ width: 0, opacity: 0, marginRight: -12 }} transition={animate ? iosMotion.listCollapse : iosMotion.instant}>
              <TabsCard data-tab-id={tab.id} title={tab.title} previewSrc={tab.previewSrc} faviconSrc={tab.faviconSrc}
                pageSnapshot={tab.pageSnapshot}
                previewStyle={tab.previewStyle} className={styles.tab} selected={selectedTabId === tab.id}
                {...(!onSelectTab && !onCloseTab ? { inert: "" } : {})}
                onSelect={onSelectTab ? () => onSelectTab(tab.id) : undefined}
                onClose={onCloseTab ? () => closeTab(tab.id) : undefined}
                selectLabel={`Select ${tab.title} tab: ${tab.id}`} closeLabel={`Close ${tab.title} tab: ${tab.id}`} /></MotionPresence>
            ))}
            {!searching && tabs.length > 3 && <MotionPresence key="view-all" className={styles.tabItem} initial={false}
              animate={{ width: 120, opacity: 1, marginRight: 0 }} exit={{ width: 0, opacity: 0, marginRight: -12 }}
              transition={animate ? iosMotion.listCollapse : iosMotion.instant}>
              {onViewTabs ? <button type="button" className={styles.viewAllTabs} onClick={onViewTabs} aria-label="View all tabs">
              <span><ChevronRight20Regular aria-hidden="true" /></span>View all
            </button> : <div className={styles.viewAllTabs}><span><ChevronRight20Regular aria-hidden="true" /></span>View all</div>}
            </MotionPresence>}
            </AnimatePresence>
          </div>
        </CollapsingContent>}
        {populatedSections.map(({ title, variant, entries, onView }, sectionIndex) => (
          <CollapsingContent key={title} enabled={animate} role="region" aria-label={title}>
            <AppList variant="section-header" title={title} className={styles.sectionHeader}
              style={sectionSpacing(visibleTabs.length === 0 && sectionIndex === 0)} onClick={onView} ariaLabel={`View all ${title.toLowerCase()}`} />
            <div className={styles.cardInset}>
              <AppListCard className={styles.listCard} ariaLabel={`${title} list`}>
                <AnimatePresence initial={false}>
                {entries.map((entry, index) => <CollapsingContent key={entry.id} enabled={animate}>{(
                  variant === "bing-search-history"
                    ? <HistoryListRow key={entry.id} entry={entry} showDivider={index < entries.length - 1}
                        onOpenSearch={title === "History" ? onOpenHistorySearch : undefined}
                        onOpenPage={title === "History" ? onOpenHistoryPage : undefined}
                        rightControlLabel={`Options for ${entry.title}`}
                        rightControlExpanded={title === "History" && onDeleteHistory ? historyMenuEntryId === entry.id : undefined}
                        rightControlMenuId={title === "History" && historyMenuEntryId === entry.id ? historyMenuId : undefined}
                        onRightControlClick={title === "History" && onDeleteHistory ? event => openHistoryMenu(entry.id, event.currentTarget) : undefined} />
                    : <AppList key={entry.id} variant={variant} title={entry.title} subtitle={entry.subtitle}
                        logoSrc={entry.logoSrc} showDivider={index < entries.length - 1} />
                )}</CollapsingContent>)}
                </AnimatePresence>
              </AppListCard>
            </div>
          </CollapsingContent>
        ))}
        {searching && suggestions.items.length > 0 && <div key="suggestions" role="region" aria-label="Search on Bing">
          <AppList variant="section-header" title="Search on Bing" showRightControl={false} className={styles.sectionHeader}
            style={sectionSpacing(visibleTabs.length === 0 && populatedSections.length === 0)} />
          <SearchSuggestions query={query} items={suggestionItems} source={suggestions.source}
            className={styles.searchSuggestions} onSelect={searchInteractive ? submit : undefined} />
        </div>}
        </AnimatePresence>
      </motion.div>}
      <div className={styles.navigationSurface} data-native-keyboard-hidden={nativeKeyboard && keyboardVisible || undefined}
        aria-hidden={keyboardVisible || undefined} {...(keyboardVisible || historyOverlay.presented ? { inert: "" } : {})}>
      {!privateMode && <NewTabButton onClick={onNewTab} />}
      {footerVariant === "browser" ? <div className={styles.browserFooter}>
        <IABFooter recentSelected backLabel="Back to search results" navigationLabel="Recent browser navigation"
          onBack={onBackToResults} onHome={onNavigate ? () => onNavigate("home") : undefined}
          onRecent={onNavigate ? () => onNavigate("collections") : undefined} />
        <div className={styles.footerSafeArea} aria-hidden="true" />
      </div>
        : <ScreenFooter selectedTab="collections" labels={{ collections: "Recent" }} onSelectedTabChange={onNavigate} showHomeIndicator={false} />}
      </div>
      {searchInteractive && !nativeKeyboard && <motion.div className={styles.keyboardSurface} aria-hidden={!keyboardVisible || undefined}
        {...(!keyboardVisible ? { inert: "" } : {})}
        initial={false} animate={{ y: keyboardVisible ? 0 : keyboardHeight }} transition={keyboardMotion}
        onPointerDown={event => event.preventDefault()}>
        <IOSKeyboard showHomeIndicator={false} returnKey="search"
          value={input} active={keyboardVisible && !historyOverlay.presented}
          suggestions={keyboardSuggestions(input, suggestions)} onSelectSuggestion={replaceQuery} onDictation={dictate}
          onType={type} onDelete={removeCharacter} onReturn={() => submit(input)} />
      </motion.div>}
      <IOSHomeIndicator placement="overlay" className={styles.homeIndicator} />
      <AnchoredMenu menu={historyOverlay} interactive layer={6}>
        {historyMenu?.kind === "item" && <HistoryMenu variant="item" id={historyMenuId} autoFocus onDismiss={() => historyOverlay.close()}
          onDelete={() => { onDeleteHistory?.(historyMenu.entryId); historyOverlay.close(true); }} />}
      </AnchoredMenu>
    </motion.main>
  );
}
