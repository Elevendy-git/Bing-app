import { useCallback, useEffect, useRef, useState } from "react";
import { LiveBingResults, type BingLoadState } from "./LiveBingResults";
import { LiveBrowserResults } from "./LiveBrowserResults";
import { SERP, type SERPProps } from "./SERP";
import { bingSearchQuery, bingSearchUrl, type BingPageSnapshot } from "../../services/bingPage";
import { resultDestination, type IABFindRequest, type IABFindResult } from "../../services/webNavigation";
import type { BookmarkPageMetadata } from "../activity/bookmarks";
import styles from "./LiveBingResults.module.css";

type LiveSERPProps = Omit<SERPProps, "webContent" | "loadState" | "loadKey" | "animateLoading" | "onToggleBookmark" | "bookmarked" | "find" | "onFindOnPage" | "onRefresh"> & {
  query: string;
  initialUrl?: string;
  onEditLocation?: (value: string) => void;
  onPageReady?: (snapshot: BingPageSnapshot, navigationId: number) => void;
  isBookmarked?: (url: string) => boolean;
  onToggleBookmark?: (page: BookmarkPageMetadata) => boolean;
};
interface PageEntry { id: number; revision: number; query: string; url?: string; snapshot?: BingPageSnapshot; load: { state: BingLoadState; attempt: number } }
const entry = (id: number, query: string, url?: string): PageEntry => ({ id, revision: 0, query, url, load: { state: "loading", attempt: 0 } });

/** Every app tab owns its navigation stack and keeps its visited documents mounted. */
export function LiveSERP(props: LiveSERPProps) {
  return <LiveSERPSession key={`${props.query}:${props.initialUrl ?? ""}`} {...props} />;
}

