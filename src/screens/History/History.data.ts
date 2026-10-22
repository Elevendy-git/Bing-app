import { RECENT_SITES, type RecentEntry } from "../Recent/Recent.data";

export interface HistoryEntry extends RecentEntry {
  groupId: string;
  groupLabel: string;
  /** Real Prototype visits are regrouped by their local date when History is rendered. */
  visitedAt?: number;
}

/** Supplied browsing-history fixtures; each visit has its own identity. */
export const HISTORY_ENTRIES: readonly HistoryEntry[] = [
  { id: "today", label: "Today" },
  { id: "two-days", label: "2 days ago" },
  { id: "jul-28", label: "Jul 28, 2025" },
].flatMap(group => RECENT_SITES.map(site => ({
  ...site, id: `${group.id}-${site.id}`, groupId: group.id, groupLabel: group.label,
})));

export function groupHistory(entries: readonly HistoryEntry[]) {
  const groups: { id: string; label: string; entries: HistoryEntry[] }[] = [];
  for (const entry of entries) {
    const date = entry.visitedAt === undefined ? null : new Date(entry.visitedAt);
    const id = date?.toDateString() ?? entry.groupId;
    const label = date ? (id === new Date().toDateString() ? "Today"
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : entry.groupLabel;
    let group = groups.find(item => item.id === id);
    if (!group) { group = { id, label, entries: [] }; groups.push(group); }
    group.entries.push(entry);
  }
  return groups;
}
