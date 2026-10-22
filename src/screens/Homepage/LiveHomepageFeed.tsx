import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { FeedCard, type FeedCardItem, type FeedMoreOptionsHandler } from "../../components/FeedCard";
import { fetchMsnFeed, newsElapsedTime, type MsnFeed } from "../../services/msnFeed";
import styles from "./Homepage.module.css";
import liveStyles from "./LiveHomepageFeed.module.css";

export function LiveHomepageFeed({ scrollRef, active = true, onMoreOptions }: { scrollRef?: RefObject<HTMLDivElement>; active?: boolean; onMoreOptions?: FeedMoreOptionsHandler }) {
  const [feed, setFeed] = useState<MsnFeed | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now);
  const feedRef = useRef<MsnFeed | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const visited = useRef(new Set<string>());
  const emptyPages = useRef(0);
  const firstPageCount = useRef(0);

  const loadPage = useCallback(async (cursor?: string) => {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError(false);
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const data = await fetchMsnFeed(controller.signal, cursor);
      if (requestRef.current !== controller || controller.signal.aborted) return;
      const previous = feedRef.current;
      const ids = new Set(previous?.items.map(item => item.id));
      const urls = new Set(previous?.items.map(item => item.url));
      const added = data.items.filter(item => {
        if (ids.has(item.id) || urls.has(item.url)) return false;
        ids.add(item.id); urls.add(item.url);
        return true;
      });
      if (!previous) firstPageCount.current = added.length;
      if (cursor) visited.current.add(cursor);
      emptyPages.current = added.length ? 0 : emptyPages.current + 1;
      // A public feed can repeat an editorial fallback page. Don't manufacture
      // endless scrolling by recycling stories or retrying a cursor forever.
      const nextCursor = emptyPages.current >= 3 || (data.nextCursor && visited.current.has(data.nextCursor)) ? null : data.nextCursor;
      const merged = { ...data, items: [...(previous?.items ?? []), ...added], nextCursor };
      feedRef.current = merged;
      setFeed(merged);
      setNow(Date.now());
    } catch {
      if (requestRef.current === controller) setError(true);
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) { requestRef.current = null; setLoading(false); }
    }
  }, []);

  useEffect(() => {
    void loadPage();
    return () => { requestRef.current?.abort(); requestRef.current = null; };
  }, [loadPage]);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const cursor = feed?.nextCursor;
    if (!sentinel || !cursor || !active || loading || error) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void loadPage(cursor);
    }, { root: scrollRef?.current ?? null, rootMargin: "0px 0px 900px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feed?.nextCursor, active, loading, error, loadPage, scrollRef]);
  useEffect(() => {
    if (!feed) return;
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [feed]);

  const cards = feed?.items.map(item => ({ ...item, elapsedTime: newsElapsedTime(item.publishedAt, now) }));
  const card = (item: FeedCardItem & { id: string }) => <FeedCard key={item.id} {...item}
    onMoreOptions={onMoreOptions}
    className={styles.feedCard} mediaAspectRatio={312 / 172} />;
  const carousel = cards?.slice(1, Math.min(firstPageCount.current, 6)) ?? [];
  return <section className={styles.feed} aria-label="Home feed" aria-busy={loading}
    data-feed-source="msn" data-fetched-at={feed?.fetchedAt} data-article-count={cards?.length ?? 0}>
    {cards ? <>
      {card(cards[0])}
      {carousel.length > 1 ? <FeedCard key={carousel.map(item => item.id).join("-")} {...carousel[0]} slides={carousel}
        onMoreOptions={onMoreOptions}
        variant="multi" className={styles.feedCard} mediaAspectRatio={312 / 172} /> : carousel.map(card)}
      {cards.slice(1 + carousel.length).map(card)}
    </> : null}
    {loading && Array.from({ length: feed ? 1 : 3 }, (_, index) => <FeedCard key={`loading-${index}`} variant="loading"
      className={styles.feedCard} mediaAspectRatio={312 / 172} />)}
    {error && <div className={liveStyles.message} role="status">
      <p>{feed ? "More news couldn’t load" : "News couldn’t load"}</p>
      <button type="button" onClick={() => void loadPage(feed?.nextCursor ?? undefined)}>Try again</button>
    </div>}
    {feed && !feed.nextCursor && !loading && <p className={liveStyles.end} role="status">You’re all caught up</p>}
    <div ref={sentinelRef} className={liveStyles.sentinel} aria-hidden="true" />
  </section>;
}
