import { ChevronLeft24Regular, ChevronRight24Regular, Home24Regular } from "@fluentui/react-icons";
import type { ReactNode } from "react";
import { CollectionsEmptyIcon } from "../AppFooter";
import styles from "./AppBrowserToolbar.module.css";

export interface AppBrowserToolbarProps {
  recentSelected?: boolean;
  backLabel?: string;
  navigationLabel?: string;
  onBack?: () => void;
  onForward?: () => void;
  onHome?: () => void;
  onRecent?: () => void;
}

/** App-owned browser controls. The containing screen supplies its bottom safe area. */
export function AppBrowserToolbar({ recentSelected = false, backLabel = "Back to search", navigationLabel = "Search results navigation", onBack, onForward, onHome, onRecent }: AppBrowserToolbarProps) {
  const action = (label: string, icon: ReactNode, callback?: () => void, unavailable = false, selected = false) => {
    const className = [styles.action, unavailable && styles.unavailable, selected && styles.selected].filter(Boolean).join(" ");
    return callback
      ? <button type="button" className={className} aria-label={label} aria-current={selected ? "page" : undefined} onClick={callback}>{icon}</button>
      : <span className={className} role="img" aria-label={label} aria-current={selected ? "page" : undefined}>{icon}</span>;
  };
  return <nav className={styles.root} aria-label={navigationLabel}>
    {action(backLabel, <ChevronLeft24Regular />, onBack)}
    {action("Forward", <ChevronRight24Regular />, onForward, !onForward)}
    {action("Home", <Home24Regular />, onHome)}
    {action("Copilot", <span className={styles.copilot} />)}
    {action("Recent", <CollectionsEmptyIcon selected={recentSelected} />, onRecent, false, recentSelected)}
  </nav>;
}
