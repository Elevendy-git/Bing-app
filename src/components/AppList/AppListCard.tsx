import type { CSSProperties, ReactNode } from "react";
import styles from "./AppListCard.module.css";

export interface AppListCardProps {
  /** One List row or a vertical group of List rows. */
  children: ReactNode;
  /** Optional accessible name for the grouped surface. */
  ariaLabel?: string;
  /** Optional class applied to the 350 px card shell. */
  className?: string;
  /** Optional style applied to the card shell. */
  style?: CSSProperties;
}

/**
 * Card shell from Figma nodes 3153:57140 (single) and 3153:57062 (multiple).
 * The shell owns the surface treatment; AppList remains square and layout-only.
 */
export function AppListCard({
  children,
  ariaLabel,
  className,
  style,
}: AppListCardProps) {
  return (
    <div
      className={`${styles.root} ${className ?? ""}`.trim()}
      style={style}
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
