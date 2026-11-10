import { useRef, type ReactNode } from "react";
import { motion, useIsPresent, useReducedMotion } from "motion/react";
import { iosMotion } from "../../motion/iosMotion";
import styles from "./MenuSheet.module.css";

/** Shared presentation for contextual action sheets; callers retain background ownership through exit. */
export function MenuSheet({ label, children, onDismiss, interactive = false }: {
  label: string; children: ReactNode; onDismiss?: () => void; interactive?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const present = useIsPresent();
  const reducedMotion = useReducedMotion();
  const animate = interactive && !reducedMotion;
  const enabled = interactive && present;
  return <motion.div ref={root} className={styles.overlay} aria-hidden={!present || undefined} {...(!present ? { inert: "" } : {})}
    onClick={enabled ? event => { if (event.target === event.currentTarget) onDismiss?.(); } : undefined}
    onKeyDown={enabled ? event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onDismiss?.(); }
      if (event.key === "Tab") {
        event.preventDefault();
        const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button:not([aria-disabled="true"]):not(:disabled)') ?? []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = index < 0 ? (event.shiftKey ? buttons.length - 1 : 0)
          : (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        buttons[next]?.focus({ preventScroll: true });
      }
    } : undefined}>
    <motion.div className={styles.backdrop} aria-hidden="true" initial={animate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={animate ? iosMotion.fade : iosMotion.instant} />
    <motion.section className={styles.sheet} role="dialog" aria-modal={interactive || undefined} aria-label={label}
      initial={animate ? { y: "110%" } : false} animate={{ y: 0 }} exit={{ y: animate ? "110%" : 0 }}
      transition={animate ? iosMotion.sheet : iosMotion.instant}>{children}</motion.section>
  </motion.div>;
}
