import { useCallback, useRef, useState } from "react";
import { bingSearchQuery, bingSearchUrl, type BingPageSnapshot } from "../../services/bingPage";
import { normalizeSearchQuery } from "../../services/searchSuggestions";
import { webUrl } from "../../services/webNavigation";
import { RECENT_CONVERSATIONS } from "../Recent/Recent.data";
import { RECENT_SEARCHES } from "../Search/Search.data";
import { HISTORY_ENTRIES } from "../History/History.data";
import { BOOKMARK_ENTRIES } from "../Bookmark/Bookmark.data";
import { deleteBookmark } from "./bookmarks";
import { OPEN_TABS } from "../Tabs/Tabs.data";
import type { ResultSession } from "./types";

const searchQueryKey = (query: string) => normalizeSearchQuery(query).toLocaleLowerCase();

/** Session-only activity shared by the prototype's screens; navigation and focus stay with their caller. */
export function usePrototypeActivity(initialRecentState: "default" | "empty" = "default") {
  const [resultSessions, setResultSessions] = useState<ResultSession[]>([]);
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const activeResult = resultSessions.find(session => session.id === activeResultId);
  const [searchHistory, setSearchHistory] = useState(initialRecentState === "empty" ? [] : RECENT_SEARCHES);
  const [browsingHistory, setBrowsingHistory] = useState(initialRecentState === "empty" ? [] : HISTORY_ENTRIES);
  const [bookmarks, setBookmarks] = useState(initialRecentState === "empty" ? [] : BOOKMARK_ENTRIES);
  const [conversations] = useState(initialRecentState === "empty" ? [] : RECENT_CONVERSATIONS);
  const [tabs, setTabs] = useState(initialRecentState === "empty" ? [] : OPEN_TABS);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(initialRecentState === "empty" ? null : "spring");
  const activitySequence = useRef(0);
  const recordedPages = useRef(new Set<string>());
  const deleteHistoryEntry = (id: string) => {
    const deletedQuery = bingSearchQuery(browsingHistory.find(entry => entry.id === id)?.subtitle ?? "");
    const remaining = browsingHistory.filter(entry => entry.id !== id);
    setBrowsingHistory(remaining);
    // Search lists unique queries, while History lists individual visits. Keep
    // the query until its last visit is removed; webpage deletion is unrelated.
    if (deletedQuery && !remaining.some(entry => searchQueryKey(bingSearchQuery(entry.subtitle ?? "") ?? "") === searchQueryKey(deletedQuery))) {
      setSearchHistory(items => items.filter(item => searchQueryKey(item.query) !== searchQueryKey(deletedQuery)));
    }
  };
  const updateSearchHistory = (items: typeof searchHistory) => {
    const remaining = new Set(items.map(item => searchQueryKey(item.query)));
    const removed = new Set(searchHistory.filter(item => !remaining.has(searchQueryKey(item.query)))
      .map(item => searchQueryKey(item.query)));
    setSearchHistory(items);
    // Search history is a deduplicated view of the same queries shown in Recent.
    // Clear/remove all visits for those queries, preserving ordinary webpage visits.
    setBrowsingHistory(entries => entries.filter(entry => {
      const query = bingSearchQuery(entry.subtitle ?? "");
      return !query || (items.length > 0 && !removed.has(searchQueryKey(query)));
    }));
  };
  // A loaded page belongs to the submitted visit, even if Recent's selection changes meanwhile.
  const saveResultPage = useCallback((owner: ResultSession, snapshot: BingPageSnapshot, navigationId = 0) => {
    if (owner.privateMode || !owner.tabId) return;
    setTabs(items => items.map(tab => tab.id === owner.tabId && tab.query === owner.query
      ? { ...tab, title: snapshot.title || bingSearchQuery(snapshot.sourceUrl) || owner.query, pageSnapshot: snapshot, faviconSrc: snapshot.faviconUrl } : tab));
    const id = navigationId === 0 ? owner.historyId : `${owner.id}-page-${navigationId}`;
    if (!id) return;
    const firstVisit = !recordedPages.current.has(id);
    recordedPages.current.add(id);
    const query = bingSearchQuery(snapshot.sourceUrl);
    // Related searches inside Bing are real queries too. A retained page being
    // revisited with Back/Forward must not restore a query the user deleted.
    if (navigationId > 0 && firstVisit && query) {
      setSearchHistory(items => [{ id, query }, ...items.filter(item => searchQueryKey(item.query) !== searchQueryKey(query))]);
    }
    setBrowsingHistory(items => {
      const metadata = { title: snapshot.title || bingSearchQuery(snapshot.sourceUrl) || owner.query,
        subtitle: snapshot.sourceUrl, logoSrc: snapshot.faviconUrl ?? undefined };
      if (items.some(item => item.id === id)) return items.map(item => item.id === id ? { ...item, ...metadata } : item);
      return navigationId > 0 && firstVisit ? [{ id, ...metadata, visitedAt: Date.now(), groupId: "today", groupLabel: "Today" }, ...items] : items;
    });
  }, []);
  const closeTab = (id: string) => {
    const nextTabs = tabs.filter(tab => tab.id !== id);
    setTabs(nextTabs);
    setResultSessions(sessions => sessions.filter(session => session.tabId !== id));
    if (selectedTabId === id) setSelectedTabId(nextTabs[Math.min(tabs.findIndex(tab => tab.id === id), nextTabs.length - 1)]?.id ?? null);
  };
  const closeAllTabs = () => {
    setTabs([]);
    setSelectedTabId(null);
    setResultSessions(sessions => sessions.filter(session => session.tabId === null));
  };
  const restoreTab = (id: string) => {
    const tab = tabs.find(item => item.id === id);
    if (!tab?.query) return;
    const session = resultSessions.find(item => item.tabId === id)
      ?? { id: `tab-${id}`, query: tab.query, privateMode: false, tabId: id, historyId: null,
        initialUrl: tab.pageSnapshot && !bingSearchQuery(tab.pageSnapshot.sourceUrl) ? tab.pageSnapshot.sourceUrl : undefined };
    // Tab switching restores its existing document; only a new submission records a visit.
    setResultSessions(sessions => sessions.some(item => item.id === session.id) ? sessions : [...sessions, session]);
    setActiveResultId(session.id);
    setSelectedTabId(id);
    return session;
  };
  const createResultSession = (value: string, { privateMode, reuseTab = false, articleTitle }: {
    privateMode: boolean;
    reuseTab?: boolean;
    articleTitle?: string;
  }) => {
    const input = normalizeSearchQuery(value);
    const destination = webUrl(input);
    const query = destination ? bingSearchQuery(destination) ?? input : input;
    const initialUrl = destination && !bingSearchQuery(destination) ? destination : undefined;
    const title = initialUrl ? articleTitle?.trim() || query : query;
    if (!query) return;
    const id = `search-${++activitySequence.current}`;
    let session: ResultSession = { id, query, privateMode, tabId: null, historyId: null, initialUrl };
    // Only submitted normal-mode queries become activity; typing and private queries do not.
    if (!privateMode) {
      const visitedAt = Date.now();
      if (!initialUrl) setSearchHistory(items => [{ id, query }, ...items.filter(item => searchQueryKey(item.query) !== searchQueryKey(query))]);
      setBrowsingHistory(entries => [{
        id, title, subtitle: initialUrl ?? bingSearchUrl(query),
        visitedAt, groupId: "today", groupLabel: "Today",
      }, ...entries]);
      // Editing the active result reuses its tab. Home and the + entry create a new tab on submit.
      const tabId = reuseTab && tabs.some(tab => tab.id === activeResult?.tabId) ? activeResult!.tabId! : id;
      const tab = { id: tabId, title, query, previewSrc: null, faviconSrc: null };
      setTabs(items => [tab, ...items.filter(item => item.id !== tabId)]);
      setSelectedTabId(tabId);
      session = { id, query, privateMode: false, tabId, historyId: id, initialUrl };
    }
    // Retain other tabs' iframes (including scroll and pending requests). Editing
    // replaces only this tab's document; private results never enter normal activity.
    setResultSessions(sessions => [...sessions.filter(item => item.tabId !== session.tabId && item.tabId !== null), session]);
    setActiveResultId(session.id);
    return session;
  };
  const clearHistory = () => { setBrowsingHistory([]); setSearchHistory([]); };
  const deleteBookmarkEntry = (id: string) => setBookmarks(entries => deleteBookmark(entries, id));
  return {
    resultSessions, activeResultId, activeResult, searchHistory, browsingHistory,
    bookmarks, conversations, tabs, selectedTabId,
    deleteHistoryEntry, updateSearchHistory, saveResultPage, closeTab, closeAllTabs,
    restoreTab, createResultSession, clearHistory, deleteBookmarkEntry,
  };
}
