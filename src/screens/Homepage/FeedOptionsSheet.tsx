import { useRef } from "react";
import { motion, useIsPresent, useReducedMotion } from "motion/react";
import { FeedMenu, type FeedMenuProps } from "../../components/FeedMenu";
import { iosMotion } from "../../motion/iosMotion";
import styles from "./FeedOptionsSheet.module.css";

export function FeedOptionsSheet({ interactive = false, ...menuProps }: FeedMenuProps & { interactive?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const present = useIsPresent();
  const reducedMotion = useReducedMotion();
  const animate = interactive && !reducedMotion;
  return <motion.div ref={root} className={styles.overlay} aria-hidden={!present || undefined} {...(!present ? { inert: "" } : {})}
    initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    transition={animate ? iosMotion.sheet : iosMotion.instant}
    onClick={interactive ? event => { if (event.target === event.currentTarget) menuProps.onDismiss?.(); } : undefined}
    onKeyDown={interactive ? event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); menuProps.onDismiss?.(); }
      if (event.key === "Tab") {
        event.preventDefault();
        const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button:not([aria-disabled="true"])') ?? []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus({ preventScroll: true });
      }
    } : undefined}>
    <motion.section className={styles.sheet} role="dialog" aria-modal="true" aria-label="Feed options"
      initial={animate ? { y: "110%" } : false} animate={{ y: 0 }} exit={{ y: animate ? "110%" : 0 }}
      transition={animate ? iosMotion.sheet : iosMotion.instant}>
      <FeedMenu {...menuProps} autoFocus={interactive} />
    </motion.section>
  </motion.div>;
}
