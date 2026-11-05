import type { ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { MotionPresence } from "../motion/MotionPresence";
import { iosMotion } from "../motion/iosMotion";
import styles from "./ActivityEmptyState.module.css";

const states = {
  recent: {
    illustration: new URL("./Recent/assets/empty-recent.png", import.meta.url).href,
    title: "Your activity will appear here",
    description: "Start searching to build your activity",
  },
  tabs: {
    illustration: new URL("./Tabs/assets/empty-tabs.png", import.meta.url).href,
    title: "Add tab to start browsing",
    description: "Tap the “+” button to open new tab",
  },
  history: {
    illustration: new URL("./History/assets/empty-history.png", import.meta.url).href,
    title: "Add tab to start browsing",
    description: "Your browsing and search history will appear here.",
  },
  bookmark: {
    illustration: new URL("./Bookmark/assets/empty-bookmark.png", import.meta.url).href,
    title: "Bookmarks appear here",
    description: "Add a bookmark to easily find your favorite websites again",
  },
};

/** Shared full-canvas layout; preserve each supplied frame's optical alignment. */
export function ActivityEmptyState({ kind, animated = false, children }: {
  kind: keyof typeof states;
  animated?: boolean;
  children?: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const { illustration, title, description } = states[kind];
  return <MotionPresence className={[styles.empty, styles[kind], children ? styles.withAction : ""].filter(Boolean).join(" ")}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    transition={animated && !reducedMotion ? iosMotion.fade : iosMotion.instant}>
    <img src={illustration} width={128} height={128} alt="" draggable={false} />
    <div className={styles.copy}><h3>{title}</h3><p>{description}</p></div>
    {children}
  </MotionPresence>;
}
