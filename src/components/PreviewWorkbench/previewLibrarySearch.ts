import { PREVIEW_LIBRARY_CATEGORIES, type PreviewComponentGroup } from "./previewTypes";

const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Match every query word across a component and its variant; preserve registration order. */
export function filterLibraryGroups(groups: readonly PreviewComponentGroup[], query: string): readonly PreviewComponentGroup[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return groups;
  const matches = (value: string) => {
    const text = normalize(value);
    const compact = text.replace(/\s/g, "");
    return terms.every((term) => text.includes(term) || compact.includes(term));
  };

  return groups.flatMap((group) => {
    const category = PREVIEW_LIBRARY_CATEGORIES.find(({ id }) => id === group.category)?.label ?? "";
    const groupText = `${group.title} ${group.id} ${category}`;
    if (matches(groupText)) return [group];
    const items = group.items.filter((item) => matches(`${groupText} ${item.title} ${item.id} ${(item.keywords ?? []).join(" ")}`));
    return items.length ? [{ ...group, items }] : [];
  });
}
