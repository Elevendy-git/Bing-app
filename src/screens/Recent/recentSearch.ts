import type { RecentEntry, RecentTab } from "./Recent.data";

const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase().trim().replace(/\s+/g, " ");

/** Match user-facing titles and decoded URLs, including queries with multiple words. */
export function matchesRecentQuery(query: string, ...values: (string | undefined)[]): boolean {
  const terms = normalize(query).split(" ").filter(Boolean);
  const searchable = normalize(values.filter(Boolean).map(value => {
    // '+' means a space in URL queries, but is literal in titles such as C++.
    if (!/^https?:\/\//i.test(value!)) return value!;
    try { return decodeURIComponent(value!.replace(/\+/g, " ")); }
    catch { return value!; }
  }).join(" "));
  return terms.every(term => searchable.includes(term));
}

export const filterRecentTabs = (tabs: readonly RecentTab[], query: string) =>
  tabs.filter(tab => matchesRecentQuery(query, tab.title, tab.query, tab.pageSnapshot?.sourceUrl));

export const filterRecentEntries = (entries: readonly RecentEntry[], query: string) =>
  entries.filter(entry => matchesRecentQuery(query, entry.title, entry.subtitle));
