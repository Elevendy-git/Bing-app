import { useCallback, useEffect, useRef, useState } from "react";
import { LiveBingResults, type BingLoadState } from "./LiveBingResults";
import { SERP, type SERPProps } from "./SERP";
import { bingSearchQuery, type BingPageSnapshot } from "../../services/bingPage";
import { resultDestination } from "../../services/webNavigation";
import styles from "./LiveBingResults.module.css";

type LiveSERPProps = Omit<SERPProps, "webContent" | "loadState" | "loadKey" | "animateLoading"> & {
  query: string;
  initialUrl?: string;
  onEditLocation?: (value: string) => void;
  onPageReady?: (snapshot: BingPageSnapshot, navigationId: number) => void;
};
interface PageEntry { id: number; query: string; url?: string; snapshot?: BingPageSnapshot; load: { state: BingLoadState; attempt: number } }
const entry = (id: number, query: string, url?: string): PageEntry => ({ id, query, url, load: { state: "loading", attempt: 0 } });

/** Every app tab owns its navigation stack and keeps its visited documents mounted. */
export function LiveSERP(props: LiveSERPProps) {
  return <LiveSERPSession key={`${props.query}:${props.initialUrl ?? ""}`} {...props} />;
}

function LiveSERPSession({ query, initialUrl, onPageReady, onEditLocation, active = true, onBack, ...props }: LiveSERPProps) {
  const [pages, setPages] = useState<PageEntry[]>(() => [entry(0, query, initialUrl)]);
  const [index, setIndex] = useState(0);
  const sequence = useRef(0);
  const current = pages[index];
  const callback = useRef(onPageReady); callback.current = onPageReady;
  useEffect(() => { if (current.snapshot) callback.current?.(current.snapshot, current.id); }, [current.id, current.snapshot]);
  const onNavigate = (value: string) => {
    const url = resultDestination(value);
    if (!url || !active) return;
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
  return <SERP {...props} active={active} query={current.url ? current.snapshot?.sourceUrl ?? current.url : current.query}
    onEditQuery={onEditLocation ? () => onEditLocation(current.url ? current.snapshot?.sourceUrl ?? current.url : current.query) : props.onEditQuery}
    webPage={Boolean(current.url)} onBack={index > 0 ? () => setIndex(index - 1) : onBack}
    backLabel={index > 0 ? "Back" : props.backLabel} onForward={index < pages.length - 1 ? () => setIndex(index + 1) : undefined}
    loadState={current.load.state === "error" ? undefined : current.load.state}
    loadKey={`${current.id}:${current.load.attempt}`} animateLoading
    webContent={<div className={styles.documents}>{pages.map((page, position) => <div key={page.id}
      className={`${styles.document} ${position !== index ? styles.inactive : ""}`} aria-hidden={position !== index || undefined}
      {...(position !== index ? { inert: "" } : {})}>
      <Document page={page} active={active && position === index} onNavigate={onNavigate} onLoad={updateLoad} onReady={ready} />
    </div>)}</div>} />;
}

function Document({ page, active, onNavigate, onLoad, onReady }: { page: PageEntry; active: boolean; onNavigate: (url: string) => void;
  onLoad: (id: number, state: BingLoadState, attempt: number) => void; onReady: (id: number, snapshot: BingPageSnapshot) => void }) {
  const load = useCallback((state: BingLoadState, attempt: number) => onLoad(page.id, state, attempt), [page.id, onLoad]);
  const ready = useCallback((snapshot: BingPageSnapshot) => onReady(page.id, snapshot), [page.id, onReady]);
  return <LiveBingResults query={page.query} url={page.url} active={active} onNavigate={onNavigate} onLoadStateChange={load} onPageReady={ready} />;
}
