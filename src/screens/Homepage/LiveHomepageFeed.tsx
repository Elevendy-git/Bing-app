import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { FeedCard, type FeedCardItem, type FeedMoreOptionsHandler, type FeedArticleOpenHandler } from "../../components/FeedCard";
import { fetchMsnFeed, newsElapsedTime, type MsnFeed } from "../../services/msnFeed";
import { awaitPublicApiReady } from "../../services/publicApiReady";
import styles from "./Homepage.module.css";
import liveStyles from "./LiveHomepageFeed.module.css";

const REFRESH_AFTER_MS = 5 * 60_000;
// Refresh in the hero, before the user is reading an article. Never move scrollTop.
const REFRESH_TOP_LIMIT = 32;
type FeedRequest = { kind: "initial" | "refresh" } | { kind: "more"; cursor: string };

function uniqueArticles(data: MsnFeed, previous?: MsnFeed | null) {
  const ids = new Set(previous?.items.map(item => item.id));
  const urls = new Set(previous?.items.map(item => item.url));
  return data.items.filter(item => {
    if (ids.has(item.id) || urls.has(item.url)) return false;
    ids.add(item.id); urls.add(item.url);
    return true;
  });
}

export function LiveHomepageFeed({ scrollRef, active = true, onMoreOptions, onOpenArticle }: {
  scrollRef?: RefObject<HTMLDivElement>; active?: boolean; onMoreOptions?: FeedMoreOptionsHandler; onOpenArticle?: FeedArticleOpenHandler;
}) {
  const [feed, setFeed] = useState<MsnFeed | null>(null);
  const [error, setError] = useState<FeedRequest | null>(null);
  const [loading, setLoading] = useState<FeedRequest | null>({ kind: "initial" });
  const [now, setNow] = useState(Date.now);
  const feedRef = useRef<MsnFeed | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const visited = useRef(new Set<string>());
  const emptyPages = useRef(0);
  const firstPageCount = useRef(0);
  const firstPageReadAt = useRef(0);
  const pendingFirstPage = useRef<{ data: MsnFeed; receivedAt: number } | null>(null);
  const failedRequest = useRef<FeedRequest | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const checkRefresh = useRef<() => void>(() => {});

  const canReplaceFirstPage = useCallback(() => activeRef.current && document.visibilityState !== "hidden"
    && !scrollRef?.current?.closest("[hidden], [inert]")
    && (scrollRef?.current?.scrollTop ?? 0) <= REFRESH_TOP_LIMIT, [scrollRef]);

  const replaceFirstPage = useCallback((data: MsnFeed, receivedAt: number) => {
    const items = uniqueArticles(data);
    const next = { ...data, items };
    visited.current.clear();
    emptyPages.current = 0;
    firstPageCount.current = items.length;
    firstPageReadAt.current = receivedAt;
    pendingFirstPage.current = null;
    feedRef.current = next;
    setFeed(next);
    setNow(Date.now());
  }, []);

  const loadPage = useCallback(async (request: FeedRequest) => {
    if (requestRef.current) return;
    // A disconnected observer can still deliver a queued old intersection.
    if (request.kind === "more" && (!activeRef.current || pendingFirstPage.current
      || request.cursor !== feedRef.current?.nextCursor)) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(request);
    failedRequest.current = null;
    setError(null);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (import.meta.env.VITE_API_BASE_URL?.trim()) await awaitPublicApiReady(controller.signal);
      if (requestRef.current !== controller || controller.signal.aborted) return;
      timeout = setTimeout(() => controller.abort(), 10000);
      const cursor = request.kind === "more" ? request.cursor : undefined;
      const data = await fetchMsnFeed(controller.signal, cursor);
      if (requestRef.current !== controller || controller.signal.aborted) return;
      if (request.kind !== "more") {
        const receivedAt = Date.now();
        if (request.kind === "initial" || canReplaceFirstPage()) replaceFirstPage(data, receivedAt);
        else pendingFirstPage.current = { data, receivedAt };
        return;
      }
      const previous = feedRef.current;
      const added = uniqueArticles(data, previous);
      visited.current.add(request.cursor);
      emptyPages.current = added.length ? 0 : emptyPages.current + 1;
      // A public feed can repeat an editorial fallback page. Don't manufacture
      // endless scrolling by recycling stories or retrying a cursor forever.
      const nextCursor = emptyPages.current >= 3 || (data.nextCursor && visited.current.has(data.nextCursor)) ? null : data.nextCursor;
      const merged = { ...data, items: [...(previous?.items ?? []), ...added], nextCursor };
      feedRef.current = merged;
      setFeed(merged);
      setNow(Date.now());
    } catch {
      if (requestRef.current === controller) {
        failedRequest.current = request;
        setError(request);
      }
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(null);
        // A continuation can finish after the user has returned to the hero.
        checkRefresh.current();
      }
    }
  }, [canReplaceFirstPage, replaceFirstPage]);

  const refreshIfNeeded = useCallback(() => {
    if (!feedRef.current || requestRef.current || failedRequest.current?.kind === "refresh" || !canReplaceFirstPage()) return;
    const pending = pendingFirstPage.current;
    if (pending) {
      if (Date.now() - pending.receivedAt < REFRESH_AFTER_MS) {
        replaceFirstPage(pending.data, pending.receivedAt);
        return;
      }
      pendingFirstPage.current = null;
    }
    if (Date.now() - firstPageReadAt.current >= REFRESH_AFTER_MS) void loadPage({ kind: "refresh" });
  }, [canReplaceFirstPage, loadPage, replaceFirstPage]);
  checkRefresh.current = refreshIfNeeded;

  useEffect(() => {
    void loadPage({ kind: "initial" });
    return () => { requestRef.current?.abort(); requestRef.current = null; };
  }, [loadPage]);
  useEffect(() => {
    refreshIfNeeded();
    const scrollElement = scrollRef?.current;
    window.addEventListener("focus", refreshIfNeeded);
    document.addEventListener("visibilitychange", refreshIfNeeded);
    scrollElement?.addEventListener("scroll", refreshIfNeeded, { passive: true });
    const timer = setInterval(() => { setNow(Date.now()); refreshIfNeeded(); }, 60_000);
    return () => {
      window.removeEventListener("focus", refreshIfNeeded);
      document.removeEventListener("visibilitychange", refreshIfNeeded);
      scrollElement?.removeEventListener("scroll", refreshIfNeeded);
      clearInterval(timer);
    };
  }, [active, refreshIfNeeded, scrollRef]);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const cursor = feed?.nextCursor;
    if (!sentinel || !cursor || !active || loading || error || pendingFirstPage.current) return;
    const observer = new IntersectionObserver(entries => {
      if (!pendingFirstPage.current && entries.some(entry => entry.isIntersecting)) void loadPage({ kind: "more", cursor });
    }, { root: scrollRef?.current ?? null, rootMargin: "0px 0px 900px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feed, active, loading, error, loadPage, scrollRef]);

  const cards = feed?.items.map(item => ({ ...item, elapsedTime: newsElapsedTime(item.publishedAt, now) }));
  const card = (item: FeedCardItem & { id: string }, eager = false) => <FeedCard key={item.id} {...item}
    onMoreOptions={onMoreOptions} onOpenArticle={onOpenArticle}
    className={styles.feedCard} mediaAspectRatio={312 / 172} imageLoading={eager ? "eager" : "lazy"} />;
  const carousel = cards?.slice(1, Math.min(firstPageCount.current, 6)) ?? [];
  return <section className={styles.feed} aria-label="Home feed" aria-busy={Boolean(loading)}
    data-feed-source="msn" data-fetched-at={feed?.fetchedAt} data-article-count={cards?.length ?? 0}>
    {cards?.length ? <>
      {card(cards[0], true)}
      {carousel.length > 1 ? <FeedCard key={carousel.map(item => item.id).join("-")} {...carousel[0]} slides={carousel}
        onMoreOptions={onMoreOptions} onOpenArticle={onOpenArticle}
        variant="multi" className={styles.feedCard} mediaAspectRatio={312 / 172} imageLoading="lazy" /> : carousel.map(item => card(item))}
      {cards.slice(1 + carousel.length).map(item => card(item))}
    </> : null}
    {loading && loading.kind !== "refresh" && Array.from({ length: feed ? 1 : 3 }, (_, index) => <FeedCard key={`loading-${index}`} variant="loading"
      className={styles.feedCard} mediaAspectRatio={312 / 172} />)}
    {error && <div className={liveStyles.message} role="status">
      <p>{error.kind === "refresh" ? "News couldn’t refresh" : feed ? "More news couldn’t load" : "News couldn’t load"}</p>
      <button type="button" onClick={() => void loadPage(error)}>Try again</button>
    </div>}
    {feed && !feed.nextCursor && !loading && <p className={liveStyles.end} role="status">You’re all caught up</p>}
    <div ref={sentinelRef} className={liveStyles.sentinel} aria-hidden="true" />
  </section>;
}
