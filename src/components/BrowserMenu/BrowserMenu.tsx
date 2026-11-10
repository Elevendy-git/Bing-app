import { ArrowClockwise24Regular, Copy24Regular, DocumentSearch24Regular, Open24Regular } from "@fluentui/react-icons";
import { MenuList, type MenuListItem, type MenuListProps } from "../MenuList";
import { MenuIcon } from "../MenuList/MenuIcon";

export type BrowserMenuVariant = "serp" | "webpage";
export type BrowserMenuAction = "refresh" | "copy-link" | "open-in-default-browser" | "share"
  | "search-settings" | "feedback" | "find-on-page";

export interface BrowserMenuProps extends Pick<MenuListProps, "id" | "className" | "autoFocus" | "onDismiss"> {
  variant?: BrowserMenuVariant;
  /** The host performs the action and decides when to dismiss the sheet. */
  onAction?: (action: BrowserMenuAction) => void;
}

/** Browser actions share the existing Feed Menu sheet material and row layout. */
export function BrowserMenu({ variant = "serp", onAction, ...props }: BrowserMenuProps) {
  const action = (id: BrowserMenuAction, label: string, icon: MenuListItem["icon"]): MenuListItem => ({
    id, label, icon, onSelect: onAction ? () => onAction(id) : undefined,
  });
  return <MenuList {...props} layout="sheet" cancelLabel="Cancel"
    label={variant === "serp" ? "Search results options" : "Webpage options"} items={[
      action("refresh", "Refresh", <ArrowClockwise24Regular />),
      action("copy-link", "Copy link", <Copy24Regular />),
      action("open-in-default-browser", "Open in default browser", <Open24Regular />),
      action("share", "Share", <MenuIcon name="share" />),
      ...(variant === "serp" ? [action("search-settings", "Search settings", <MenuIcon name="settings" />)] : []),
      action("feedback", "Feedback", <MenuIcon name="feedback" />),
      action("find-on-page", "Find on page", <DocumentSearch24Regular />),
    ]} />;
}
