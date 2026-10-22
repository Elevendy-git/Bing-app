import { useEffect, useRef, useState } from "react";
import type { AppSearchBoxLoadState } from "../../components/AppSearchBox/SearchBoxProgress";
import styles from "./LiveBingResults.module.css";

type Result = { query: string; html: string; fetchedAt: string; requestId: number };
export type BingLoadState = AppSearchBoxLoadState | "error";

export function LiveBingResults({ query, onLoadStateChange }: {
  query: string;
  onLoadStateChange?: (state: BingLoadState, attempt: number) => void;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const currentRequest = useRef(0);
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
    void fetch(`/api/bing-serp?${new URLSearchParams({ query })}`, { signal: controller.signal, credentials: "omit", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unavailable");
        const body: unknown = await response.json();
        if (!body || typeof body !== "object" || !("query" in body) || body.query !== query
          || !("html" in body) || typeof body.html !== "string" || !("fetchedAt" in body) || typeof body.fetchedAt !== "string") throw new Error("Invalid result");
        if (active && !controller.signal.aborted) {
          setResult({ ...body as Omit<Result, "requestId">, requestId });
          onLoadStateChange?.("rendering", attempt);
        }
      }).catch(fail).finally(() => clearTimeout(timeout));
    return () => { active = false; ++currentRequest.current; clearTimeout(timeout); controller.abort(); };
  }, [query, attempt, onLoadStateChange]);

  if (error) return <div className={styles.message} role="alert"><p>Couldn’t load results</p><button type="button" onClick={() => setAttempt((current) => current + 1)}>Try again</button></div>;
  if (!result || result.query !== query) return null;
  return <iframe className={styles.frame} title={`Bing results for ${query}`} srcDoc={result.html}
    onLoad={() => {
      if (currentRequest.current === result.requestId) onLoadStateChange?.("complete", attempt);
    }}
    onError={() => {
      if (currentRequest.current !== result.requestId) return;
      setError(true);
      onLoadStateChange?.("error", attempt);
    }}
    sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" {...{ credentialless: "" }}
    data-results-source="bing-mobile-html" data-fetched-at={result.fetchedAt} />;
}
