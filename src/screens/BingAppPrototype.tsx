import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { SelectableFooterDestination } from "../components/AppFooter";
import { IOSHomeIndicator } from "../components/IOSHomeIndicator";
import { IOSStatusBar } from "../components/IOSStatusBar";
import { Homepage, type HomepageProps } from "./Homepage";
import { Recent } from "./Recent";
import { Tabs } from "./Tabs";
import { History } from "./History";
import { Bookmark } from "./Bookmark";
import { Settings } from "./Settings";
import { VoiceSearch, type VoiceSearchState } from "./VoiceSearch";
import { VoiceLanguageSheet } from "./VoiceSearch/VoiceLanguageSheet";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useVoiceAudioMeter } from "../hooks/useVoiceAudioMeter";
import { usePreviewActivity } from "../components/PreviewWorkbench/PreviewActivity";
import { Profile, PROFILE_ACCOUNTS, profileAvatar, type ProfileAccount, type ProfileAuthentication } from "./Profile";
import type { RewardsSnapshot } from "../auth/rewards";
import { bookmarkSearchEntries, recentBookmarkPreview } from "./activity/bookmarks";
import { webUrl } from "../services/webNavigation";
import { Search, type SearchTransitionOrigin } from "./Search";
import { LiveSERP } from "./SERP/LiveSERP";
import { SERP } from "./SERP/SERP";
import { measureSearchOrigin } from "./Search/searchTransition";
import { iosMotion } from "../motion/iosMotion";
import { ScreenLayer, useOverlayPresence } from "../motion/MotionPresence";
import { usePrototypeActivity } from "./activity/usePrototypeActivity";
import styles from "./BingAppPrototype.module.css";

export interface BingAppPrototypeProps {
  initialPage?: "home" | "recent" | "profile";
  account?: ProfileAccount | null;
  /** Enable session-only demo account actions, leaving design fixtures unchanged. */
  demoSignIn?: boolean;
  authentication?: ProfileAuthentication;
  rewardsSnapshot?: RewardsSnapshot | null;
  initialRecentState?: "default" | "empty";
  initialHomeState?: HomepageProps["initialState"];
  initialPrivateMode?: boolean;
  timeSource?: "fixed" | "system";
  feedSource?: HomepageProps["feedSource"];
}

function openMicrosoftRewards() {
  // The official site owns its authenticated session, outside the IAB preview proxy.
  window.open("https://rewards.bing.com/", "_blank", "noopener,noreferrer");
}

