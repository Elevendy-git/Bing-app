import { AppFooter, type AppFooterProps } from "../components/AppFooter";
import { IOSHomeIndicator } from "../components/IOSHomeIndicator";
import styles from "./ScreenFooter.module.css";

/** Screen-owned bottom safe area, shared by Homepage and Recent. */
export function ScreenFooter({ showHomeIndicator = true, ...props }: AppFooterProps & { showHomeIndicator?: boolean }) {
  return (
    <div className={styles.root}>
      <AppFooter {...props} className={styles.footer} />
      {showHomeIndicator ? <IOSHomeIndicator /> : <div className={styles.safeArea} aria-hidden="true" />}
    </div>
  );
}
