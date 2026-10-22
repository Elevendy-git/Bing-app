import { motion, useReducedMotion } from "motion/react";
import { iosMotion } from "../../motion/iosMotion";
import styles from "./AppSearchBox.module.css";

export type AppSearchBoxLoadState = "loading" | "rendering" | "complete";

/** Estimated navigation progress, rather than a download percentage. */
export function SearchBoxProgress({ state, animate = false }: { state: AppSearchBoxLoadState; animate?: boolean }) {
  const reducedMotion = useReducedMotion();
  const animated = animate && !reducedMotion;
  const complete = state === "complete";
  const progress = complete ? 1 : state === "rendering" ? 0.86 : animate ? 0.7 : 0.36;
  return <motion.span className={styles.progressClip} initial={false}
    role="progressbar" aria-label="Loading search results" aria-hidden={complete || undefined}
    animate={{ opacity: complete ? 0 : 1 }}
    transition={animated && complete ? iosMotion.webProgressFade : iosMotion.instant}>
    <motion.span className={styles.progressFill}
      initial={animated ? { scaleX: 0.12 } : false} animate={{ scaleX: progress }}
      transition={!animated ? iosMotion.instant : state === "loading" ? iosMotion.webProgressPending : iosMotion.webProgressAdvance} />
  </motion.span>;
}
