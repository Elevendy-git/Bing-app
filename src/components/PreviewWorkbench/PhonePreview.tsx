import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PREVIEW_DEVICE, PREVIEW_SCREEN_MASK_STYLE } from "./previewDevice";
import { IOSStatusBarOverlayContext } from "../IOSStatusBar/IOSStatusBarOverlayContext";
import styles from "./PreviewWorkbench.module.css";

export type PreviewTheme = "light" | "dark";

const { screenWidth, screenHeight, shellWidth, shellHeight } = PREVIEW_DEVICE;
const SCREEN_INSET_X = (shellWidth - screenWidth) / 2;
const SCREEN_INSET_Y = (shellHeight - screenHeight) / 2;
// Match One Copilot's IPhoneFrame: reserve 4% of the available width.
const DESKTOP_WIDTH_FRACTION = 0.96;

interface PhonePreviewProps {
  children: ReactNode;
  theme: PreviewTheme;
  label?: string;
}

/** The preview owns device geometry; its child owns the complete app screen. */
export function PhonePreview({ children, theme, label = "Bing app preview" }: PhonePreviewProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [statusOverlay, setStatusOverlay] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateScale = () => {
      const stageStyle = window.getComputedStyle(stage);
      const horizontalPadding = (Number.parseFloat(stageStyle.paddingLeft) || 0)
        + (Number.parseFloat(stageStyle.paddingRight) || 0);
      const verticalPadding = (Number.parseFloat(stageStyle.paddingTop) || 0)
        + (Number.parseFloat(stageStyle.paddingBottom) || 0);
      const availableWidth = (stage.clientWidth - horizontalPadding) * DESKTOP_WIDTH_FRACTION;
      const availableHeight = stage.clientHeight - verticalPadding;
      if (availableWidth <= 0 || availableHeight <= 0) return;
      setScale(Math.min(1, availableWidth / shellWidth, availableHeight / shellHeight));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    const observer = typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(updateScale);
    observer?.observe(stage);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <div ref={stageRef} className={styles.stage}>
      <div
        className={styles.deviceBounds}
        style={{ width: shellWidth * scale, height: shellHeight * scale }}
      >
        <div
          className={styles.device}
          style={{
            width: shellWidth,
            height: shellHeight,
            transform: `scale(${scale})`,
          }}
        >
          <img
            className={styles.deviceShell}
            src={PREVIEW_DEVICE.shellSrc}
            width={shellWidth}
            height={shellHeight}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
          <div ref={setStatusOverlay} className={styles.statusOverlay} data-product="consumer" data-theme={theme}
            style={{ width: screenWidth, height: screenHeight, left: SCREEN_INSET_X, top: SCREEN_INSET_Y }} />
          <IOSStatusBarOverlayContext.Provider value={statusOverlay}>
            <section
              className={styles.screen}
              aria-label={label}
              data-preview-device={PREVIEW_DEVICE.name}
              data-product="consumer"
              data-theme={theme}
              style={{
                width: screenWidth,
                height: screenHeight,
                left: SCREEN_INSET_X,
                top: SCREEN_INSET_Y,
                ...PREVIEW_SCREEN_MASK_STYLE,
              }}
            >
              {children}
            </section>
          </IOSStatusBarOverlayContext.Provider>
        </div>
      </div>
    </div>
  );
}
