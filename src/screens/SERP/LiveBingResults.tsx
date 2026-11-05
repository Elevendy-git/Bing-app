import { useEffect, useRef, useState } from "react";
import type { AppSearchBoxLoadState } from "../../components/AppSearchBox/SearchBoxProgress";
import { bingPageIdentity, type BingPageSnapshot } from "../../services/bingPage";
import { resultDestination, webUrl, withIABNavigation } from "../../services/webNavigation";
import styles from "./LiveBingResults.module.css";

type Result = Omit<BingPageSnapshot, "viewportWidth" | "viewportHeight"> & { query: string; requestId: number };
export type BingLoadState = AppSearchBoxLoadState | "error";

export function LiveBingResults({ query, url, active = true, onNavigate, onLoadStateChange, onPageReady }: {
  query: string;
  url?: string;
  active?: boolean;
  onNavigate?: (url: string) => void;
  onLoadStateChange?: (state: BingLoadState, attempt: number) => void;
  onPageReady?: (snapshot: BingPageSnapshot) => void;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const currentRequest = useRef(0);
  const publishedRequest = useRef<number>();
  const frame = useRef<HTMLIFrameElement>(null);
  const [channel] = useState(() => crypto.randomUUID());
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!active || !result || event.source !== frame.current?.contentWindow || !event.data || event.data.type !== "bing-iab-navigate"
        || event.data.channel !== channel || typeof event.data.url !== "string") return;
      const destination = webUrl(event.data.url, result.sourceUrl);
      if (destination) onNavigate?.(resultDestination(destination) ?? destination);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [active, channel, result, onNavigate]);
  useEffect(() => {
    const requestId = ++currentRequest.current;
    const controller = new AbortController();
    let active = true;
    setResult(null);
    setError(false);
    onLoadStateChange?.("loading", attempt);
    const fail = () => {
      if (!active) return;
      setError(true);
      onLoadStateChange?.("error", attempt);
    };
    const timeout = setTimeout(() => { controller.abort(); fail(); }, 10000);
    void fetch(url ? `/api/web-page?${new URLSearchParams({ url })}` : `/api/bing-serp?${new URLSearchParams({ query })}`, { signal: controller.signal, credentials: "omit", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unavailable");
        const body: unknown = await response.json();
        if (!body || typeof body !== "object" || (url ? !("requestedUrl" in body) || body.requestedUrl !== url : !("query" in body) || body.query !== query)
          || !("html" in body) || typeof body.html !== "string" || !("fetchedAt" in body) || typeof body.fetchedAt !== "string") throw new Error("Invalid result");
        if (active && !controller.signal.aborted) {
          const identity = url ? { sourceUrl: "sourceUrl" in body && typeof body.sourceUrl === "string" ? webUrl(body.sourceUrl) : null,
            faviconUrl: "faviconUrl" in body && typeof body.faviconUrl === "string" ? webUrl(body.faviconUrl) : null }
            : bingPageIdentity(query, "sourceUrl" in body ? body.sourceUrl : undefined, "faviconUrl" in body ? body.faviconUrl : undefined);
          if (!identity.sourceUrl) throw new Error("Invalid page URL");
          setResult({ html: body.html, fetchedAt: body.fetchedAt, query, requestId, ...identity, sourceUrl: identity.sourceUrl,
            title: "title" in body && typeof body.title === "string" ? body.title : undefined });
          onLoadStateChange?.("rendering", attempt);
        }
      }).catch(fail).finally(() => clearTimeout(timeout));
    return () => { active = false; ++currentRequest.current; clearTimeout(timeout); controller.abort(); };
  }, [query, url, attempt, onLoadStateChange]);

  if (error) return <div className={styles.message} role="alert"><p>{url ? "This page can’t be previewed" : "Couldn’t load results"}</p>
    {url && <p className={styles.explanation}>You can try again or go back to your results.</p>}
    <button type="button" onClick={() => setAttempt((current) => current + 1)}>Try again</button></div>;
  if (!result || result.query !== query) return null;
  return <iframe ref={frame} className={styles.frame} title={url ? `Web page: ${url}` : `Bing results for ${query}`}
    srcDoc={onNavigate ? withIABNavigation(result.html, channel, window.location.origin) : result.html}
    onLoad={(event) => {
      if (currentRequest.current !== result.requestId) return;
      onLoadStateChange?.("complete", attempt);
      if (publishedRequest.current === result.requestId) return;
      publishedRequest.current = result.requestId;
      onPageReady?.({ html: result.html, ...(result.title ? { title: result.title } : {}), sourceUrl: result.sourceUrl, faviconUrl: result.faviconUrl, fetchedAt: result.fetchedAt,
        viewportWidth: event.currentTarget.clientWidth || 402, viewportHeight: event.currentTarget.clientHeight || 668 });
    }}
    onError={() => {
      if (currentRequest.current !== result.requestId) return;
      setError(true);
      onLoadStateChange?.("error", attempt);
    }}
    sandbox={onNavigate ? "allow-scripts" : ""} referrerPolicy="no-referrer" {...{ credentialless: "" }}
    data-results-source={url ? "web-page-html" : "bing-mobile-html"} data-fetched-at={result.fetchedAt} />;
}
