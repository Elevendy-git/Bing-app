import { AppBrowserToolbar, type AppBrowserToolbarProps } from "../AppBrowserToolbar";
import styles from "./IABFooter.module.css";

export interface IABFooterProps extends AppBrowserToolbarProps {
  className?: string;
}

/** App browser actions; the screen owns its iOS safe area and home indicator. */
export function IABFooter({ className, ...navigation }: IABFooterProps) {
  return <footer className={[styles.root, className].filter(Boolean).join(" ")}>
    <AppBrowserToolbar {...navigation} />
  </footer>;
}
