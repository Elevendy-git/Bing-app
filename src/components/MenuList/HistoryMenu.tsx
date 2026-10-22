import { MenuList, type MenuListProps } from "./MenuList";
import { MenuIcon } from "./MenuIcon";
import styles from "./HistoryMenu.module.css";

export interface HistoryMenuProps extends Omit<MenuListProps, "items" | "label"> {
  variant?: "page" | "item";
  onFeedback?: () => void;
  onClearAll?: () => void;
  onDelete?: () => void;
}

/** Shareout 1:20760 / 1:20766 use the same flyout surface and row geometry as Tabs. */
export function HistoryMenu({ variant = "page", onFeedback, onClearAll, onDelete, className, ...props }: HistoryMenuProps) {
  return <MenuList {...props} className={[styles.root, className].filter(Boolean).join(" ")}
    label={variant === "page" ? "History options" : "History item options"}
    items={variant === "page" ? [
      { id: "feedback", label: "Feedback", icon: <MenuIcon name="feedback" />, onSelect: onFeedback },
      { id: "clear-all", label: "Clear all history", icon: <MenuIcon name="delete" />, destructive: true, onSelect: onClearAll },
    ] : [
      { id: "delete", label: "Delete", icon: <MenuIcon name="delete" />, destructive: true, onSelect: onDelete },
    ]} />;
}
