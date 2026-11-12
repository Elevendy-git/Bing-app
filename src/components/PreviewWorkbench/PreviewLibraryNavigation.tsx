import { useId, useState, type ReactNode, type RefObject } from "react";
import { ChevronRight20Regular, Dismiss16Regular, Search20Regular } from "@fluentui/react-icons";
import {
  PREVIEW_LIBRARY_CATEGORIES,
  type PreviewComponentGroup,
  type PreviewLibraryCategory,
  type PreviewLibrarySelection,
} from "./previewTypes";
import styles from "./PreviewWorkbench.module.css";

interface PreviewLibraryNavigationProps {
  groups: readonly PreviewComponentGroup[];
  selection: PreviewLibrarySelection;
  onSelect: (selection: PreviewLibrarySelection) => void;
  query: string;
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  searchRef: RefObject<HTMLInputElement>;
  resultsId: string;
  navigationHeader?: ReactNode;
}

export function PreviewLibraryNavigation({ groups, selection, onSelect, query, onSearch, onClearSearch, searchRef, resultsId, navigationHeader }: PreviewLibraryNavigationProps) {
  const navigationId = useId();
  const [collapsed, setCollapsed] = useState<ReadonlySet<PreviewLibraryCategory>>(new Set());
  const allLabel = query.trim() ? "All results" : "All library items";
  const selectedGroup = selection.kind === "group" ? groups.find((group) => group.id === selection.id) : undefined;
  const selectedCategory = selection.kind === "category" ? selection.id : selectedGroup?.category;
  const sections = PREVIEW_LIBRARY_CATEGORIES.map((category) => ({
    ...category,
    groups: groups.filter((group) => group.category === category.id),
  })).filter((category) => category.groups.length > 0);
  const compactGroups = selectedCategory ? groups.filter((group) => group.category === selectedCategory) : groups;

  const select = (next: PreviewLibrarySelection) => {
    const category = next.kind === "category" ? next.id
      : next.kind === "group" ? groups.find((group) => group.id === next.id)?.category : undefined;
    if (category) setCollapsed((current) => {
      const expanded = new Set(current);
      expanded.delete(category);
      return expanded;
    });
    onSelect(next);
  };

  const toggleCategory = (id: PreviewLibraryCategory) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <nav className={styles.libraryNavigation} aria-label="Component categories">
      {navigationHeader}
      <div className={styles.sidebarBody}>
        <h2 className={styles.sidebarHeading}>Library</h2>
        <div className={styles.librarySearch} role="search" aria-label="Library">
          <Search20Regular aria-hidden="true" />
          <input ref={searchRef} type="search" aria-label="Search library" placeholder="Search library"
            aria-controls={resultsId} value={query} autoComplete="off" spellCheck={false}
            onChange={(event) => {
              setCollapsed(new Set());
              onSearch(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                event.stopPropagation();
                onClearSearch();
              }
            }} />
          {query && <button type="button" className={styles.searchClear} aria-label="Clear library search" onClick={onClearSearch}>
            <Dismiss16Regular aria-hidden="true" />
          </button>}
        </div>
        <div className={styles.navigationTree}>
          <button className={styles.navigationItem} type="button"
            aria-current={selection.kind === "all" ? "page" : undefined} onClick={() => select({ kind: "all" })}>
            {allLabel} <span className={styles.itemCount}>{groups.length}</span>
          </button>
          {sections.map((category) => {
            const expanded = !collapsed.has(category.id);
            const contentId = `${navigationId}-${category.id}`;
            return (
              <div key={category.id} className={styles.navigationSection}>
                <div className={styles.categoryHeading} data-active={selectedCategory === category.id || undefined}>
                  <button type="button" className={styles.categoryToggle}
                    aria-label={`${expanded ? "Collapse" : "Expand"} ${category.label}`}
                    aria-expanded={expanded} aria-controls={contentId} onClick={() => toggleCategory(category.id)}>
                    <ChevronRight20Regular aria-hidden="true" />
                  </button>
                  <button type="button" className={styles.navigationItem}
                    aria-current={selection.kind === "category" && selection.id === category.id ? "page" : undefined}
                    onClick={() => select({ kind: "category", id: category.id })}>
                    {category.label} <span className={styles.itemCount}>{category.groups.length}</span>
                  </button>
                </div>
                <ul id={contentId} hidden={!expanded} className={styles.categoryItems} aria-label={`${category.label} items`}>
                  {category.groups.map((group) => (
                    <li key={group.id}>
                      <button type="button" className={styles.navigationItem}
                        aria-current={selection.kind === "group" && selection.id === group.id ? "page" : undefined}
                        onClick={() => select({ kind: "group", id: group.id })}>
                        {group.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className={styles.libraryCompactNavigation}>
          <label>
            Category
            <select aria-label="Library category" value={selectedCategory ?? "all"} onChange={(event) => {
              const category = PREVIEW_LIBRARY_CATEGORIES.find((item) => item.id === event.target.value);
              select(category ? { kind: "category", id: category.id } : { kind: "all" });
            }}>
              <option value="all">{query.trim() ? "All results" : "All items"} ({groups.length})</option>
              {sections.map((category) => <option value={category.id} key={category.id}>{category.label} ({category.groups.length})</option>)}
            </select>
          </label>
          <label>
            Item
            <select aria-label="Library item" value={selectedGroup?.id ?? "all"} onChange={(event) => {
              const group = groups.find((item) => item.id === event.target.value);
              select(group ? { kind: "group", id: group.id } : selectedCategory ? { kind: "category", id: selectedCategory } : { kind: "all" });
            }}>
              <option value="all">{selectedCategory ? "All in category" : "All items"}</option>
              {compactGroups.map((group) => <option value={group.id} key={group.id}>{group.title}</option>)}
            </select>
          </label>
        </div>
      </div>
    </nav>
  );
}
