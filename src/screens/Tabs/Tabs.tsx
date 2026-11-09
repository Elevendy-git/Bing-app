import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { ChevronLeft24Regular, MoreHorizontal24Regular } from "@fluentui/react-icons";
import { AppHeader, IOSHomeIndicator, IOSStatusBar, TabsCard, TabsMenu } from "../../components";
import type { RecentTab } from "../activity/types";
import { NewTabButton } from "../NewTabButton";
import { iosMotion } from "../../motion/iosMotion";
import { MotionLayout, MotionPresence } from "../../motion/MotionPresence";
import { AnchoredMenu, useAnchoredMenu } from "../../components/MenuList/AnchoredMenu";
import { ActivityEmptyState } from "../ActivityEmptyState";
import { OPEN_TABS } from "./Tabs.data";
import styles from "./Tabs.module.css";

export interface TabsProps {
  tabs?: readonly RecentTab[];
  selectedTabId?: string | null;
  timeSource?: "fixed" | "system";
  interactive?: boolean;
  active?: boolean;
  initialMenuOpen?: boolean;
  onBack?: () => void;
  onNewTab?: () => void;
  onSelectTab?: (id: string) => void;
  onCloseTab?: (id: string) => void;
  onCloseAll?: () => void;
}

/** Shareout Tabs L2; geometry fills the current phone rather than scaling a 390 px canvas. */
export function Tabs({ tabs = OPEN_TABS, selectedTabId = "results", timeSource = "fixed", interactive = false,
  active = true, initialMenuOpen = false, onBack, onNewTab, onSelectTab, onCloseTab, onCloseAll }: TabsProps) {
  const root = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const inactive = !active || !isPresent;
  const animate = interactive && !reducedMotion;
  const overlay = useAnchoredMenu({ root, fallback: content, active: !inactive, initialState: initialMenuOpen ? { kind: "page" } : null });
  const menuOpen = Boolean(overlay.state);
  const menuId = overlay.id;
  useEffect(() => {
    if (interactive && active) root.current?.querySelector<HTMLButtonElement>('[aria-label="Back to Recent"]')?.focus({ preventScroll: true });
  }, [interactive, active]);
  const closeTab = (id: string) => {
    const index = tabs.findIndex(tab => tab.id === id);
    const next = tabs[index + 1] ?? tabs[index - 1];
    onCloseTab?.(id);
    requestAnimationFrame(() => {
      const target = next ? root.current?.querySelector<HTMLElement>(`[data-tab-id="${next.id}"] button:last-child`)
        : root.current?.querySelector<HTMLElement>('[aria-label="New tab"]');
      target?.focus({ preventScroll: true });
    });
  };
  return <main ref={root} className={styles.root} aria-label="Tabs page"
    aria-hidden={inactive || undefined} {...(inactive ? { inert: "" } : {})}>
    <div className={styles.header} {...(overlay.presented ? { inert: "" } : {})}>
      <IOSStatusBar timeSource={timeSource} className={styles.statusBar} />
      <AppHeader title="Tabs" className={styles.appHeader}
        leftAction={{ label: "Back to Recent", icon: <ChevronLeft24Regular />, onClick: onBack }}
        rightActions={[{ label: "Tab options", icon: <MoreHorizontal24Regular />, onClick: interactive ? event => overlay.openPage(event.currentTarget) : undefined,
          "aria-haspopup": "menu", "aria-expanded": menuOpen, "aria-controls": menuOpen ? menuId : undefined }]} />
    </div>
    <motion.div ref={content} className={styles.scrollContent} role="region" aria-label="All tabs" tabIndex={0} layoutScroll
      aria-hidden={tabs.length === 0 || undefined}
      {...(overlay.presented ? { inert: "" } : {})}>
      <MotionLayout className={styles.grid}>
        <AnimatePresence initial={false} mode="popLayout">
        {tabs.map(tab => <MotionPresence key={tab.id} className={styles.tabItem} layout={animate ? "position" : false}
          initial={false} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: animate ? 0.96 : 1 }}
          transition={animate ? { layout: iosMotion.disclosure, opacity: iosMotion.itemExit, scale: iosMotion.itemExit } : iosMotion.instant}>
          <TabsCard data-tab-id={tab.id} title={tab.title} selected={selectedTabId === tab.id}
          previewSrc={tab.previewSrc} pageSnapshot={tab.pageSnapshot} faviconSrc={tab.faviconSrc} previewStyle={tab.gridPreviewStyle ?? tab.previewStyle}
          className={styles.card} {...(!interactive ? { inert: "" } : {})}
          onSelect={onSelectTab ? () => onSelectTab(tab.id) : undefined} onClose={onCloseTab ? () => closeTab(tab.id) : undefined}
          selectLabel={`Select ${tab.title} tab: ${tab.id}`} closeLabel={`Close ${tab.title} tab: ${tab.id}`} /></MotionPresence>)}
        </AnimatePresence>
      </MotionLayout>
    </motion.div>
    <AnimatePresence initial={false}>
    {tabs.length === 0 && <ActivityEmptyState key="empty" kind="tabs" animated={animate} />}
    </AnimatePresence>
    <div {...(overlay.presented ? { inert: "" } : {})}>
      <NewTabButton onClick={onNewTab} />
    </div>
    <IOSHomeIndicator placement="overlay" />
    <AnchoredMenu menu={overlay} interactive={interactive}>
      <TabsMenu id={menuId} autoFocus={interactive} onDismiss={interactive ? () => overlay.close() : undefined}
        onCloseAll={onCloseAll ? () => { overlay.close(); onCloseAll(); } : undefined} />
    </AnchoredMenu>
    {interactive && <span className={styles.announcement} role="status">{tabs.length} tabs open</span>}
  </main>;
}
