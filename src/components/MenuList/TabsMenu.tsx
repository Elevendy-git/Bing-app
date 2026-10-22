import { MenuList, type MenuListProps } from "./MenuList";
import { MenuIcon } from "./MenuIcon";
export interface TabsMenuProps extends Omit<MenuListProps, "items" | "label"> {
  onSettings?: () => void;
  onFeedback?: () => void;
  onCloseAll?: () => void;
}
export function TabsMenu({ onSettings, onFeedback, onCloseAll, ...props }: TabsMenuProps) {
  return <MenuList {...props} label="Tabs options" items={[
    { id: "settings", label: "Tab settings", icon: <MenuIcon name="settings" />, onSelect: onSettings },
    { id: "feedback", label: "Feedback", icon: <MenuIcon name="feedback" />, onSelect: onFeedback },
    { id: "close-all", label: "Close all tabs", icon: <MenuIcon name="delete" />, destructive: true, onSelect: onCloseAll },
  ]} />;
}
