import { ChevronRight20Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { PreviewTheme } from "./PhonePreview";
import { PreviewExpandedScreen } from "./PreviewExpandedScreen";
import { PreviewScreenTile } from "./PreviewScreenTile";
import { ResponsiveSidebar, useResponsiveNavigation } from "./ResponsiveNavigation";
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
  const galleryRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef(new Map<string, HTMLDetailsElement>());
  const updateFrameRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeExpandedScreen = useCallback(() => setExpandedId(null), []);
  const { compact, onClose: closeNavigation } = useResponsiveNavigation();
  const expandedScreen = screens.find((screen) => screen.id === expandedId);
  const groups = useMemo(() => {
    const result = new Map<string, PreviewScreen[]>();
    for (const screen of screens) {
      const title = screen.group ?? "Key screens";
      const items = result.get(title) ?? [];
      items.push(screen);
      result.set(title, items);
    }
    return result;
  }, [screens]);
  const groupEntries = useMemo(() => Array.from(groups), [groups]);
  const currentGroup = selectedGroup && groups.has(selectedGroup) ? selectedGroup : groupEntries[0]?.[0];

  const updateCurrentGroup = useCallback(() => {
    const gallery = galleryRef.current;
    if (!gallery || gallery.clientHeight === 0 || groupEntries.length === 0) return;
    const atBottom = gallery.scrollTop > 0 && gallery.scrollHeight - gallery.clientHeight - gallery.scrollTop <= 1;
    let activeTitle = groupEntries[0][0];
    if (atBottom) {
      // Short final sections cannot always reach the top of the scrollport.
      activeTitle = groupEntries[groupEntries.length - 1][0];
    } else {
      // Follow the reading area before the next heading reaches the very top.
      const activationLine = gallery.getBoundingClientRect().top
        + Math.max(parseFloat(getComputedStyle(gallery).paddingTop) || 0, gallery.clientHeight * 0.3);
      for (const [title] of groupEntries) {
        const group = groupRefs.current.get(title);
        if (group && group.getBoundingClientRect().top <= activationLine + 1) activeTitle = title;
        else break;
      }
    }
    setSelectedGroup(previous => previous === activeTitle ? previous : activeTitle);
  }, [groupEntries]);

  const scheduleCurrentGroup = useCallback(() => {
    if (updateFrameRef.current !== null) return;
    updateFrameRef.current = requestAnimationFrame(() => {
      updateFrameRef.current = null;
      updateCurrentGroup();
    });
  }, [updateCurrentGroup]);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    gallery.addEventListener("scroll", scheduleCurrentGroup, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(scheduleCurrentGroup);
    observer?.observe(gallery);
    groupRefs.current.forEach(group => observer?.observe(group));
    updateCurrentGroup();
    return () => {
      gallery.removeEventListener("scroll", scheduleCurrentGroup);
      observer?.disconnect();
      if (updateFrameRef.current !== null) cancelAnimationFrame(updateFrameRef.current);
      updateFrameRef.current = null;
    };
  }, [scheduleCurrentGroup, updateCurrentGroup]);

  const selectGroup = (title: string) => {
    setSelectedGroup(title);
    const group = groupRefs.current.get(title);
    if (!group) return;
    group.open = true;
    group.scrollIntoView?.({ behavior: "auto", block: "start", inline: "nearest" });
    if (compact) closeNavigation();
  };

  return (
    <section className={workbenchStyles.library} aria-label="Key screens">
      <ResponsiveSidebar variant="library" label="Key screen groups">
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
      </ResponsiveSidebar>
      <div ref={galleryRef} className={styles.gallery} role="region" aria-label="Key screens gallery">
        {groupEntries.map(([title, items], index) => (
          <details className={styles.group} key={title} id={`${navigationId}-${index}`}
            ref={(element) => { if (element) groupRefs.current.set(title, element); else groupRefs.current.delete(title); }}
            onToggle={scheduleCurrentGroup} open>
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
