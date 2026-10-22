import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { ChevronLeft24Regular, MoreHorizontal24Regular } from "@fluentui/react-icons";
import { AppHeader, AppList, AppListCard, HistoryMenu, IOSStatusBar, type AppFooterProps } from "../../components";
import { IOS_METRICS } from "../../components/IOSNative/iosMetrics";
import { ScreenFooter } from "../ScreenFooter";
import { iosMotion } from "../../motion/iosMotion";
import { groupHistory, HISTORY_ENTRIES, type HistoryEntry } from "./History.data";
import { HistoryListRow } from "./HistoryListRow";
import styles from "./History.module.css";

const emptyIllustration = new URL("./assets/empty-history.png", import.meta.url).href;

type MenuState = { kind: "page" } | { kind: "item"; entryId: string; top: number; right: number };
export interface HistoryProps {
  entries?: readonly HistoryEntry[];
  timeSource?: "fixed" | "system";
  interactive?: boolean;
  active?: boolean;
  initialMenu?: "page" | "item";
  onBack?: () => void;
  backLabel?: string;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
  onSearch?: () => void;
  onNavigate?: AppFooterProps["onSelectedTabChange"];
}

export function History({ entries = HISTORY_ENTRIES, timeSource = "fixed", interactive = false, active = true,
  initialMenu, onBack, backLabel = "Back to Recent", onDelete, onClearAll, onSearch, onNavigate }: HistoryProps) {
  const [menu, setMenu] = useState<MenuState | null>(initialMenu === "page" ? { kind: "page" }
    : initialMenu === "item" ? { kind: "item", entryId: "today-spotify", top: 347, right: 32 } : null);
  const root = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const menuId = useId();
  const reducedMotion = useReducedMotion();
  const present = useIsPresent();
  const inactive = !active || !present;
  useEffect(() => {
    if (interactive && active) Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find(button => button.getAttribute("aria-label") === backLabel)?.focus({ preventScroll: true });
  }, [interactive, active, backLabel]);
  const dismiss = () => {
    setMenu(null);
    requestAnimationFrame(() => {
      const target = trigger.current?.isConnected && !trigger.current.closest("[inert]") ? trigger.current : content.current;
      target?.focus({ preventScroll: true });
    });
  };
  const openItemMenu = (entry: HistoryEntry, button: HTMLButtonElement) => {
    const screen = root.current;
    if (!screen) return;
    const bounds = screen.getBoundingClientRect();
    const target = button.getBoundingClientRect();
    const scale = screen.offsetWidth && bounds.width ? bounds.width / screen.offsetWidth : 1;
    const bottomLimit = screen.clientHeight - IOS_METRICS.bottomSafeArea - 52 - 8;
    let top = (target.bottom - bounds.top) / scale - 2;
    if (top + 56 > bottomLimit) top = (target.top - bounds.top) / scale - 56 + 2;
    trigger.current = button;
    setMenu({ kind: "item", entryId: entry.id, top: Math.max(IOS_METRICS.statusBarHeight + 56, top),
      right: (bounds.right - target.right) / scale + 6 });
  };
  return <main ref={root} className={styles.root} aria-label="History page"
    aria-hidden={inactive || undefined} {...(inactive ? { inert: "" } : {})}>
    <div className={styles.header} {...(menu ? { inert: "" } : {})}>
      <IOSStatusBar timeSource={timeSource} className={styles.statusBar} />
      <AppHeader title="History" className={styles.appHeader}
        leftAction={{ label: backLabel, icon: <ChevronLeft24Regular />, onClick: onBack }}
        rightActions={[{ label: "History options", icon: <MoreHorizontal24Regular />,
          "aria-haspopup": "menu", "aria-expanded": menu?.kind === "page", "aria-controls": menu?.kind === "page" ? menuId : undefined,
          onClick: interactive ? event => { trigger.current = event.currentTarget; setMenu({ kind: "page" }); } : undefined }]} />
    </div>
    <div ref={content} className={styles.scrollContent} role="region" aria-label="History content" tabIndex={0}
      {...(menu ? { inert: "" } : {})}>
      {entries.length === 0 && <div className={styles.empty}>
        <img src={emptyIllustration} width={128} height={128} alt="" draggable={false} />
        <div className={styles.emptyText}>
          <h3>Add tab to start browsing</h3>
          <p>Your browsing and search history will appear here.</p>
        </div>
        <button type="button" data-history-search className={styles.searchNow} onClick={onSearch}
          aria-disabled={!onSearch || undefined}>Search now</button>
      </div>}
      {groupHistory(entries).map((group, groupIndex) => <section key={group.id} aria-label={group.label}>
        <AppList variant="section-header" title={group.label} showRightControl={false} className={styles.sectionHeader}
          style={{ "--gnrc-list-section-padding-top": groupIndex === 0 ? "10px" : "24px" } as CSSProperties} />
        <div className={styles.cardInset}>
          <AppListCard className={styles.listCard} ariaLabel={`${group.label} history`}>
            {group.entries.map((entry, index) => <HistoryListRow key={entry.id} entry={entry}
              showDivider={index < group.entries.length - 1} rightControlLabel={`Options for ${entry.title}, ${group.label}`}
              rightControlExpanded={menu?.kind === "item" && menu.entryId === entry.id}
              rightControlMenuId={menu?.kind === "item" && menu.entryId === entry.id ? menuId : undefined}
              onRightControlClick={interactive ? event => openItemMenu(entry, event.currentTarget) : undefined} />)}
          </AppListCard>
        </div>
      </section>)}
    </div>
    <div {...(menu ? { inert: "" } : {})}>
      <ScreenFooter selectedTab="collections" labels={{ collections: "Recent" }} onSelectedTabChange={onNavigate} />
    </div>
    <AnimatePresence>
      {menu && <motion.div className={styles.menuLayer} initial={initialMenu ? false : { opacity: 0 }}
        animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={reducedMotion ? iosMotion.instant : iosMotion.control}>
        <div className={styles.dismissArea} aria-hidden="true" onPointerDown={interactive ? dismiss : undefined} />
        <motion.div className={styles.menuAnchor} style={menu.kind === "item" ? { top: menu.top, right: menu.right } : undefined}
          initial={initialMenu ? false : { scale: 0.96, y: -4 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: -4 }}
          transition={reducedMotion ? iosMotion.instant : iosMotion.control}>
          <HistoryMenu variant={menu.kind} id={menuId} autoFocus={interactive} onDismiss={interactive ? dismiss : undefined}
            onDelete={onDelete && menu.kind === "item" ? () => { onDelete(menu.entryId); dismiss(); } : undefined}
            onClearAll={onClearAll ? () => { onClearAll(); dismiss(); } : undefined} />
        </motion.div>
      </motion.div>}
    </AnimatePresence>
    {interactive && <span className={styles.announcement} role="status">{entries.length} history entries</span>}
  </main>;
}
