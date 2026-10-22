import { useEffect, useState } from "react";
import { CheckmarkCircle24Filled } from "@fluentui/react-icons";
import styles from "./Toast.module.css";

export interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  /** No timer runs for passive previews. Hover/focus pauses automatic dismissal. */
  duration?: number;
  className?: string;
}

/** C3 3577:22116. The containing screen owns placement and entrance/exit motion. */
export function Toast({ message, actionLabel, onAction, onDismiss, duration = 5000, className }: ToastProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!onDismiss || duration <= 0 || hovered || focused) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, onDismiss, duration, hovered, focused]);

  return <div className={[styles.root, className].filter(Boolean).join(" ")} role="status" aria-live="polite" aria-atomic="true"
    onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <span className={styles.content}><CheckmarkCircle24Filled className={styles.icon} aria-hidden="true" /><span>{message}</span></span>
    {actionLabel && (onAction ? <button type="button" className={styles.action} onClick={onAction}>{actionLabel}</button>
      : <span className={styles.action}>{actionLabel}</span>)}
  </div>;
}
