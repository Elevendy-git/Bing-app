import type { ReactNode } from "react";
import { StaticPreview } from "./StaticPreview";
import styles from "./PreviewConfigurator.module.css";

/** Only the control panel accepts input; component artwork keeps its native appearance. */
export function PreviewConfigurator({ label, controls, children }: {
  label: string;
  controls: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.showcase}>
      <div className={styles.layout}>
        <div className={styles.configurator} role="group" aria-label={label}>{controls}</div>
        <div className={styles.previewArea}>
          <StaticPreview>{children}</StaticPreview>
        </div>
      </div>
    </div>
  );
}
