import { useCallback, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { iosMotion } from "../../motion/iosMotion";
import styles from "./WorkbenchSheet.module.css";

export interface WorkbenchSheetProps {
  id?: string;
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** A native modal retains focus and background inertness until its visual exit ends. */
export function WorkbenchSheet({ id, title, open, onClose, children }: WorkbenchSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const latestOpen = useRef(open);
  latestOpen.current = open;
  const headingId = useId();
  const reducedMotion = useReducedMotion();
  const offset = useMotionValue("100%");
  const backdropOpacity = useMotionValue(0);

  const releaseModal = useCallback((dialog: HTMLDialogElement) => {
    if (!dialog.open) return;
    dialog.close();
    const trigger = returnFocusRef.current;
    returnFocusRef.current = null;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    return () => releaseModal(dialog);
  }, [releaseModal]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }
    if (!dialog.open) return;

    let cancelled = false;
    // Retarget the same values so opening during dismissal continues from the drawn pose.
    const sheet = animate(offset, reducedMotion || open ? "0%" : "100%", reducedMotion ? iosMotion.instant : iosMotion.sheet);
    const backdrop = animate(backdropOpacity, open ? 1 : 0, reducedMotion ? iosMotion.instant : iosMotion.fade);
    void Promise.all([sheet, backdrop]).then(() => {
      if (!cancelled && !open && !latestOpen.current && dialog.open) {
        releaseModal(dialog);
      }
    });
    return () => {
      cancelled = true;
      sheet.stop();
      backdrop.stop();
    };
  }, [open, reducedMotion, offset, backdropOpacity, releaseModal]);

  const requestClose = () => { if (latestOpen.current) onClose(); };

  return (
    <dialog id={id} ref={dialogRef} className={styles.dialog} aria-labelledby={headingId}
      onCancel={(event) => { event.preventDefault(); requestClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <motion.div className={styles.backdrop} style={{ opacity: backdropOpacity }} aria-hidden="true" onClick={requestClose} />
      <motion.div className={styles.sheet} style={{ y: offset }}>
        <header className={styles.header}>
          <h2 id={headingId}>{title}</h2>
          <button type="button" className={styles.closeButton} aria-label={`Close ${title.toLowerCase()}`} onClick={requestClose}>
            <Dismiss24Regular aria-hidden="true" />
          </button>
        </header>
        <div className={styles.content}>{children}</div>
      </motion.div>
    </dialog>
  );
}
