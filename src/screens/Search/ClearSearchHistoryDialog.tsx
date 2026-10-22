import { useEffect, useId, useRef, type RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";
import { iosMotion } from "../../motion/iosMotion";
import styles from "./ClearSearchHistoryDialog.module.css";

interface ClearSearchHistoryDialogProps {
  onKeep: () => void;
  onClear: () => void;
  fallbackFocus: RefObject<HTMLDivElement>;
  returnFocusTo: HTMLElement | null;
}

/** C2 437:37180, centered in the device above its home-indicator safe area. */
export function ClearSearchHistoryDialog({ onKeep, onClear, fallbackFocus, returnFocusTo }: ClearSearchHistoryDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const keepRef = useRef<HTMLButtonElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    keepRef.current?.focus({ preventScroll: true });
    return () => {
      const target = returnFocusTo?.isConnected && !returnFocusTo.closest("[inert], [hidden]") ? returnFocusTo : fallbackFocus.current;
      target?.focus({ preventScroll: true });
    };
  }, [fallbackFocus, returnFocusTo]);

  return <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    transition={reducedMotion ? iosMotion.instant : iosMotion.fade}
    onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onKeep(); }
      if (event.key === "Tab") {
        event.preventDefault();
        (document.activeElement === keepRef.current ? clearRef : keepRef).current?.focus();
      }
    }}>
    <motion.section className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
      initial={{ scale: reducedMotion ? 1 : 0.96 }} animate={{ scale: 1 }} exit={{ scale: reducedMotion ? 1 : 0.96 }}
      transition={reducedMotion ? iosMotion.instant : iosMotion.control}>
      <h2 id={titleId}>Clear all search history</h2>
      <p id={descriptionId}>All your search history in this app will be cleared.</p>
      <div className={styles.actions}>
        <button ref={keepRef} type="button" className={styles.keep} onClick={onKeep}>Keep</button>
        <button ref={clearRef} type="button" className={styles.clear} onClick={onClear}>Clear all</button>
      </div>
    </motion.section>
  </motion.div>;
}
