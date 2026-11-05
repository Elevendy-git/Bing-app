import type { SearchSuggestion } from "../../services/searchSuggestions";

/** Use this query's provider results, never unrelated retained AS or invented words. */
export function keyboardSuggestions(input: string, result: { query: string; source: string; items: readonly SearchSuggestion[] }): readonly [string, string, string] {
  const query = input.trim().replace(/\s+/g, " ");
  if (!query) return ["", "", ""];
  const current = query.toLocaleLowerCase();
  const seen = new Set([current]);
  const completions = (result.source === "live" || result.source === "preview") && result.query.toLocaleLowerCase() === current
    ? result.items.filter(item => {
      const key = item.query.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 2).map(item => item.query) : [];
  return [input, completions[0] ?? "", completions[1] ?? ""];
}
