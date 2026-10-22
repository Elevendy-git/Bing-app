import { forwardRef, useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown20Filled, ChevronUp20Filled, Delete16Regular, DismissCircle20Filled } from "@fluentui/react-icons";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useIsPresent, useReducedMotion } from "motion/react";
import { AppList } from "../../components/AppList";
import { iosMotion } from "../../motion/iosMotion";
import type { SearchHistoryItem } from "./Search.data";
import { historyLayout } from "./historyLayout";
import styles from "./SearchHistory.module.css";
import searchStyles from "./Search.module.css";

interface SearchHistoryProps {
  items: readonly SearchHistoryItem[];
  interactive: boolean;
  onItemsChange: (items: readonly SearchHistoryItem[]) => void;
  onInteraction: () => void;
  onClearRequest: (trigger: HTMLButtonElement) => void;
}

interface HistoryPillProps {
  item: SearchHistoryItem;
  editing: boolean;
  interactive: boolean;
  animate: boolean;
  onRemove: (item: SearchHistoryItem) => void;
}

// popLayout needs the DOM ref so the departing pill can fade in place while siblings reflow.
const HistoryPill = forwardRef<HTMLSpanElement, HistoryPillProps>(function HistoryPill({ item, editing, interactive, animate, onRemove }, ref) {
  const present = useIsPresent();
  return <motion.span ref={ref} layout={animate ? "position" : false}
    initial={animate ? { opacity: 0, scale: 0.96 } : false} animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.96, transition: { ...iosMotion.fade, duration: 0.16 } }}
    transition={animate ? iosMotion.control : iosMotion.instant}
    className={`${searchStyles.pill} ${styles.pill}`} data-history-id={item.id}
    aria-hidden={!present || undefined} {...(!present ? { inert: "" } : {})}>
    <span className={styles.query}>{item.query}</span>
    {interactive && <motion.button type="button" className={styles.remove} aria-label={`Remove ${item.query} from history`}
      initial={false} animate={{ opacity: editing ? 1 : 0, scale: editing ? 1 : 0.8 }}
      transition={animate ? iosMotion.control : iosMotion.instant}
      disabled={!editing || !present} aria-hidden={!editing || !present || undefined}
      onClick={() => onRemove(item)}><DismissCircle20Filled aria-hidden="true" /></motion.button>}
  </motion.span>;
});

function HistorySection({ children, editing, animate }: { children: ReactNode; editing: boolean; animate: boolean }) {
  const present = useIsPresent();
  return <motion.section className={styles.root} aria-label="Recent searches" data-editing={editing}
    aria-hidden={!present || undefined} {...(!present ? { inert: "" } : {})}
    initial={false} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
    transition={animate ? iosMotion.control : iosMotion.instant}>{children}</motion.section>;
}