function LiveSERPSession({ query, initialUrl, onPageReady, onEditLocation, active = true, onBack, isBookmarked, onToggleBookmark, ...props }: LiveSERPProps) {
  const [pages, setPages] = useState<PageEntry[]>(() => [entry(0, query, initialUrl)]);
  const [index, setIndex] = useState(0);
  const sequence = useRef(0);
  const current = pages[index];
  const [findOpen, setFindOpen] = useState(false);
  const [findRequest, setFindRequest] = useState<IABFindRequest>({ query: "", index: 0, requestId: 0 });
  const [findResult, setFindResult] = useState<IABFindResult>({ query: "", total: 0, index: -1, requestId: 0 });
  const findSequence = useRef(0);
  const latestFindRequest = useRef(findRequest); latestFindRequest.current = findRequest;
  const changeFind = (text: string, match = 0) => {
    const requestId = ++findSequence.current;
    // Moving between known matches keeps the count and controls continuous while
    // the isolated document moves its highlight; a new query starts a new count.
    setFindResult(previous => previous.query === text && previous.total > 0
      ? { ...previous, index: ((match % previous.total) + previous.total) % previous.total, requestId }
      : { query: text, total: 0, index: -1, requestId });
    setFindRequest({ query: text, index: match, requestId });
  };
  const closeFind = () => { setFindOpen(false); changeFind(""); };
  useEffect(() => { if (!active) closeFind(); }, [active]);
  const found = useCallback((result: IABFindResult) => {
    if (result.requestId === latestFindRequest.current.requestId && result.query === latestFindRequest.current.query) setFindResult(result);
  }, []);
  const callback = useRef(onPageReady); callback.current = onPageReady;
  useEffect(() => { if (current.snapshot) callback.current?.(current.snapshot, current.id); }, [current.id, current.snapshot]);
  const onNavigate = (value: string) => {
    const url = resultDestination(value);
    if (!url || !active) return;
    closeFind();
    const search = bingSearchQuery(url);
    const id = ++sequence.current;
    setPages(items => [...items.slice(0, index + 1), entry(id, search ?? query, search ? undefined : url)]);
    setIndex(index + 1);
  };
  const updateLoad = useCallback((id: number, state: BingLoadState, attempt: number) => {
    setPages(items => items.map(item => item.id === id ? { ...item, load: { state, attempt } } : item));
  }, []);
  const ready = useCallback((id: number, snapshot: BingPageSnapshot) => {
    setPages(items => items.map(item => item.id === id ? { ...item, snapshot } : item));
  }, []);
  const sourceUrl = current.snapshot?.sourceUrl ?? current.url ?? bingSearchUrl(current.query);
  const bookmarkPage = { sourceUrl, title: current.snapshot?.title, faviconUrl: current.snapshot?.faviconUrl };
  const refresh = () => {
    closeFind();
    setPages(items => items.map(item => item.id === current.id ? {
      ...item, revision: item.revision + 1, url: item.url ? sourceUrl : undefined, snapshot: undefined, load: { state: "loading", attempt: 0 },
    } : item));
  };
  return <SERP {...props} active={active} query={current.url ? current.snapshot?.sourceUrl ?? current.url : current.query}
    pageUrl={sourceUrl} pageTitle={current.snapshot?.title} bookmarked={isBookmarked?.(sourceUrl)}
    onToggleBookmark={onToggleBookmark ? () => onToggleBookmark(bookmarkPage) : undefined} onRefresh={refresh}
    onFindOnPage={() => { changeFind(""); setFindOpen(true); }}
    find={findOpen ? { query: findRequest.query, total: findResult.total, index: findResult.index,
      onQueryChange: value => changeFind(value), onPrevious: () => changeFind(findRequest.query, findResult.index - 1),
      onNext: () => changeFind(findRequest.query, findResult.index + 1), onDismiss: closeFind } : undefined}
    onEditQuery={onEditLocation || props.onEditQuery ? () => { closeFind(); (onEditLocation ? () => onEditLocation(current.url ? current.snapshot?.sourceUrl ?? current.url : current.query) : props.onEditQuery)?.(); } : undefined}
    webPage={Boolean(current.url)} onBack={index > 0 ? () => { closeFind(); setIndex(index - 1); } : onBack}
    backLabel={index > 0 ? "Back" : props.backLabel} onForward={index < pages.length - 1 ? () => { closeFind(); setIndex(index + 1); } : undefined}
    loadState={current.load.state === "error" ? undefined : current.load.state}
    loadKey={`${current.id}:${current.revision}:${current.load.attempt}`} animateLoading
    webContent={<div className={styles.documents}>{pages.map((page, position) => <div key={page.id}
      className={`${styles.document} ${position !== index ? styles.inactive : ""}`} aria-hidden={position !== index || undefined}
      {...(position !== index ? { inert: "" } : {})}>
      <Document key={`${page.id}:${page.revision}`} page={page} active={active && position === index} onNavigate={onNavigate} onLoad={updateLoad} onReady={ready}
        findRequest={position === index ? findRequest : undefined} onFindResult={found} />
    </div>)}</div>} />;
}

function Document({ page, active, onNavigate, onLoad, onReady, findRequest, onFindResult }: { page: PageEntry; active: boolean; onNavigate: (url: string) => void;
  onLoad: (id: number, state: BingLoadState, attempt: number) => void; onReady: (id: number, snapshot: BingPageSnapshot) => void;
  findRequest?: IABFindRequest; onFindResult?: (result: IABFindResult) => void }) {
  const load = useCallback((state: BingLoadState, attempt: number) => onLoad(page.id, state, attempt), [page.id, onLoad]);
  const ready = useCallback((snapshot: BingPageSnapshot) => onReady(page.id, snapshot), [page.id, onReady]);
  // Keep the published snapshot transport until the free cloud stream is verified.
  // Local development exercises the live page without changing reference screens.
  const liveBrowser = !page.url && (import.meta.env.VITE_LIVE_BROWSER === "true"
    || (import.meta.env.MODE === "development" && import.meta.env.VITE_LIVE_BROWSER !== "false"));
  if (liveBrowser) return <LiveBrowserResults query={page.query} active={active} onNavigate={onNavigate} onLoadStateChange={load}
    onPageReady={ready} findRequest={findRequest} onFindResult={onFindResult} />;
  return <LiveBingResults query={page.query} url={page.url} active={active} onNavigate={onNavigate} onLoadStateChange={load} onPageReady={ready}
    findRequest={findRequest} onFindResult={onFindResult} />;
}
