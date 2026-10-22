import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { SelectableFooterDestination } from "../components/AppFooter";
import { Homepage, type HomepageProps } from "./Homepage";
import { useSearchDiscovery } from "./Search/useSearchDiscovery";
import { Recent } from "./Recent";
import { RECENT_CONVERSATIONS } from "./Recent/Recent.data";
import { Tabs } from "./Tabs";
import { History } from "./History";
import { Bookmark } from "./Bookmark";
import { Profile, PROFILE_ACCOUNTS, profileAvatar, type ProfileAccount } from "./Profile";
import { BOOKMARK_ENTRIES, deleteBookmark, recentBookmarkPreview } from "./Bookmark/Bookmark.data";
import { HISTORY_ENTRIES } from "./History/History.data";
import { OPEN_TABS, recentTabPreview } from "./Tabs/Tabs.data";
import { DEFAULT_DISCOVERY_VISIBILITY, Search, type SearchTransitionOrigin } from "./Search";
import { RECENT_SEARCHES } from "./Search/Search.data";
import { LiveSERP } from "./SERP/LiveSERP";
import { SERP } from "./SERP/SERP";
import { measureSearchOrigin } from "./Search/searchTransition";
import { iosMotion } from "../motion/iosMotion";
import styles from "./BingAppPrototype.module.css";

export interface BingAppPrototypeProps {
  initialPage?: "home" | "recent" | "profile";
  account?: ProfileAccount | null;
  initialRecentState?: "default" | "empty";
  initialHomeState?: HomepageProps["initialState"];
  initialPrivateMode?: boolean;
  timeSource?: "fixed" | "system";
  feedSource?: HomepageProps["feedSource"];
  discoverySource?: "preview" | "live";
}