/** Keep underlying screens mounted while navigating their Query entry flow. */
export function BingAppPrototype({ initialPage = "home", account = PROFILE_ACCOUNTS.image, demoSignIn = false, authentication, rewardsSnapshot, initialRecentState = "default", initialHomeState = "top", initialPrivateMode = false, timeSource = "fixed", feedSource = "preview" }: BingAppPrototypeProps) {
  const previewActive = usePreviewActivity();
  const [demoAccount, setDemoAccount] = useState(account);
  const currentAccount = !authentication && demoSignIn ? demoAccount : account;
  const profileAuthentication = authentication || (demoSignIn ? {
    provider: "demo" as const,
    onSignIn: () => setDemoAccount(PROFILE_ACCOUNTS.image),
    onSignOut: () => setDemoAccount(null),
  } : undefined);
  const [page, setPage] = useState<"home" | "recent" | "tabs" | "history" | "bookmark" | "settings" | "search" | "serp" | "profile">(initialPage);
  const activity = usePrototypeActivity(initialRecentState);
  const { resultSessions, activeResultId, activeResult, searchHistory, browsingHistory, bookmarks, conversations,
    tabs, selectedTabId, deleteHistoryEntry, updateSearchHistory, saveResultPage, closeTab, closeAllTabs } = activity;
  const resultQuery = activeResult?.query ?? "";
  const [searchDraft, setSearchDraft] = useState("");
  const [searchReturnPage, setSearchReturnPage] = useState<"home" | "recent" | "tabs" | "history" | "serp">("home");
  const [recentOrigin, setRecentOrigin] = useState<"home" | "serp">("home");
  const [recentSearchResetKey, setRecentSearchResetKey] = useState(0);
  const [serpExitToRight, setSerpExitToRight] = useState(false);
  const [detailOrigin, setDetailOrigin] = useState<"recent" | "profile">("recent");
  const reducedMotion = useReducedMotion();
  const [privateMode, setPrivateMode] = useState(initialPrivateMode);
  const [detailChromeRetained, setDetailChromeRetained] = useState(initialPage === "profile");
  const [searchOrigin, setSearchOrigin] = useState<SearchTransitionOrigin | null>(null);
  const [searchExitOrigin, setSearchExitOrigin] = useState<SearchTransitionOrigin | null>(null);
  const serpRef = useRef<HTMLDivElement>(null);
  const searchFocusFrame = useRef(0);
  const tabFocusRequested = useRef(false);
  useLayoutEffect(() => () => cancelAnimationFrame(searchFocusFrame.current), [page]);
  useLayoutEffect(() => {
    if (!tabFocusRequested.current || page !== "serp") return;
    tabFocusRequested.current = false;
    searchFocusFrame.current = requestAnimationFrame(() => {
      serpRef.current?.querySelector<HTMLInputElement>('[aria-label="Edit search query"]')?.focus({ preventScroll: true });
    });
  }, [page, activeResultId]);
  const homeRef = useRef<HTMLDivElement>(null);
  const recentRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceOffline, setVoiceOffline] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState("en-US");
  const [voiceLanguageOpen, setVoiceLanguageOpen] = useState(false);
  const voiceIntent = useRef(false);
  const voiceSubmitted = useRef(false);
  const voiceOrigin = useRef<"home" | "serp">("home");
  const voiceTrigger = useRef<HTMLElement | null>(null);
  const voiceFrame = useRef<{ state: VoiceSearchState; transcript: string }>({ state: "listening", transcript: "" });
  const searchRef = useRef<HTMLDivElement>(null);
  const speech = useSpeechRecognition({ enabled: previewActive, language: voiceLanguage, onComplete: text => {
    if (!voiceIntent.current || !previewActive) return;
    voiceIntent.current = false;
    voiceSubmitted.current = true;
    voiceFrame.current = { state: "input", transcript: text };
    speech.cancel();
    setVoiceOpen(false);
    submitSearch(text, voiceOrigin.current === "serp" ? "voice-serp" : "voice");
  } });
  const voicePresence = useOverlayPresence(voiceOpen, () => {
    if (!previewActive) return;
    if (voiceSubmitted.current) serpRef.current?.querySelector<HTMLInputElement>('[aria-label="Edit search query"]')?.focus({ preventScroll: true });
    else {
      const fallback = (page === "search" ? searchRef : page === "serp" ? serpRef : homeRef).current
        ?.querySelector<HTMLElement>(page === "search" ? '[aria-label="Search query"]' : '[aria-label="Start voice search"]');
      (voiceTrigger.current?.isConnected ? voiceTrigger.current : fallback)?.focus({ preventScroll: true });
    }
  });
  const languagePresence = useOverlayPresence(voiceLanguageOpen, () => {
    if (previewActive && voiceIntent.current) document.querySelector<HTMLElement>('[aria-label="Choose speech language"]:not(:disabled)')?.focus({ preventScroll: true });
  });
  const audioMeter = useVoiceAudioMeter({ enabled: previewActive && voiceOpen && !languagePresence.presented
    && speech.phase === "listening" && !voiceOffline && !reducedMotion });
  const startVoice = (language = voiceLanguage) => {
    const offline = !navigator.onLine;
    setVoiceOffline(offline);
    speech.cancel();
    if (!offline) speech.start(language);
  };
  const openVoice = () => {
    if (!previewActive || voicePresence.presented) return;
    voiceOrigin.current = page === "serp" || (page === "search" && searchReturnPage === "serp") ? "serp" : "home";
    voiceTrigger.current = page === "search"
      ? searchRef.current?.querySelector<HTMLInputElement>('[aria-label="Search query"]') ?? null
      : (page === "home" ? homeRef : serpRef).current?.querySelector<HTMLButtonElement>('[aria-label="Start voice search"]') ?? null;
    voiceIntent.current = true;
    voiceSubmitted.current = false;
    setVoiceOpen(true);
    startVoice();
  };
  const closeVoice = () => {
    voiceIntent.current = false;
    speech.cancel();
    setVoiceLanguageOpen(false);
    setVoiceOpen(false);
  };
  useEffect(() => {
    if (!previewActive) {
      voiceIntent.current = false;
      speech.cancel();
      setVoiceLanguageOpen(false);
      setVoiceOpen(false);
    }
  }, [previewActive, speech.cancel]);
  useEffect(() => {
    const offline = () => { if (voiceIntent.current) { speech.cancel(); setVoiceOffline(true); } };
    window.addEventListener("offline", offline);
    return () => window.removeEventListener("offline", offline);
  }, [speech.cancel]);
  const voiceErrors: Record<string, VoiceSearchState> = {
    unsupported: "unsupported", permission: "permission", microphone: "microphone", "no-speech": "unrecognized", network: "connection", start: "connection",
  };
  const voiceState: VoiceSearchState = voiceOffline ? "offline" : speech.error ? voiceErrors[speech.error]
    : speech.transcript ? "input" : speech.phase === "requesting" ? "requesting" : speech.phase === "listening" ? "listening" : "paused";
  if (voiceOpen && voiceIntent.current && !voiceLanguageOpen) voiceFrame.current = { state: voiceState, transcript: speech.transcript };
  const focusRecentSection = (label: string) => {
    (recentRef.current?.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
      ?? recentRef.current?.querySelector<HTMLButtonElement>('[data-private-turn-off], [aria-label="New tab"]'))?.focus({ preventScroll: true });
  };
  const openTab = (id: string) => {
    const session = activity.restoreTab(id);
    if (!session) return;
    setPrivateMode(session.privateMode);
    setSearchOrigin(null);
    setSearchExitOrigin(null);
    setSearchReturnPage("serp");
    tabFocusRequested.current = true;
    setPage("serp");
  };
  const navigate = (destination: SelectableFooterDestination, origin: "home" | "serp" = "home", transition: "fade" | "pop" = "fade") => {
    setSerpExitToRight(transition === "pop");
    if (destination === "collections") {
      setRecentOrigin(origin);
      // A footer entry starts fresh; Back from a child page resumes the current visit.
      if (page !== "recent") setRecentSearchResetKey(key => key + 1);
    }
    setPage(destination === "home" ? "home" : "recent");
    requestAnimationFrame(() => (destination === "home" ? homeRef : recentRef).current
      ?.querySelector<HTMLButtonElement>('button[aria-current="page"]')?.focus());
  };
  const openSearch = () => {
    setSearchOrigin(measureSearchOrigin(homeRef.current, "home"));
    setSearchExitOrigin(null);
    setSearchDraft("");
    setSearchReturnPage("home");
    setPage("search");
  };
  const finishSearchExit = () => {
    setSearchOrigin(null);
    setSearchExitOrigin(null);
    cancelAnimationFrame(searchFocusFrame.current);
    searchFocusFrame.current = requestAnimationFrame(() => {
      if (page === "home") homeRef.current?.querySelector<HTMLElement>('[aria-label="Homepage content"]')?.focus({ preventScroll: true });
      if (page === "recent") recentRef.current?.querySelector<HTMLButtonElement>('[data-private-turn-off], button[aria-label="New tab"]')?.focus({ preventScroll: true });
      if (page === "tabs") tabsRef.current?.querySelector<HTMLButtonElement>('button[aria-label="New tab"]')?.focus({ preventScroll: true });
      if (page === "history") historyRef.current?.querySelector<HTMLButtonElement>('[data-history-search]')?.focus({ preventScroll: true });
      if (page === "serp") serpRef.current?.querySelector<HTMLInputElement>('[aria-label="Edit search query"]')?.focus({ preventScroll: true });
    });
  };
  const openNewTab = (from: "recent" | "tabs" | "history") => { setSearchOrigin(null); setSearchExitOrigin(null); setSearchDraft(""); setSearchReturnPage(from); setPage("search"); };
  const submitSearch = (value: string, source: "search" | "history" | "recent" | "feed" | "voice" | "voice-serp" = "search", articleTitle?: string) => {
    // The entry point decides whether submission edits the active tab or creates one.
    const reuseTab = source === "voice-serp" || (source === "search" && searchReturnPage === "serp");
    const session = activity.createResultSession(value, { privateMode, reuseTab, articleTitle });
    if (!session) return;
    const query = session.query;
    if (source !== "search") setSearchOrigin(null);
    setSearchExitOrigin(source === "search" ? measureSearchOrigin(serpRef.current, "serp", query) : null);
    setSearchDraft(query);
    setPage("serp");
  };
  const openHistorySearch = (query: string) => submitSearch(query, "history");
  const editSearch = (value = resultQuery) => {
    setSearchOrigin(measureSearchOrigin(serpRef.current, "serp", value));
    setSearchExitOrigin(null);
    setSearchDraft(value); setSearchReturnPage("serp"); setPage("search");
  };
  const openDetail = (destination: "history" | "bookmark" | "settings", origin: "recent" | "profile") => {
    setDetailChromeRetained(true);
    setDetailOrigin(origin);
    setPage(destination);
  };
  const homeInactive = !previewActive || page !== "home" || searchOrigin !== null || voicePresence.presented;
  const tabsVisible = page === "tabs" || (page === "search" && searchReturnPage === "tabs");
  const historyVisible = page === "history" || (page === "search" && searchReturnPage === "history");
  const bookmarkVisible = page === "bookmark";
  const settingsVisible = page === "settings";
  const detailVisible = historyVisible || bookmarkVisible || settingsVisible;
  const profileVisible = page === "profile" || (detailVisible && detailOrigin === "profile");
  const recentVisible = page === "recent" || (detailVisible && detailOrigin === "recent") || tabsVisible || (page === "search" && searchReturnPage === "recent");
  const searchFromRecent = ["recent", "tabs", "history"].includes(searchReturnPage);
  const serpVisible = page === "serp" || (page === "search" && searchReturnPage === "serp");
  // Home backs its own Search/Profile stack, never the SERP/Recent dissolve.
  // Keeping it painted beneath both fading screens exposes the wallpaper mid-transition.
  const homeVisible = !recentVisible && !serpVisible;
  const serpTransition = searchOrigin?.kind === "serp" || searchExitOrigin?.kind === "serp";
  const returningHome = serpExitToRight && page === "home";
  const screenClass = `${styles.screen} ${detailChromeRetained ? styles.hiddenStatusBar : ""}`;
  const finishDetailExit = () => {
    if (!profileVisible && !tabsVisible && !detailVisible) setDetailChromeRetained(false);
  };
  const returnToResults = () => {
    if (activeResult) { setPrivateMode(activeResult.privateMode); setPage("serp"); }
    else if (selectedTabId) openTab(selectedTabId);
    else setPage("home");
  };
  const cancelSearch = () => {
    if (searchReturnPage === "serp" && activeResult) setPrivateMode(activeResult.privateMode);
    // Recent's private gate also owns returns from its normal-mode child pages.
    setPage(privateMode && (searchReturnPage === "tabs" || searchReturnPage === "history") ? "recent" : searchReturnPage);
  };
  return (
    <>
      <div className={`${styles.appSurfaces} ${voicePresence.presented ? styles.voiceCovered : ""}`}
        aria-hidden={voicePresence.presented || undefined} {...(voicePresence.presented ? { inert: "" } : {})}>
      <ScreenLayer ref={homeRef} className={`${screenClass} ${returningHome ? styles.hiddenSystemChrome : ""}`} visible={homeVisible} immediate={returningHome}
        aria-hidden={homeInactive || undefined} {...(homeInactive ? { inert: "" } : {})}>
        <Homepage timeSource={timeSource} feedSource={feedSource} interactiveFeed initialState={initialHomeState} privateMode={privateMode} onNavigate={navigate}
          onOpenArticle={({ url, title }) => { if (page === "home" && webUrl(url)) submitSearch(url, "feed", title); }}
          profileAvatar={profileAvatar(currentAccount)} onOpenProfile={() => { setDetailChromeRetained(true); setPage("profile"); }}
          onOpenSearch={openSearch} onVoiceSearch={openVoice} searchConcealed={searchOrigin !== null} scrollSnapEnabled={!homeInactive} />
      </ScreenLayer>
      <AnimatePresence initial={initialPage !== "profile"} onExitComplete={() => {
        finishDetailExit();
        if (page === "home") homeRef.current?.querySelector<HTMLButtonElement>('[aria-label="Open Profile"]')?.focus({ preventScroll: true });
      }}>
        {profileVisible && <motion.div ref={profileRef} key="profile" className={`${screenClass} ${styles.detailScreen}`}
          initial={{ x: reducedMotion ? 0 : "100%" }} animate={{ x: 0 }} exit={{ x: reducedMotion ? 0 : "100%" }}
          transition={reducedMotion ? iosMotion.instant : iosMotion.navigation}>
          <Profile account={currentAccount} timeSource={timeSource} active={page === "profile"} onBack={() => setPage("home")}
            authentication={profileAuthentication} rewardsSnapshot={rewardsSnapshot}
            onViewHistory={() => openDetail("history", "profile")} onViewBookmarks={() => openDetail("bookmark", "profile")}
            onViewSettings={() => openDetail("settings", "profile")} onViewRewards={openMicrosoftRewards} />
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence onExitComplete={() => {
        finishDetailExit();
        if (page === "profile") profileRef.current?.querySelector<HTMLButtonElement>('[aria-label="Settings"]')?.focus({ preventScroll: true });
      }}>
        {settingsVisible && <motion.div key="settings" className={`${screenClass} ${styles.detailScreen}`}
          initial={{ x: reducedMotion ? 0 : "100%" }} animate={{ x: 0 }} exit={{ x: reducedMotion ? 0 : "100%" }}
          transition={reducedMotion ? iosMotion.instant : iosMotion.navigation}>
          <Settings account={currentAccount} timeSource={timeSource} active={settingsVisible} onBack={() => setPage("profile")} />
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence custom={searchExitOrigin} onExitComplete={finishSearchExit}>
        {page === "search" && <motion.div ref={searchRef} key="search" className={`${screenClass} ${styles.searchScreen}`}
          initial={searchFromRecent ? { opacity: 0 } : false} animate={{ opacity: 1 }}
          variants={{ exit: (destination: SearchTransitionOrigin | null) => ({ opacity: searchFromRecent && !destination ? 0 : 1 }) }}
          exit="exit"
          transition={reducedMotion ? iosMotion.instant : iosMotion.fade}>
          <Search initialState="keyboard" initialQuery={searchDraft} timeSource={timeSource} interactive active={previewActive && !voicePresence.presented}
            history={searchHistory} onHistoryChange={updateSearchHistory}
            privateMode={privateMode} onPrivateModeChange={setPrivateMode}
            transitionOrigin={searchOrigin ?? undefined} onBack={cancelSearch} onSubmit={submitSearch} onVoiceSearch={openVoice} />
        </motion.div>}
      </AnimatePresence>
      <ScreenLayer ref={recentRef} className={screenClass} visible={recentVisible}
        aria-hidden={page !== "recent" || undefined} {...(page !== "recent" ? { inert: "" } : {})}>
        <Recent timeSource={timeSource} footerVariant={recentOrigin === "serp" ? "browser" : "app"}
          privateMode={privateMode} onPrivateModeChange={mode => {
            setPrivateMode(mode); setRecentSearchResetKey(key => key + 1);
            cancelAnimationFrame(searchFocusFrame.current);
            searchFocusFrame.current = requestAnimationFrame(() => recentRef.current?.querySelector<HTMLElement>('[aria-label="Recent content"]')?.focus({ preventScroll: true }));
          }}
          active={previewActive && page === "recent"} searchResetKey={recentSearchResetKey} onSearchSubmit={query => submitSearch(query, "recent")}
          onNavigate={(destination) => navigate(destination, recentOrigin)}
          tabs={tabs} selectedTabId={selectedTabId} onSelectTab={openTab} onCloseTab={closeTab}
          onViewTabs={() => { setDetailChromeRetained(true); setPage("tabs"); }} onNewTab={() => openNewTab("recent")}
          historyEntries={browsingHistory} onViewHistory={() => openDetail("history", "recent")}
          onOpenHistorySearch={openHistorySearch} onOpenHistoryPage={url => submitSearch(url, "history")} onDeleteHistory={deleteHistoryEntry}
          conversationEntries={conversations}
          bookmarkEntries={recentBookmarkPreview(bookmarks)} onViewBookmarks={() => openDetail("bookmark", "recent")}
          searchableBookmarks={bookmarkSearchEntries(bookmarks)}
          onBackToResults={returnToResults} />
      </ScreenLayer>
      <AnimatePresence onExitComplete={() => {
        finishDetailExit();
        if (page === "recent") focusRecentSection("View all open tabs");
      }}>
        {tabsVisible && <motion.div ref={tabsRef} key="tabs" className={`${screenClass} ${styles.tabsScreen} ${privateMode ? styles.inactiveResult : ""}`}
          initial={{ x: reducedMotion ? 0 : "100%" }} animate={{ x: 0 }} exit={{ x: reducedMotion ? 0 : "100%" }}
          transition={reducedMotion ? iosMotion.instant : iosMotion.navigation}>
          <Tabs tabs={tabs} selectedTabId={selectedTabId} timeSource={timeSource} interactive active={page === "tabs"}
            onBack={() => setPage("recent")} onNewTab={() => openNewTab("tabs")}
            onSelectTab={openTab} onCloseTab={closeTab} onCloseAll={closeAllTabs} />
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence onExitComplete={() => {
        finishDetailExit();
        if (page === "recent") focusRecentSection("View all history");
        if (page === "profile") profileRef.current?.querySelector<HTMLButtonElement>('[aria-label="History"]')?.focus({ preventScroll: true });
      }}>
        {historyVisible && <motion.div ref={historyRef} key="history" className={`${screenClass} ${styles.detailScreen} ${privateMode && page === "search" ? styles.inactiveResult : ""}`}
          initial={{ x: reducedMotion ? 0 : "100%" }} animate={{ x: 0 }} exit={{ x: reducedMotion ? 0 : "100%" }}
          transition={reducedMotion ? iosMotion.instant : iosMotion.navigation}>
          <History entries={browsingHistory} timeSource={timeSource} interactive active={page === "history"}
            backLabel={detailOrigin === "profile" ? "Back to Profile" : "Back to Recent"}
            onBack={() => setPage(detailOrigin)} onDelete={deleteHistoryEntry}
            onClearAll={activity.clearHistory} onSearch={() => openNewTab("history")}
            onOpenSearch={openHistorySearch} onOpenPage={url => submitSearch(url, "history")} />
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence onExitComplete={() => {
        finishDetailExit();
        if (page === "recent") focusRecentSection("View all bookmark");
        if (page === "profile") profileRef.current?.querySelector<HTMLButtonElement>('[aria-label="Bookmarks"]')?.focus({ preventScroll: true });
      }}>
        {bookmarkVisible && <motion.div key="bookmark" className={`${screenClass} ${styles.detailScreen}`}
          initial={{ x: reducedMotion ? 0 : "100%" }} animate={{ x: 0 }} exit={{ x: reducedMotion ? 0 : "100%" }}
          transition={reducedMotion ? iosMotion.instant : iosMotion.navigation}>
          <Bookmark entries={bookmarks} timeSource={timeSource} interactive active={page === "bookmark"}
            onDelete={activity.deleteBookmarkEntry}
            backLabel={detailOrigin === "profile" ? "Back to Profile" : "Back to Recent"}
            onBack={() => setPage(detailOrigin)} />
        </motion.div>}
      </AnimatePresence>
      <ScreenLayer className={`${screenClass} ${styles.resultScreen} ${returningHome ? styles.hiddenSystemChrome : ""}`} visible={serpVisible} exitToRight={returningHome}
        onHidden={() => setSerpExitToRight(false)}
        aria-hidden={!serpVisible || undefined} {...(!serpVisible ? { inert: "" } : {})}>
        {resultSessions.map(session => <div key={session.id}
          ref={session === activeResult ? serpRef : undefined}
          className={`${styles.screen} ${session !== activeResult ? styles.inactiveResult : ""}`}
          aria-hidden={session !== activeResult || undefined} {...(session !== activeResult ? { inert: "" } : {})}>
          <LiveSERP query={session.query} initialUrl={session.initialUrl} timeSource={timeSource} privateMode={session.privateMode}
            onPageReady={(snapshot, navigationId) => saveResultPage(session, snapshot, navigationId)}
            active={previewActive && page === "serp" && session === activeResult && !voicePresence.presented} searchConcealed={serpTransition}
            onBack={() => navigate("home", "serp", "pop")} backLabel="Back to Home" onEditLocation={editSearch} onEditQuery={() => editSearch()}
            onHome={() => navigate("home")} onRecent={() => navigate("collections", "serp")} onVoiceSearch={openVoice} />
        </div>)}
        {!activeResult && <div ref={serpRef} className={styles.screen}><SERP active={false} webContent={<></>} /></div>}
      </ScreenLayer>
      {(returningHome || detailChromeRetained) && <div className={styles.returnSystemChrome} data-prototype-system-chrome aria-hidden="true">
        <IOSStatusBar timeSource={timeSource} tone={((page === "search" || page === "recent") && privateMode) || (page === "serp" && activeResult?.privateMode) ? "light" : "inherit"} />
        {returningHome && <IOSHomeIndicator placement="overlay" />}
      </div>}
      </div>
      <AnimatePresence onExitComplete={() => { voicePresence.finishExit(); languagePresence.finishExit(); }}>
        {voiceOpen && <motion.div key="voice" className={`${styles.screen} ${styles.voiceScreen}`}
          initial={{ y: reducedMotion ? 0 : "100%" }} animate={{ y: 0 }} exit={{ y: reducedMotion ? 0 : "100%" }}
          transition={reducedMotion ? iosMotion.instant : iosMotion.navigation}>
          <div className={styles.screen} aria-hidden={languagePresence.presented || undefined} {...(languagePresence.presented ? { inert: "" } : {})}>
            <VoiceSearch state={voiceFrame.current.state} transcript={voiceFrame.current.transcript} interactive hideSystemChrome
              audioLevels={audioMeter.levels} active={previewActive && voiceOpen && !languagePresence.presented} onDismiss={closeVoice}
              onRetry={() => startVoice()} onLanguage={() => { speech.cancel(); setVoiceLanguageOpen(true); }} />
          </div>
          <AnimatePresence onExitComplete={languagePresence.finishExit}>
            {voiceLanguageOpen && <VoiceLanguageSheet language={voiceLanguage} interactive onDone={language => {
              setVoiceLanguage(language); setVoiceLanguageOpen(false); startVoice(language);
            }} />}
          </AnimatePresence>
        </motion.div>}
      </AnimatePresence>
      {voicePresence.presented && <div className={styles.voiceSystemChrome} aria-hidden="true">
        <IOSStatusBar timeSource={timeSource} /><IOSHomeIndicator placement="overlay" />
      </div>}
    </>
  );
}
