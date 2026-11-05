import { useEffect, useId, useRef, type ReactNode } from "react";
import { motion, useIsPresent, useReducedMotion } from "motion/react";
import { iosMotion } from "../../motion/iosMotion";
import styles from "./ConfirmationDialog.module.css";

export interface ConfirmationDialogProps {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  role?: "dialog" | "alertdialog";
  interactive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Shared C2 confirmation surface; its host owns background locking and return focus. */
export function ConfirmationDialog({ title, description, confirmLabel, cancelLabel = "Cancel", destructive = false,
  role = "alertdialog", interactive = true, onCancel, onConfirm }: ConfirmationDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const animate = interactive && !reducedMotion;
  const present = useIsPresent();

  useEffect(() => {
    if (interactive) dialogRef.current?.focus({ preventScroll: true });
  }, [interactive]);

  return <motion.div className={styles.overlay} initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    aria-hidden={!present || undefined} {...(!present ? { inert: "" } : {})}
    transition={animate ? iosMotion.fade : iosMotion.instant}
    onKeyDown={interactive ? event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onCancel(); }
      if (event.key === "Tab") {
        event.preventDefault();
        const target = document.activeElement === cancelRef.current ? confirmRef
          : document.activeElement === confirmRef.current ? cancelRef
          : event.shiftKey ? confirmRef : cancelRef;
        target.current?.focus();
      }
    } : undefined}>
    <motion.section ref={dialogRef} tabIndex={-1} className={styles.dialog} role={role} aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
      initial={animate ? { scale: 0.96 } : false} animate={{ scale: 1 }} exit={{ scale: animate ? 0.96 : 1 }}
      transition={animate ? iosMotion.control : iosMotion.instant}>
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>
      <div className={styles.actions}>
        <button ref={cancelRef} type="button" className={styles.cancel} disabled={!interactive} onClick={onCancel}>{cancelLabel}</button>
        <button ref={confirmRef} type="button" className={destructive ? styles.destructive : styles.primary} disabled={!interactive} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </motion.section>
  </motion.div>;
}
