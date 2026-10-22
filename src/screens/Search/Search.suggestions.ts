import { normalizeSearchQuery, SEARCH_SUGGESTION_LIMIT, type SearchSuggestion } from "../../services/searchSuggestions";

// Design fixtures only: these are not the user's actual search history.
const PREVIEW_SUGGESTIONS: readonly SearchSuggestion[] = [
  { query: "Weather", source: "prediction" },
  { query: "Weather forecast", source: "history", logoUrl: new URL("./assets/airbnb.svg", import.meta.url).href },
  { query: "Weather today", source: "history" },
  { query: "Weather hk", source: "prediction", logoUrl: new URL("./assets/nbc.svg", import.meta.url).href },
  { query: "Weather nanning", source: "prediction" },
  { query: "Weather forecast today", source: "prediction" },
  { query: "Weather forecast tomorrow", source: "prediction" },
  { query: "Weather forecast this week", source: "prediction" },
  { query: "Weather forecast 10 days", source: "prediction" },
  { query: "天气", source: "prediction" },
  { query: "天气预报", source: "prediction" },
  { query: "天气预报今天", source: "prediction" },
  { query: "天气预报明天", source: "prediction" },
  { query: "天气预报一周", source: "prediction" },
];

/** Fixed workbench design previews. Interactive Prototype uses the live provider. */
export function getPreviewSearchSuggestions(input: string): SearchSuggestion[] {
  const query = normalizeSearchQuery(input);
  if (!query) return [];
  const normalized = query.toLowerCase();
  const matches = PREVIEW_SUGGESTIONS.filter((item) => item.query.toLowerCase().startsWith(normalized));
  const completions = /^\d+$/.test(query)
    ? [" meaning", " angel number", " in binary", " in words"]
    : /\p{Script=Han}/u.test(query)
      ? ["是什么", "最新消息", "相关图片", "详细介绍"]
      : [" meaning", " latest news", " images", " videos"];
  const candidates: SearchSuggestion[] = [
    ...matches,
    { query, source: "prediction" },
    ...completions.map((suffix): SearchSuggestion => ({ query: `${query}${suffix}`, source: "prediction" })),
  ];
  const seen = new Set<string>();
  return candidates.filter((item) => {
    const key = item.query.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, SEARCH_SUGGESTION_LIMIT);
}
