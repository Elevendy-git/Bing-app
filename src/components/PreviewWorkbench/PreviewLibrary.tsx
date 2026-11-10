import { useId, useRef, useState, type ReactNode } from "react";
import type { PreviewTheme } from "./PhonePreview";
import { PreviewLibraryNavigation } from "./PreviewLibraryNavigation";
import { PreviewLibraryGroup } from "./PreviewLibraryGroup";
import { PREVIEW_LIBRARY_CATEGORIES, type PreviewComponentGroup, type PreviewLibrarySelection } from "./previewTypes";
import { filterLibraryGroups } from "./previewLibrarySearch";
import styles from "./PreviewWorkbench.module.css";

export function PreviewLibrary({ groups, theme, navigationHeader }: {
  groups: readonly PreviewComponentGroup[];
  theme: PreviewTheme;
  navigationHeader?: ReactNode;
}) {
  const [selection, setSelection] = useState<PreviewLibrarySelection>({ kind: "all" });
  const [query, setQuery] = useState("");
  const galleryRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsId = useId();
  const searching = query.trim().length > 0;
  const orderedGroups = PREVIEW_LIBRARY_CATEGORIES.flatMap((category) => groups.filter((group) => group.category === category.id))
    .filter((group) => group.items.length > 0);
  const matchedGroups = filterLibraryGroups(orderedGroups, query);
  const selectedGroup = selection.kind === "group" ? matchedGroups.find((group) => group.id === selection.id) : undefined;
  const selectedCategory = PREVIEW_LIBRARY_CATEGORIES.find((category) => category.id === (
    selection.kind === "category" ? selection.id : selectedGroup?.category
  ));
  const visibleGroups = matchedGroups
    .filter((group) => selection.kind === "all" || (
      selection.kind === "category" ? group.category === selection.id : group.id === selection.id
    ));
  const title = selectedGroup?.title ?? selectedCategory?.label ?? (searching ? "Search results" : "Library");
  const previewCount = visibleGroups.reduce((count, group) => count + group.items.length, 0);

  const select = (next: PreviewLibrarySelection) => {
    setSelection(next);
    if (galleryRef.current) galleryRef.current.scrollTop = 0;
  };

  const search = (value: string) => {
    setQuery(value);
    select({ kind: "all" });
  };
  const clearSearch = () => {
    search("");
    searchRef.current?.focus();
  };

  return (
    <section className={styles.library} aria-label="Component library">
      <PreviewLibraryNavigation groups={matchedGroups} selection={selection} onSelect={select}
        query={query} onSearch={search} onClearSearch={clearSearch} searchRef={searchRef} resultsId={resultsId}
        navigationHeader={navigationHeader} />
      <div ref={galleryRef} id={resultsId} className={styles.gallery}>
        <div className={styles.libraryContent}>
          <header className={styles.libraryHeading}>
            <h1>{title}</h1>
            {searching && <p className={styles.librarySearchStatus} role="status">
              {visibleGroups.length} {visibleGroups.length === 1 ? "component" : "components"} · {previewCount} {previewCount === 1 ? "preview" : "previews"}
            </p>}
          </header>
          {visibleGroups.map((group) => (
            <PreviewLibraryGroup key={group.id} group={group} theme={theme} showTitle={selection.kind !== "group"} />
          ))}
          {visibleGroups.length === 0 && (
            <div className={styles.emptyState}>
              <p>{searching ? `No results for “${query.trim()}”.` : groups.length === 0 ? "No library items have been added yet."
                : `No items have been added to ${title} yet.`}</p>
              {searching ? (
                <button type="button" className={styles.textButton} onClick={clearSearch}>Clear search</button>
              ) : groups.length > 0 && (
                <button type="button" className={styles.textButton} onClick={() => select({ kind: "all" })}>Browse all library items</button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
