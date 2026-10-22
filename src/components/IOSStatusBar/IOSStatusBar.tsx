import { useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IOSDynamicIsland, type IOSDynamicIslandPresentation, type IOSDynamicIslandProps } from "./IOSDynamicIsland";
import { IOSStatusBarOverlayContext } from "./IOSStatusBarOverlayContext";
import { BatteryIcon, WifiIcon } from "./StatusIcons";
import { useIOSStatusTime } from "./useIOSStatusTime";
import type { IOSAppearance } from "../IOSNative/iosMetrics";
import styles from "./IOSStatusBar.module.css";

type TimeProps = { timeSource?: "fixed"; time?: string } | { timeSource: "system"; time?: never };
type ActivityProps =
  | { dynamicIsland?: IOSDynamicIslandProps; dynamicIslandFeatureHost?: never }
  | { dynamicIsland?: never; dynamicIslandFeatureHost?: { presentation: IOSDynamicIslandPresentation; node: ReactNode } };

export type IOSStatusBarProps = TimeProps & ActivityProps & {
  /** Width and tint belong to the screen embedding this component. */
  className?: string;
  appearance?: IOSAppearance;
  /** Device shells contain the camera cutout; standalone previews opt in. */
  showDynamicIsland?: boolean;
  /** Compatibility with screens that explicitly request white artwork. */
  tone?: "inherit" | "light";
};

/** Apple iOS 27 phone chrome; existing Live Activity slots stay compatible. */
export function IOSStatusBar({
  time = "9:41", timeSource = "fixed",
  dynamicIsland, dynamicIslandFeatureHost, className, tone = "inherit", appearance = "auto", showDynamicIsland = false,
}: IOSStatusBarProps) {
  const displayedTime = useIOSStatusTime(timeSource, time);
  const overlayTarget = useContext(IOSStatusBarOverlayContext);
  const rootClass = [styles.root, tone === "light" && styles.light, className].filter(Boolean).join(" ");

  const presentation = dynamicIsland?.presentation ?? dynamicIslandFeatureHost?.presentation;
  const activity = dynamicIsland ? <IOSDynamicIsland {...dynamicIsland} /> : dynamicIslandFeatureHost?.node;
  const mount = activity ? <div className={styles.activityLayer}><div className={styles.activityContent}>{activity}</div></div> : null;

  return (
    <div className={rootClass} data-ios-status-bar="phone" data-ios-appearance={appearance === "auto" ? undefined : appearance}>
      {mount && overlayTarget ? createPortal(mount, overlayTarget) : mount}
      {presentation === "expanded" ? <div className={styles.expandedSpacer} aria-hidden="true" /> : (
        <div className={styles.phoneChrome}>
          <div className={styles.timeSlot}><span className={styles.time}>{displayedTime}</span></div>
          <div className={presentation ? styles.activitySpacer : `${styles.cameraSpacer} ${showDynamicIsland ? styles.camera : ""}`} aria-hidden="true" />
          <div className={styles.phoneIndicators}>
            {presentation ? <><WifiIcon /><BatteryIcon /></> : <span className={styles.levels} aria-hidden="true" />}
          </div>
        </div>
      )}
    </div>
  );
}
