import { useEffect, useState } from "react";
import { AppList, AppListCard } from "../../components/AppList";
import { SEARCH_SUGGESTION_LIMIT, type SearchSuggestion } from "../../services/searchSuggestions";
import type { SuggestionDataSource } from "./useSearchSuggestions";
import styles from "./Search.module.css";

/** Data-driven AS rows shared by live input and passive Key screen presets. */
export function SearchSuggestions({ query, items, source, onSelect, onRetry, className }: {
  query: string;
  items: readonly SearchSuggestion[];
  source: SuggestionDataSource;
  onSelect?: (query: string) => void;
  onRetry?: () => void;
  className?: string;
}) {
  const suggestions = items.slice(0, SEARCH_SUGGESTION_LIMIT);
  const [delayedQuery, setDelayedQuery] = useState<string | null>(null);
  useEffect(() => {
    if (!query.trim() || suggestions.length || source !== "loading") { setDelayedQuery(null); return; }
    const timer = setTimeout(() => setDelayedQuery(query), 1000);
    return () => clearTimeout(timer);
  }, [query, suggestions.length, source]);
  const loading = source === "loading" && delayedQuery === query;
  if (!query.trim() || (!suggestions.length && source !== "fallback" && !loading)) return null;
  return <div className={`${styles.cardInset} ${styles.suggestions} ${className ?? ""}`} data-suggestions-source={source} aria-busy={source === "loading"}
    onPointerDown={onSelect ? event => event.preventDefault() : undefined}>
    <AppListCard ariaLabel="Search suggestions" className={styles.listCard}>
      {!suggestions.length && <div className={styles.suggestionStatus} role={source === "fallback" ? "alert" : "status"}>
        <p>{source === "fallback" ? "Suggestions couldn’t load" : "Loading suggestions…"}</p>
        {source === "fallback" && onRetry && <button type="button" onClick={onRetry}>Try again</button>}
      </div>}
      {suggestions.map((item, index) => <AppList key={item.query} variant="as" title={item.query} autocompleteQuery={query}
        suggestionSource={item.source} rightLogoSrc={item.logoUrl} showDivider={index < suggestions.length - 1}
        onClick={onSelect ? () => onSelect(item.query) : undefined} />)}
    </AppListCard>
  </div>;
}