/** Keep underlying screens mounted while navigating their Query entry flow. */
export function BingAppPrototype({ initialPage = "home", account = PROFILE_ACCOUNTS.image, initialRecentState = "default", initialHomeState = "top", initialPrivateMode = false, timeSource = "fixed", feedSource = "preview", discoverySource = "preview" }: BingAppPrototypeProps) {
  const [page, setPage] = useState<"home" | "recent" | "tabs" | "history" | "bookmark" | "search" | "serp" | "profile">(initialPage);
  const [resultQuery, setResultQuery] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchReturnPage, setSearchReturnPage] = useState<"home" | "recent" | "tabs" | "history" | "serp">("home");
  const [recentOrigin, setRecentOrigin] = useState<"home" | "serp">("home");
  const [detailOrigin, setDetailOrigin] = useState<"recent" | "profile">("recent");
  const reducedMotion = useReducedMotion();
  const [privateMode, setPrivateMode] = useState(initialPrivateMode);
  const discovery = useSearchDiscovery(discoverySource === "live" && !privateMode);
  const [discoveryVisibility, setDiscoveryVisibility] = useState(DEFAULT_DISCOVERY_VISIBILITY);
  const [searchHistory, setSearchHistory] = useState(initialRecentState === "empty" ? [] : RECENT_SEARCHES);
  const [browsingHistory, setBrowsingHistory] = useState(initialRecentState === "empty" ? [] : HISTORY_ENTRIES);
  const [bookmarks, setBookmarks] = useState(initialRecentState === "empty" ? [] : BOOKMARK_ENTRIES);
  const [conversations] = useState(initialRecentState === "empty" ? [] : RECENT_CONVERSATIONS);
  const [searchOrigin, setSearchOrigin] = useState<SearchTransitionOrigin | null>(null);
  const [searchExitOrigin, setSearchExitOrigin] = useState<SearchTransitionOrigin | null>(null);
  const [resultRevision, setResultRevision] = useState(0);
  const serpRef = useRef<HTMLDivElement>(null);
  const searchFocusFrame = useRef(0);
  useLayoutEffect(() => () => cancelAnimationFrame(searchFocusFrame.current), [page]);
  const homeRef = useRef<HTMLDivElement>(null);
  const recentRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const [tabs, setTabs] = useState(initialRecentState === "empty" ? [] : OPEN_TABS);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(initialRecentState === "empty" ? null : "spring");
  const activitySequence = useRef(0);
  const closeTab = (id: string) => {
    const nextTabs = tabs.filter(tab => tab.id !== id);
    setTabs(nextTabs);
    if (selectedTabId === id) setSelectedTabId(nextTabs[Math.min(tabs.findIndex(tab => tab.id === id), nextTabs.length - 1)]?.id ?? null);
  };
  const closeAllTabs = () => { setTabs([]); setSelectedTabId(null); };
  const navigate = (destination: SelectableFooterDestination, origin: "home" | "serp" = "home") => {
    if (destination === "collections") setRecentOrigin(origin);
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
      if (page === "recent") recentRef.current?.querySelector<HTMLButtonElement>('button[aria-label="New tab"]')?.focus({ preventScroll: true });
      if (page === "tabs") tabsRef.current?.querySelector<HTMLButtonElement>('button[aria-label="New tab"]')?.focus({ preventScroll: true });
      if (page === "history") historyRef.current?.querySelector<HTMLButtonElement>('[data-history-search]')?.focus({ preventScroll: true });
      if (page === "serp") serpRef.current?.querySelector<HTMLInputElement>('[aria-label="Edit search query"]')?.focus({ preventScroll: true });
    });
  };
  const openNewTab = (from: "recent" | "tabs" | "history") => { setSearchOrigin(null); setSearchExitOrigin(null); setSearchDraft(""); setSearchReturnPage(from); setPage("search"); };
  const submitSearch = (value: string) => {
    const query = value.trim().replace(/\s+/g, " ");
    if (!query) return;
    // Only submitted normal-mode queries become activity; typing and private queries do not.
    if (!privateMode) {
      const id = `search-${++activitySequence.current}`;
      const visitedAt = Date.now();
      setSearchHistory(items => [{ id, query }, ...items.filter(item => item.query.toLocaleLowerCase() !== query.toLocaleLowerCase())]);
      setBrowsingHistory(entries => [{
        id, title: query, subtitle: `https://www.bing.com/search?${new URLSearchParams({ q: query })}`,
        visitedAt, groupId: "today", groupLabel: "Today",
      }, ...entries]);
      // Editing the active result reuses its tab. Home and the + entry create a new tab on submit.
      const tabId = searchReturnPage === "serp" && tabs.some(tab => tab.id === selectedTabId) ? selectedTabId! : id;
      const tab = { id: tabId, title: query, previewSrc: null, faviconSrc: null };
      setTabs(items => [tab, ...items.filter(item => item.id !== tabId)]);
      setSelectedTabId(tabId);
    }
    setResultQuery(query);
    setResultRevision(revision => revision + 1);
    setSearchExitOrigin(measureSearchOrigin(serpRef.current, "serp", query));
    setSearchDraft(query);
    setPage("serp");
  };
  const editSearch = () => {
    setSearchOrigin(measureSearchOrigin(serpRef.current, "serp", resultQuery));
    setSearchExitOrigin(null);
    setSearchDraft(resultQuery); setSearchReturnPage("serp"); setPage("search");
  };
  const openDetail = (destination: "history" | "bookmark", origin: "recent" | "profile") => {
    setDetailOrigin(origin);
    setPage(destination);
  };
  const homeInactive = page !== "home" || searchOrigin !== null;
  const tabsVisible = page === "tabs" || (page === "search" && searchReturnPage === "tabs");
  const historyVisible = page === "history" || (page === "search" && searchReturnPage === "history");
  const bookmarkVisible = page === "bookmark";
  const detailVisible = historyVisible || bookmarkVisible;
  const profileVisible = page === "profile" || (detailVisible && detailOrigin === "profile");
  const recentVisible = page === "recent" || (detailVisible && detailOrigin === "recent") || tabsVisible || (page === "search" && searchReturnPage === "recent");
  const searchFromRecent = ["recent", "tabs", "history"].includes(searchReturnPage);
  const serpVisible = page === "serp" || (page === "search" && searchReturnPage === "serp");
  const serpTransition = searchOrigin?.kind === "serp" || searchExitOrigin?.kind === "serp";
  return (
    <>
      <div ref={homeRef} className={styles.screen} hidden={recentVisible}
        aria-hidden={homeInactive || undefined} {...(homeInactive ? { inert: "" } : {})}>
        <Homepage timeSource={timeSource} feedSource={feedSource} interactiveFeed initialState={initialHomeState} privateMode={privateMode} onNavigate={navigate}
          profileAvatar={profileAvatar(account)} onOpenProfile={() => setPage("profile")}
          onOpenSearch={openSearch} searchConcealed={searchOrigin !== null} scrollSnapEnabled={!homeInactive} />
      </div>
      <AnimatePresence initial={initialPage !== "profile"} onExitComplete={() => {
        if (page === "home") homeRef.current?.querySelector<HTMLButtonElement>('[aria-label="Open Profile"]')?.focus({ preventScroll: true });
      }}>
        {profileVisible && <motion.div ref={profileRef} key="profile" className={`${styles.screen} ${styles.detailScreen}`}
          initial={{ x: reducedMotion ? 0 : "100%" }} animate={{ x: 0 }} exit={{ x: reducedMotion ? 0 : "100%" }}
          transition={reducedMotion ? iosMotion.instant : iosMotion.navigation}>
          <Profile account={account} timeSource={timeSource} active={page === "profile"} onBack={() => setPage("home")}
            onViewHistory={() => openDetail("history", "profile")} onViewBookmarks={() => openDetail("bookmark", "profile")} />
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence custom={searchExitOrigin} onExitComplete={finishSearchExit}>
        {page === "search" && <motion.div key="search" className={`${styles.screen} ${styles.searchScreen}`}
          initial={searchFromRecent ? { opacity: 0 } : false} animate={{ opacity: 1 }}
          variants={{ exit: (destination: SearchTransitionOrigin | null) => ({ opacity: searchFromRecent && !destination ? 0 : 1 }) }}
          exit="exit"
          transition={reducedMotion ? iosMotion.instant : iosMotion.fade}>
          <Search initialState="keyboard" initialQuery={searchDraft} timeSource={timeSource} interactive
            discovery={discoverySource === "live" ? discovery : undefined}
            discoveryVisibility={discoveryVisibility} onDiscoveryVisibilityChange={setDiscoveryVisibility}
            history={searchHistory} onHistoryChange={setSearchHistory}
            privateMode={privateMode} onPrivateModeChange={setPrivateMode}
            transitionOrigin={searchOrigin ?? undefined} onBack={() => setPage(searchReturnPage)} onSubmit={submitSearch} />
        </motion.div>}
      </AnimatePresence>
      <div ref={recentRef} className={styles.screen} hidden={!recentVisible}
        aria-hidden={page !== "recent" || undefined} {...(page !== "recent" ? { inert: "" } : {})}>
        <Recent timeSource={timeSource} footerVariant={recentOrigin === "serp" ? "browser" : "app"}
          onNavigate={(destination) => navigate(destination, recentOrigin)}
          tabs={recentTabPreview(tabs)} selectedTabId={selectedTabId} onSelectTab={setSelectedTabId} onCloseTab={closeTab}
          onViewTabs={() => setPage("tabs")} onNewTab={() => openNewTab("recent")}
          historyEntries={browsingHistory} onViewHistory={() => openDetail("history", "recent")}
          conversationEntries={conversations}
          bookmarkEntries={recentBookmarkPreview(bookmarks)} onViewBookmarks={() => openDetail("bookmark", "recent")}
          onBackToResults={() => setPage("serp")} />
      </div>
      <AnimatePresence onExitComplete={() => {
        if (page === "recent") recentRef.current?.querySelector<HTMLButtonElement>('[aria-label="View all open tabs"]')?.focus({ preventScroll: true });
      }}>
        {tabsVisible && <motion.div ref={tabsRef} key="tabs" className={`${styles.screen} ${styles.tabsScreen}`}
          initial={{ x: reducedMotion ? 0 : "100%" }} animate={{ x: 0 }} exit={{ x: reducedMotion ? 0 : "100%" }}
          transition={reducedMotion ? iosMotion.instant : iosMotion.navigation}>
          <Tabs tabs={tabs} selectedTabId={selectedTabId} timeSource={timeSource} interactive active={page === "tabs"}
            onBack={() => setPage("recent")} onNewTab={() => openNewTab("tabs")}
            onSelectTab={setSelectedTabId} onCloseTab={closeTab} onCloseAll={closeAllTabs}
            onNavigate={destination => navigate(destination, recentOrigin)} />
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence onExitComplete={() => {
        if (page === "recent") recentRef.current?.querySelector<HTMLButtonElement>('[aria-label="View all history"]')?.focus({ preventScroll: true });
        if (page === "profile") profileRef.current?.querySelector<HTMLButtonElement>('[aria-label="History"]')?.focus({ preventScroll: true });
      }}>
        {historyVisible && <motion.div ref={historyRef} key="history" className={`${styles.screen} ${styles.detailScreen}`}
          initial={{ x: reducedMotion ? 0 : "100%" }} animate={{ x: 0 }} exit={{ x: reducedMotion ? 0 : "100%" }}
          transition={reducedMotion ? iosMotion.instant : iosMotion.navigation}>
          <History entries={browsingHistory} timeSource={timeSource} interactive active={page === "history"}
            backLabel={detailOrigin === "profile" ? "Back to Profile" : "Back to Recent"}
            onBack={() => setPage(detailOrigin)} onDelete={id => setBrowsingHistory(entries => entries.filter(entry => entry.id !== id))}
            onClearAll={() => setBrowsingHistory([])} onSearch={() => openNewTab("history")}
            onNavigate={destination => navigate(destination, detailOrigin === "profile" ? "home" : recentOrigin)} />
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence onExitComplete={() => {
        if (page === "recent") recentRef.current?.querySelector<HTMLButtonElement>('[aria-label="View all bookmark"]')?.focus({ preventScroll: true });
        if (page === "profile") profileRef.current?.querySelector<HTMLButtonElement>('[aria-label="Bookmarks"]')?.focus({ preventScroll: true });
      }}>
        {bookmarkVisible && <motion.div key="bookmark" className={`${styles.screen} ${styles.detailScreen}`}
          initial={{ x: reducedMotion ? 0 : "100%" }} animate={{ x: 0 }} exit={{ x: reducedMotion ? 0 : "100%" }}
          transition={reducedMotion ? iosMotion.instant : iosMotion.navigation}>
          <Bookmark entries={bookmarks} timeSource={timeSource} interactive active={page === "bookmark"}
            onDelete={id => setBookmarks(entries => deleteBookmark(entries, id))}
            backLabel={detailOrigin === "profile" ? "Back to Profile" : "Back to Recent"}
            onBack={() => setPage(detailOrigin)} onNavigate={destination => navigate(destination, detailOrigin === "profile" ? "home" : recentOrigin)} />
        </motion.div>}
      </AnimatePresence>
      <div ref={serpRef} className={`${styles.screen} ${styles.resultScreen} ${serpVisible ? "" : styles.concealedScreen}`}
        aria-hidden={!serpVisible || undefined} {...(!serpVisible ? { inert: "" } : {})}>
        {resultQuery ? <LiveSERP key={resultRevision} query={resultQuery} timeSource={timeSource}
          active={page === "serp"} searchConcealed={serpTransition}
          onBack={editSearch} onEditQuery={editSearch}
          onHome={() => navigate("home")} onRecent={() => navigate("collections", "serp")} />
          : <SERP active={false} webContent={<></>} />}
      </div>
    </>
  );
}
