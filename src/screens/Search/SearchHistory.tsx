import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Delete16Regular, Dismiss20Regular } from "@fluentui/react-icons";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { AppList, AppListCard } from "../../components/AppList";
import { iosMotion } from "../../motion/iosMotion";
import type { SearchHistoryItem } from "../activity/types";
import styles from "./SearchHistory.module.css";
import searchStyles from "./Search.module.css";

interface SearchHistoryProps {
  items: readonly SearchHistoryItem[];
  interactive: boolean;
  initialEditing?: boolean;
  onItemsChange: (items: readonly SearchHistoryItem[]) => void;
  onClearRequest: (trigger: HTMLButtonElement) => void;
  onSelect?: (query: string) => void;
  onEmptyFocus?: () => void;
}

interface HistoryRowProps {
  item: SearchHistoryItem;
  editing: boolean;
  interactive: boolean;
  animate: boolean;
  showDivider: boolean;
  onRemove: (item: SearchHistoryItem, trigger: HTMLButtonElement) => void;
  onSelect?: (query: string) => void;
}

// Collapse in flow so the card and following rows share one height animation.
function HistoryRow({ item, editing, interactive, animate, showDivider, onRemove, onSelect }: HistoryRowProps) {
  const present = useIsPresent();
  const selectable = interactive && Boolean(onSelect);
  return <motion.div className={styles.row}
    initial={false} animate={{ opacity: 1, height: "auto" }}
    exit={{ opacity: 0, height: 0 }}
    transition={animate ? { height: iosMotion.listCollapse, opacity: iosMotion.itemExit } : iosMotion.instant}
    data-history-id={item.id} aria-hidden={!present || undefined} {...(!present ? { inert: "" } : {})}
    onPointerDown={interactive && (editing || selectable) ? event => event.preventDefault() : undefined}>
    <AppList variant="as" title={item.query} suggestionSource="history" className={styles.listRow}
      showDivider={showDivider} showRightControl={editing}
      onClick={selectable ? () => onSelect?.(item.query) : undefined} disabled={editing || !present}
      rightControl={<motion.span className={styles.removeIcon} initial={animate ? { opacity: 0 } : false}
        animate={{ opacity: 1 }} transition={animate ? iosMotion.control : iosMotion.instant}><Dismiss20Regular aria-hidden="true" /></motion.span>}
      rightControlLabel={`Remove ${item.query} from history`}
      onRightControlClick={interactive && editing && present ? event => onRemove(item, event.currentTarget) : undefined} />
  </motion.div>;
}

function HistorySection({ children, editing, animate, sectionRef }: { children: ReactNode; editing: boolean; animate: boolean; sectionRef: RefObject<HTMLElement> }) {
  const present = useIsPresent();
  return <motion.section ref={sectionRef} className={styles.root} aria-label="Recent searches" data-editing={editing}
    aria-hidden={!present || undefined} {...(!present ? { inert: "" } : {})}
    initial={false} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
    transition={animate ? iosMotion.control : iosMotion.instant}>{children}</motion.section>;
}

export function SearchHistory({ items, interactive, initialEditing = false, onItemsChange, onClearRequest, onSelect, onEmptyFocus }: SearchHistoryProps) {
  const [editing, setEditing] = useState(initialEditing);
  const sectionRef = useRef<HTMLElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<{ scope: HTMLElement; trigger: HTMLButtonElement; target: "edit" | "done" | "row"; rowId?: string }>();
  const reducedMotion = useReducedMotion();
  const animate = interactive && !reducedMotion;
  // Pointer actions deliberately preserve the input's focus and keyboard. Only
  // transfer focus when a keyboard user's focused control is about to disappear.
  const retainFocus = (trigger: HTMLButtonElement, target: "edit" | "done" | "row", rowId?: string) => {
    const scope = sectionRef.current?.parentElement;
    if (trigger === document.activeElement && scope) pendingFocus.current = { scope, trigger, target, rowId };
  };
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = undefined;
    if (!interactive || !pending || !pending.scope.isConnected
      || pending.scope.closest('[inert], [hidden], [aria-hidden="true"]')) return;
    if (document.activeElement !== pending.trigger && document.activeElement !== document.body) return;
    if (pending.target === "row" && !items.length) { onEmptyFocus?.(); return; }
    const row = Array.from(sectionRef.current?.querySelectorAll<HTMLElement>("[data-history-id]") ?? [])
      .find(element => element.dataset.historyId === pending.rowId);
    const target = pending.target === "edit" ? editRef.current : pending.target === "done" ? doneRef.current
      : row?.querySelector<HTMLButtonElement>("button:not(:disabled)") ?? doneRef.current;
    target?.focus({ preventScroll: true });
  }, [editing, items, interactive, onEmptyFocus]);
  const remove = (item: SearchHistoryItem, trigger: HTMLButtonElement) => {
    const remaining = items.filter(({ id }) => id !== item.id);
    const index = Math.max(0, items.findIndex(({ id }) => id === item.id));
    retainFocus(trigger, "row", remaining[Math.min(index, remaining.length - 1)]?.id);
    onItemsChange(remaining);
  };
  const rows = items.map((item, index) => <HistoryRow key={item.id} item={item} editing={editing}
    interactive={interactive} animate={animate} showDivider={index < items.length - 1}
    onRemove={remove} onSelect={onSelect} />);

  const content = items.length ? <HistorySection key="history" editing={editing} animate={animate} sectionRef={sectionRef}>
    <AppList variant="section-header" title="Recent searches" className={searchStyles.sectionHeader}
      rightControl={interactive || editing ? <span className={styles.actions}
        onPointerDown={interactive ? event => event.preventDefault() : undefined}>
        <motion.span className={`${styles.actionLayer} ${styles.editActions}`} initial={false}
          animate={{ opacity: editing ? 1 : 0, x: editing ? 0 : 4 }} transition={animate ? iosMotion.control : iosMotion.instant}
          aria-hidden={!editing || undefined} {...(!editing ? { inert: "" } : {})}>
          <button type="button" disabled={!interactive || !editing} onClick={(event) => onClearRequest(event.currentTarget)}>Clear all</button>
          <span className={styles.actionDivider} aria-hidden="true" />
          <button ref={doneRef} type="button" disabled={!interactive || !editing} className={styles.done}
            onClick={event => { retainFocus(event.currentTarget, "edit"); setEditing(false); }}>Done</button>
        </motion.span>
        <motion.span className={styles.actionLayer} initial={false}
          animate={{ opacity: editing ? 0 : 1, scale: editing ? 0.9 : 1 }} transition={animate ? iosMotion.control : iosMotion.instant}
          aria-hidden={editing || undefined} {...(editing ? { inert: "" } : {})}>
          <button ref={editRef} type="button" className={styles.deleteAction} aria-label="Edit search history" disabled={!interactive || editing}
            onClick={event => { retainFocus(event.currentTarget, "done"); setEditing(true); }}><Delete16Regular aria-hidden="true" /></button>
        </motion.span>
      </span> : <Delete16Regular />} />
    <div className={searchStyles.cardInset}>
      <AppListCard ariaLabel="Search history" className={searchStyles.listCard}>
        {animate ? <AnimatePresence initial={false}>{rows}</AnimatePresence> : rows}
      </AppListCard>
    </div>
  </HistorySection> : null;
  return animate ? <AnimatePresence initial={false}>{content}</AnimatePresence> : content;
}
