import type { CSSProperties } from "react";
import styles from "./MenuList.module.css";

const icons = {
  settings: new URL("./assets/settings.svg", import.meta.url).href,
  feedback: new URL("./assets/feedback.svg", import.meta.url).href,
  delete: new URL("./assets/delete.svg", import.meta.url).href,
  share: new URL("./assets/share.svg", import.meta.url).href,
};

/** Original 24 px Figma masks shared by Tabs and History menus. */
export function MenuIcon({ name }: { name: keyof typeof icons }) {
  return <span className={styles.asset} style={{ "--gnrc-menu-icon": `url("${icons[name]}")` } as CSSProperties} />;
}
