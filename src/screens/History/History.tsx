import { useEffect, useRef, type CSSProperties } from "react";
import { AnimatePresence, useIsPresent } from "motion/react";
import { ChevronLeft24Regular, MoreHorizontal24Regular } from "@fluentui/react-icons";
import { AppHeader, AppList, AppListCard, HistoryMenu, IOSHomeIndicator, IOSStatusBar } from "../../components";
import { AnchoredMenu, useAnchoredMenu } from "../../components/MenuList/AnchoredMenu";
import { CollapsingContent } from "../../motion/MotionPresence";
import { ActivityEmptyState } from "../ActivityEmptyState";
import { groupHistory, HISTORY_ENTRIES } from "./History.data";
import type { HistoryEntry } from "../activity/types";
import { HistoryListRow } from "./HistoryListRow";
import styles from "./History.module.css";

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
  onOpenSearch?: (query: string) => void;
  onOpenPage?: (url: string) => void;
}

export function History({ entries = HISTORY_ENTRIES, timeSource = "fixed", interactive = false, active = true,
  initialMenu, onBack, backLabel = "Back to Recent", onDelete, onClearAll, onSearch, onOpenSearch, onOpenPage }: HistoryProps) {
  const root = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const present = useIsPresent();
  const inactive = !active || !present;
  const overlay = useAnchoredMenu({ root, fallback: content, active: !inactive,
    initialState: initialMenu === "page" ? { kind: "page" }
      : initialMenu === "item" ? { kind: "item", entryId: "today-spotify", top: 347, right: 32 } : null,
  });
  const { state: menu, id: menuId } = overlay;
  useEffect(() => {
    if (interactive && active) Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find(button => button.getAttribute("aria-label") === backLabel)?.focus({ preventScroll: true });
  }, [interactive, active, backLabel]);
  return <main ref={root} className={styles.root} aria-label="History page"
    aria-hidden={inactive || undefined} {...(inactive ? { inert: "" } : {})}>
    <div className={styles.header} {...(overlay.presented ? { inert: "" } : {})}>
      <IOSStatusBar timeSource={timeSource} className={styles.statusBar} />
      <AppHeader title="History" className={styles.appHeader}
        leftAction={{ label: backLabel, icon: <ChevronLeft24Regular />, onClick: onBack }}
        rightActions={[{ label: "History options", icon: <MoreHorizontal24Regular />,
          "aria-haspopup": "menu", "aria-expanded": menu?.kind === "page", "aria-controls": menu?.kind === "page" ? menuId : undefined,
          onClick: interactive ? event => overlay.openPage(event.currentTarget) : undefined }]} />
    </div>
    <div ref={content} className={styles.scrollContent} role="region" aria-label="History content" tabIndex={0}
      {...(overlay.presented ? { inert: "" } : {})}>
      <AnimatePresence initial={false}>
      {entries.length === 0 && <ActivityEmptyState key="empty" kind="history" animated={interactive}>
        <button type="button" data-history-search className={styles.searchNow} onClick={onSearch}
          aria-disabled={!onSearch || undefined}>Search now</button>
      </ActivityEmptyState>}
      {groupHistory(entries).map((group, groupIndex) => <CollapsingContent key={group.id} enabled={interactive} role="region" aria-label={group.label}>
        <AppList variant="section-header" title={group.label} showRightControl={false} className={styles.sectionHeader}
          style={{ "--gnrc-list-section-padding-top": groupIndex === 0 ? "10px" : "24px" } as CSSProperties} />
        <div className={styles.cardInset}>
          <AppListCard className={styles.listCard} ariaLabel={`${group.label} history`}>
            <AnimatePresence initial={false}>
            {group.entries.map((entry, index) => <CollapsingContent key={entry.id} enabled={interactive}><HistoryListRow entry={entry}
              onOpenSearch={interactive ? onOpenSearch : undefined}
              onOpenPage={interactive ? onOpenPage : undefined}
              showDivider={index < group.entries.length - 1} rightControlLabel={`Options for ${entry.title}, ${group.label}`}
              rightControlExpanded={menu?.kind === "item" && menu.entryId === entry.id}
              rightControlMenuId={menu?.kind === "item" && menu.entryId === entry.id ? menuId : undefined}
              onRightControlClick={interactive ? event => overlay.openItem(entry.id, event.currentTarget, { height: 56 }) : undefined} /></CollapsingContent>)}
            </AnimatePresence>
          </AppListCard>
        </div>
      </CollapsingContent>)}
      </AnimatePresence>
    </div>
    <IOSHomeIndicator placement="overlay" />
    <AnchoredMenu menu={overlay} interactive={interactive}>
      {menu && <HistoryMenu variant={menu.kind} id={menuId} autoFocus={interactive} onDismiss={interactive ? () => overlay.close() : undefined}
        onDelete={onDelete && menu.kind === "item" ? () => { onDelete(menu.entryId); overlay.close(true); } : undefined}
        onClearAll={onClearAll ? () => { onClearAll(); overlay.close(); } : undefined} />}
    </AnchoredMenu>
    {interactive && <span className={styles.announcement} role="status">{entries.length} history entries</span>}
  </main>;
}
