export interface SearchHistoryItem { id: string; query: string }

// C2 1039:29433 / 395:14844 specimens; Prototype supplies only submitted queries.
export const RECENT_SEARCHES: readonly SearchHistoryItem[] = [
  "Weather", "Weather forecast", "Weather today", "Weather hk", "Weather Nanning",
].map((query, index) => ({ id: `history-${index + 1}`, query }));
