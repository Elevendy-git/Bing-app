import type { ReactNode } from "react";
import styles from "./StaticPreview.module.css";

/** Library artwork is inert; its state is owned by the adjacent configurator. */
export function StaticPreview({ children }: { children: ReactNode }) {
  return <div className={styles.root} {...{ inert: "" }}>{children}</div>;
}
