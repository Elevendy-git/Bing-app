import { useEffect, useRef, type ReactNode } from "react";
import styles from "./MenuList.module.css";

export interface MenuListItem {
  id: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  onSelect?: () => void;
}

export interface MenuListProps {
  items: readonly MenuListItem[];
  label?: string;
  id?: string;
  className?: string;
  autoFocus?: boolean;
  onDismiss?: () => void;
  layout?: "flyout" | "sheet";
  /** Optional sheet footer; dismissal remains owned by the host. */
  cancelLabel?: string;
}

/** Shareout 1:20756. The host owns anchoring and outside-click dismissal. */
export function MenuList({ items, label = "Menu", id, className, autoFocus = false, onDismiss, layout = "flyout", cancelLabel }: MenuListProps) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoFocus) root.current?.querySelector<HTMLButtonElement>(layout === "sheet" ? '[role="menuitem"]:not([aria-disabled="true"])' : '[role="menuitem"]')?.focus({ preventScroll: true });
  }, [autoFocus, layout]);
  return <div ref={root} id={id} className={[styles.root, layout === "sheet" ? styles.sheet : "", className].filter(Boolean).join(" ")} role="menu" aria-label={label}
    onKeyDown={(event) => {
      if ((event.key === "Escape" || (event.key === "Tab" && layout !== "sheet")) && onDismiss) {
        event.preventDefault(); event.stopPropagation(); onDismiss(); return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
        : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus({ preventScroll: true });
    }}>
    <div className={styles.material} aria-hidden="true"><span /><span /><span /><span /></div>
    {layout === "sheet" && <div className={styles.handle} aria-hidden="true"><span /></div>}
    <div className={styles.items}>
      {items.map(({ id: itemId, label: text, icon, destructive, onSelect }) => <button key={itemId} type="button"
        role="menuitem" tabIndex={-1} aria-disabled={!onSelect || undefined} onClick={onSelect}
        className={`${styles.item} ${destructive ? styles.destructive : ""}`}>
        {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
        <span className={styles.label}>{text}</span>
      </button>)}
    </div>
    {layout === "sheet" && cancelLabel && <div className={styles.footer}>
      <button type="button" role="menuitem" tabIndex={-1} aria-disabled={!onDismiss || undefined} onClick={onDismiss}
        className={`${styles.item} ${styles.cancel}`}>
        <span className={styles.label}>{cancelLabel}</span>
      </button>
    </div>}
  </div>;
}
