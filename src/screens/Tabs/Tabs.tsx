import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { ChevronLeft24Regular, MoreHorizontal24Regular } from "@fluentui/react-icons";
import { AppHeader, IOSStatusBar, TabsCard, TabsMenu, type AppFooterProps } from "../../components";
import type { RecentTab } from "../Recent/Recent.data";
import { ScreenFooter } from "../ScreenFooter";
import { NewTabButton } from "../NewTabButton";
import { iosMotion } from "../../motion/iosMotion";
import { OPEN_TABS } from "./Tabs.data";
import styles from "./Tabs.module.css";

const emptyIllustration = new URL("./assets/empty-tabs.png", import.meta.url).href;

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
  onNavigate?: AppFooterProps["onSelectedTabChange"];
}

/** Shareout Tabs L2; geometry fills the current phone rather than scaling a 390 px canvas. */
export function Tabs({ tabs = OPEN_TABS, selectedTabId = "results", timeSource = "fixed", interactive = false,
  active = true, initialMenuOpen = false, onBack, onNewTab, onSelectTab, onCloseTab, onCloseAll, onNavigate }: TabsProps) {
  const [menuOpen, setMenuOpen] = useState(initialMenuOpen);
  const root = useRef<HTMLElement>(null);
  const menuId = useId();
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const inactive = !active || !isPresent;
  useEffect(() => {
    if (interactive && active) root.current?.querySelector<HTMLButtonElement>('[aria-label="Back to Recent"]')?.focus({ preventScroll: true });
  }, [interactive, active]);
  const dismissMenu = () => {
    setMenuOpen(false);
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('[aria-label="Tab options"]')?.focus({ preventScroll: true }));
  };
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
    <div className={styles.header} {...(menuOpen ? { inert: "" } : {})}>
      <IOSStatusBar timeSource={timeSource} className={styles.statusBar} />
      <AppHeader title="Tabs" className={styles.appHeader}
        leftAction={{ label: "Back to Recent", icon: <ChevronLeft24Regular />, onClick: onBack }}
        rightActions={[{ label: "Tab options", icon: <MoreHorizontal24Regular />, onClick: interactive ? () => setMenuOpen(true) : undefined,
          "aria-haspopup": "menu", "aria-expanded": menuOpen, "aria-controls": menuOpen ? menuId : undefined }]} />
    </div>
    {tabs.length > 0 ? <div className={styles.scrollContent} role="region" aria-label="All tabs" tabIndex={0}
      {...(menuOpen ? { inert: "" } : {})}>
      <div className={styles.grid}>
        {tabs.map(tab => <TabsCard key={tab.id} data-tab-id={tab.id} title={tab.title} selected={selectedTabId === tab.id}
          previewSrc={tab.previewSrc} faviconSrc={tab.faviconSrc} previewStyle={tab.gridPreviewStyle ?? tab.previewStyle}
          className={styles.card} {...(!interactive ? { inert: "" } : {})}
          onSelect={onSelectTab ? () => onSelectTab(tab.id) : undefined} onClose={onCloseTab ? () => closeTab(tab.id) : undefined}
          selectLabel={`Select ${tab.title} tab: ${tab.id}`} closeLabel={`Close ${tab.title} tab: ${tab.id}`} />)}
      </div>
    </div> : <div className={styles.empty}>
      <img src={emptyIllustration} width={128} height={128} alt="" draggable={false} />
      <div className={styles.emptyText}>
        <h3>Add tab to start browsing</h3>
        <p>Tap the “+” button to open new tab</p>
      </div>
    </div>}
    <div {...(menuOpen ? { inert: "" } : {})}>
      <NewTabButton onClick={onNewTab} />
      <ScreenFooter selectedTab="collections" labels={{ collections: "Recent" }} onSelectedTabChange={onNavigate} />
    </div>
    <AnimatePresence>
      {menuOpen && <motion.div className={styles.menuLayer} initial={initialMenuOpen ? false : { opacity: 0 }}
        animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={reducedMotion ? iosMotion.instant : iosMotion.control}>
        <div className={styles.dismissArea} aria-hidden="true" onPointerDown={interactive ? dismissMenu : undefined} />
        <motion.div className={styles.menuAnchor} initial={initialMenuOpen ? false : { scale: 0.96, y: -4 }}
          animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: -4 }} transition={reducedMotion ? iosMotion.instant : iosMotion.control}>
          <TabsMenu id={menuId} autoFocus={interactive} onDismiss={interactive ? dismissMenu : undefined}
            onCloseAll={onCloseAll ? () => { dismissMenu(); onCloseAll(); } : undefined} />
        </motion.div>
      </motion.div>}
    </AnimatePresence>
    {interactive && <span className={styles.announcement} role="status">{tabs.length} tabs open</span>}
  </main>;
}