export function SearchHistory({ items, interactive, onItemsChange, onInteraction, onClearRequest }: SearchHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [measurements, setMeasurements] = useState<{ width: number; pills: Record<string, number> }>();
  const measureRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const reducedMotion = useReducedMotion();
  const animate = interactive && !reducedMotion;
  // The workbench scales the phone with CSS; layout motion needs unscaled coordinates.
  const localPoint = useCallback((point: { x: number; y: number }) => {
    const measure = measureRef.current;
    const scale = measure?.clientWidth ? measure.getBoundingClientRect().width / measure.clientWidth : 1;
    return scale ? { x: point.x / scale, y: point.y / scale } : point;
  }, []);

  useLayoutEffect(() => {
    const measure = measureRef.current;
    if (!measure || !items.length) return;
    const update = () => {
      if (!measure.clientWidth) return;
      const scale = measure.getBoundingClientRect().width / measure.clientWidth;
      if (!scale) return;
      const pills = Object.fromEntries(Array.from(measure.children, (item, index) =>
        [items[index].id, item.getBoundingClientRect().width / scale]));
      setMeasurements((previous) => previous?.width === measure.clientWidth &&
        items.every(({ id }) => Math.abs(previous.pills[id] - pills[id]) < 0.01)
        ? previous : { width: measure.clientWidth, pills });
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(measure);
    Array.from(measure.children).forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [items]);

  // Reuse measured widths immediately on removal, avoiding a second layout correction mid-motion.
  const layout = measurements && items.every(({ id }) => id in measurements.pills)
    ? historyLayout(items.map(({ id }) => measurements.pills[id]), measurements.width) : undefined;
  const overflow = layout?.overflow ?? false;
  const showAll = expanded && overflow;
  const visibleItems = showAll || !overflow ? items : items.slice(0, layout!.count);
  const rows = layout && (showAll ? layout.expandedRows : layout.collapsedRows);
  const act = (action: () => void) => { onInteraction(); action(); };
  const remove = (item: SearchHistoryItem) => {
    onItemsChange(items.filter(({ id }) => id !== item.id));
  };
  const toggle = <>{showAll ? <ChevronUp20Filled /> : <ChevronDown20Filled />}</>;
  const pills = visibleItems.map((item) => <HistoryPill key={item.id} item={item} editing={editing}
    interactive={interactive} animate={animate} onRemove={remove} />);

  const content = items.length ? <HistorySection key="history" editing={editing} animate={animate}>
    <AppList variant="section-header" title="Recent searches" className={searchStyles.sectionHeader}
      rightControl={interactive ? <span className={styles.actions}>
        <motion.span className={`${styles.actionLayer} ${styles.editActions}`} initial={false}
          animate={{ opacity: editing ? 1 : 0, x: editing ? 0 : 4 }} transition={animate ? iosMotion.control : iosMotion.instant}
          aria-hidden={!editing || undefined} {...(!editing ? { inert: "" } : {})}>
          <button type="button" disabled={!editing} onClick={(event) => { onInteraction(); onClearRequest(event.currentTarget); }}>Clear all</button>
          <span className={styles.actionDivider} aria-hidden="true" />
          <button type="button" disabled={!editing} className={styles.done} onClick={() => setEditing(false)}>Done</button>
        </motion.span>
        <motion.span className={styles.actionLayer} initial={false}
          animate={{ opacity: editing ? 0 : 1, scale: editing ? 0.9 : 1 }} transition={animate ? iosMotion.control : iosMotion.instant}
          aria-hidden={editing || undefined} {...(editing ? { inert: "" } : {})}>
          <button type="button" className={styles.deleteAction} aria-label="Edit search history" disabled={editing}
            onClick={() => act(() => setEditing(true))}><Delete16Regular aria-hidden="true" /></button>
        </motion.span>
      </span> : <Delete16Regular />} />
    <div className={styles.inset}>
      <div ref={measureRef} className={styles.measure} aria-hidden="true" {...{ inert: "" }}>
        {items.map((item) => <span key={item.id} className={`${searchStyles.pill} ${styles.pill}`}>{item.query}</span>)}
      </div>
      <motion.div className={styles.viewport} initial={false}
        animate={{ height: rows ? rows * 38 + (rows - 1) * 8 + 12 : "auto" }}
        transition={animate ? iosMotion.control : iosMotion.instant}>
        <div id={listId} className={styles.pills}>
          <LayoutGroup id={listId}>
          {animate ? <AnimatePresence initial={false} mode="popLayout">{pills}</AnimatePresence> : pills}
          {overflow && (interactive ? <motion.button type="button" className={`${searchStyles.pill} ${styles.expand}`}
            layout={animate ? "position" : false} transition={animate ? iosMotion.control : iosMotion.instant}
            aria-label={showAll ? "Collapse search history" : "Show all search history"} aria-expanded={showAll} aria-controls={listId}
            onClick={() => act(() => setExpanded(!showAll))}>{toggle}</motion.button>
            : <span className={`${searchStyles.pill} ${styles.expand}`} aria-hidden="true">{toggle}</span>)}
          </LayoutGroup>
        </div>
      </motion.div>
    </div>
  </HistorySection> : null;
  return <MotionConfig transformPagePoint={localPoint}>
    {animate ? <AnimatePresence initial={false}>{content}</AnimatePresence> : content}
  </MotionConfig>;
}
