import bingLogo from "../AppSearchBox/assets/bing.svg";
import styles from "./PreviewWorkbench.module.css";

export function PreviewWorkbenchBrand() {
  return <div className={styles.brand}>
    <span className={styles.brandIcon}><img src={bingLogo} width="25" height="25" alt="" /></span>
    <span className={styles.brandText}><strong>Bing App</strong><span>Workbench</span></span>
  </div>;
}
