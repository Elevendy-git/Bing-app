import { MenuList, type MenuListProps } from "./MenuList";
import { MenuIcon } from "./MenuIcon";

export interface BookmarkMenuProps extends Omit<MenuListProps, "items" | "label"> {
  variant?: "page" | "item";
  onFeedback?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

/** Shareout 1:20786 / 1:20790. Reuses the shared 238 px flyout. */
export function BookmarkMenu({ variant = "page", onFeedback, onShare, onDelete, ...props }: BookmarkMenuProps) {
  return <MenuList {...props} label={variant === "page" ? "Bookmark options" : "Bookmark item options"}
    items={variant === "page" ? [
      { id: "feedback", label: "Feedback", icon: <MenuIcon name="feedback" />, onSelect: onFeedback },
    ] : [
      { id: "share", label: "Share", icon: <MenuIcon name="share" />, onSelect: onShare },
      { id: "delete", label: "Delete", icon: <MenuIcon name="delete" />, destructive: true, onSelect: onDelete },
    ]} />;
}
