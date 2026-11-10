import { useEffect, useRef, useState } from "react";
import type { AppSearchBoxLoadState } from "../../components/AppSearchBox/SearchBoxProgress";
import { publicApiUrl } from "../../services/apiUrl";
import { bingPageIdentity, type BingPageSnapshot } from "../../services/bingPage";
import { resultDestination, webUrl, withIABNavigation, type IABFindRequest, type IABFindResult } from "../../services/webNavigation";
import styles from "./LiveBingResults.module.css";

type Result = Omit<BingPageSnapshot, "viewportWidth" | "viewportHeight"> & { query: string; requestId: number };
export type BingLoadState = AppSearchBoxLoadState | "error";

export function LiveBingResults({ query, url, active = true, onNavigate, onLoadStateChange, onPageReady, findRequest, onFindResult }: {
  query: string;
  url?: string;
  active?: boolean;
  onNavigate?: (url: string) => void;
  onLoadStateChange?: (state: BingLoadState, attempt: number) => void;
  onPageReady?: (snapshot: BingPageSnapshot) => void;
  findRequest?: IABFindRequest;
  onFindResult?: (result: IABFindResult) => void;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const currentRequest = useRef(0);
  const publishedRequest = useRef<number>();
  const frame = useRef<HTMLIFrameElement>(null);
  const [instanceChannel] = useState(() => crypto.randomUUID());
  const channel = `${instanceChannel}-${result?.requestId ?? 0}`;
  const [readyRequest, setReadyRequest] = useState<{ requestId: number } | null>(null);
  const postedFindRequest = useRef<(IABFindRequest & { channel: string }) | null>(null);
  const latestFindRequest = useRef(findRequest);
  latestFindRequest.current = findRequest;
  const bridgeEnabled = Boolean(onNavigate || onFindResult || findRequest);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!active || !result || result.requestId !== currentRequest.current || event.source !== frame.current?.contentWindow
        || !event.data || event.data.channel !== channel) return;
      if (event.data.type === "bing-iab-navigate" && typeof event.data.url === "string") {
        const destination = webUrl(event.data.url, result.sourceUrl);
        if (destination) onNavigate?.(resultDestination(destination) ?? destination);
      } else if (event.data.type === "bing-iab-find-result" && event.origin === "null" && readyRequest?.requestId === result.requestId) {
        const data = event.data, latest = latestFindRequest.current, posted = postedFindRequest.current;
        if (!latest || !posted || posted.channel !== channel || !Number.isSafeInteger(data.requestId) || data.requestId < 0
          || data.requestId !== latest.requestId || data.requestId !== posted.requestId
          || data.query !== latest.query || data.query !== posted.query || !Number.isSafeInteger(data.total) || data.total < 0
          || !Number.isSafeInteger(data.index) || (data.total === 0 ? data.index !== -1 : data.index < 0 || data.index >= data.total)) return;
        onFindResult?.({ query: data.query, total: data.total, index: data.index, requestId: data.requestId });
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [active, channel, result, readyRequest, onNavigate, onFindResult]);
  useEffect(() => {
    if (!bridgeEnabled || !result || result.requestId !== currentRequest.current || readyRequest?.requestId !== result.requestId) return;
    if (!active || !findRequest) {
      postedFindRequest.current = null;
      frame.current?.contentWindow?.postMessage({ type: "bing-iab-find-clear", channel }, "*");
      return;
    }
    postedFindRequest.current = { ...findRequest, channel };
    // A sandboxed document has an opaque origin; only the recipient needs "*".
    // The bridge still authenticates this app's source, concrete origin and channel.
    frame.current?.contentWindow?.postMessage({ type: "bing-iab-find", channel, ...findRequest }, "*");
  }, [active, bridgeEnabled, channel, findRequest, readyRequest, result]);
  useEffect(() => {
    const requestId = ++currentRequest.current;
    const controller = new AbortController();
    let active = true;
    setResult(null);
    setReadyRequest(null);
    postedFindRequest.current = null;
    setError(false);
    onLoadStateChange?.("loading", attempt);
    const fail = () => {
      if (!active) return;
      setError(true);
      onLoadStateChange?.("error", attempt);
    };
    const timeout = setTimeout(() => { controller.abort(); fail(); }, 10000);
    const load = async () => fetch(publicApiUrl(url ? `/api/web-page?${new URLSearchParams({ url })}` : `/api/bing-serp?${new URLSearchParams({ query })}`), {
      signal: controller.signal, credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", headers: { Accept: "application/json" },
    });
    void load()
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
    srcDoc={bridgeEnabled ? withIABNavigation(result.html, channel, window.location.origin) : result.html}
    onLoad={(event) => {
      if (currentRequest.current !== result.requestId) return;
      // A document reload can keep this iframe and fetched result; resend pending find.
      setReadyRequest({ requestId: result.requestId });
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
    sandbox={bridgeEnabled ? "allow-scripts" : ""} referrerPolicy="no-referrer" {...{ credentialless: "" }}
    data-results-source={url ? "web-page-html" : "bing-mobile-html"} data-fetched-at={result.fetchedAt} />;
}
