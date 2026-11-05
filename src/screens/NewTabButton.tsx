import { Add20Filled } from "@fluentui/react-icons";
import styles from "./NewTabButton.module.css";

/** Shared floating action; hosts set the footer height (zero on secondary pages). */
export function NewTabButton({ onClick }: { onClick?: () => void }) {
  return onClick
    ? <button type="button" className={styles.root} aria-label="New tab" onClick={onClick}><Add20Filled aria-hidden="true" /></button>
    : <div className={styles.root} role="img" aria-label="New tab"><Add20Filled aria-hidden="true" /></div>;
}
