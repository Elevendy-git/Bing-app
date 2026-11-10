import { ChevronRight20Regular } from "@fluentui/react-icons";
import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import type { PreviewTheme } from "./PhonePreview";
import { PreviewExpandedScreen } from "./PreviewExpandedScreen";
import { PreviewScreenTile } from "./PreviewScreenTile";
import type { PreviewScreen } from "./previewTypes";
import styles from "./PreviewKeyScreens.module.css";
import workbenchStyles from "./PreviewWorkbench.module.css";

export function PreviewKeyScreens({ screens, theme, navigationHeader }: {
  screens: readonly PreviewScreen[];
  theme: PreviewTheme;
  navigationHeader?: ReactNode;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const navigationId = useId();
  const groupRefs = useRef(new Map<string, HTMLDetailsElement>());
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeExpandedScreen = useCallback(() => setExpandedId(null), []);
  const expandedScreen = screens.find((screen) => screen.id === expandedId);
  const groups = new Map<string, PreviewScreen[]>();
  for (const screen of screens) {
    const title = screen.group ?? "Key screens";
    const items = groups.get(title) ?? [];
    items.push(screen);
    groups.set(title, items);
  }
  const groupEntries = Array.from(groups);
  const currentGroup = selectedGroup && groups.has(selectedGroup) ? selectedGroup : groupEntries[0]?.[0];
  const selectGroup = (title: string) => {
    setSelectedGroup(title);
    const group = groupRefs.current.get(title);
    if (!group) return;
    group.open = true;
    group.scrollIntoView?.({ behavior: "auto", block: "start", inline: "nearest" });
  };

  return (
    <section className={workbenchStyles.library} aria-label="Key screens">
      <nav className={workbenchStyles.libraryNavigation} aria-label="Key screen groups">
        {navigationHeader}
        <div className={workbenchStyles.sidebarBody}>
          <h2 className={workbenchStyles.sidebarHeading}>Key screens</h2>
          <div className={workbenchStyles.navigationTree}>
            {groupEntries.map(([title], index) => <button key={title} type="button"
              className={workbenchStyles.navigationItem} aria-label={`Show ${title} group`}
              aria-current={currentGroup === title ? "location" : undefined}
              aria-controls={`${navigationId}-${index}`} onClick={() => selectGroup(title)}>
              {title}
            </button>)}
          </div>
        </div>
      </nav>
      <div className={styles.gallery}>
        {groupEntries.map(([title, items], index) => (
          <details className={styles.group} key={title} id={`${navigationId}-${index}`}
            ref={(element) => { if (element) groupRefs.current.set(title, element); else groupRefs.current.delete(title); }} open>
            <summary className={styles.groupHeading}>
              <h2>{title}</h2>
              <ChevronRight20Regular aria-hidden="true" />
            </summary>
            <div className={styles.screenGrid}>
              {items.map((screen) => (
                <PreviewScreenTile key={screen.id} screen={screen} theme={theme} onOpen={(trigger) => {
                  triggerRef.current = trigger;
                  setExpandedId(screen.id);
                }} />
              ))}
            </div>
          </details>
        ))}
        {screens.length === 0 && <p className={styles.emptyState}>No key screens have been added yet.</p>}
      </div>
      {expandedScreen && <PreviewExpandedScreen screen={expandedScreen} theme={theme}
        returnFocusTo={triggerRef.current} onClose={closeExpandedScreen} />}
    </section>
  );
}
