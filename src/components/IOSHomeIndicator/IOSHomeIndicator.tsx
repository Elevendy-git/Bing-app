import type { CSSProperties } from "react";
import type { IOSAppearance } from "../IOSNative/iosMetrics";
import styles from "./IOSHomeIndicator.module.css";

export interface IOSHomeIndicatorProps {
  appearance?: IOSAppearance;
  placement?: "inline" | "overlay";
  /** Hiding the artwork still reserves the same bottom safe area. */
  visible?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Apple iOS 27 portrait safe area. Screens render this once, above the keyboard. */
export function IOSHomeIndicator({ appearance = "auto", placement = "inline", visible = true, className, style }: IOSHomeIndicatorProps) {
  return <div className={[styles.root, placement === "overlay" && styles.overlay, className].filter(Boolean).join(" ")}
    data-ios-home-indicator="" data-ios-appearance={appearance === "auto" ? undefined : appearance} aria-hidden="true" style={style}>
    {visible && <span className={styles.bar} />}
  </div>;
}
