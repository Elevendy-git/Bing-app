import type { IOSStatusBarProps } from "./IOSStatusBar";
import styles from "./IOSStatusBar.examples.module.css";

export const IOS_STATUS_BAR_EXAMPLES = [
  { id: "phone", title: "Phone", props: {} },
  {
    id: "compact", title: "Phone with Compact Live Activity",
    props: {
      dynamicIsland: {
        presentation: "compact", ariaLabel: "Compact Live Activity",
        compactLeading: <span className={styles.regionMarker}>L</span>,
        compactTrailing: <span className={styles.regionMarker}>T</span>,
      },
    },
  },
  {
    id: "expanded", title: "Phone with Expanded Live Activity",
    props: {
      dynamicIsland: {
        presentation: "expanded", ariaLabel: "Expanded Live Activity",
        expanded: {
          leading: <span className={styles.regionMarker}>Leading</span>,
          trailing: <span className={styles.regionMarker}>Trailing</span>,
          center: <span className={styles.regionMarker}>Center</span>,
          bottom: <span className={styles.regionMarker}>Bottom</span>,
        },
      },
    },
  },
] as const satisfies readonly { id: string; title: string; props: IOSStatusBarProps }[];
