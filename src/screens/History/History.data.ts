import { RECENT_SITES } from "../Recent/Recent.data";
import type { HistoryEntry } from "../activity/types";
export type { HistoryEntry } from "../activity/types";

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
