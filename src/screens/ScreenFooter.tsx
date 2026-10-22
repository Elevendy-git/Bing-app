import { AppFooter, type AppFooterProps } from "../components/AppFooter";
import { IOSHomeIndicator } from "../components/IOSHomeIndicator";
import styles from "./ScreenFooter.module.css";

/** Screen-owned bottom safe area, shared by Homepage and Recent. */
export function ScreenFooter(props: AppFooterProps) {
  return (
    <div className={styles.root}>
      <AppFooter {...props} className={styles.footer} />
      <IOSHomeIndicator />
    </div>
  );
}
