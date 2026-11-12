import { useState, type ReactNode } from "react";
import { IOSStatusBarOverlayContext } from "../IOSStatusBar/IOSStatusBarOverlayContext";
import { NativeKeyboardProvider } from "../IOSNative/KeyboardEnvironment";
import { PREVIEW_DEVICE, PREVIEW_SCREEN_MASK_STYLE } from "./previewDevice";
import styles from "./PreviewWorkbench.module.css";

export type PreviewTheme = "light" | "dark";

const { screenWidth, screenHeight, shellWidth, shellHeight } = PREVIEW_DEVICE;
const SCREEN_INSET_X = (shellWidth - screenWidth) / 2;
const SCREEN_INSET_Y = (shellHeight - screenHeight) / 2;

/** Shared device artwork and logical screen geometry at a caller-owned scale. */
export function PhoneFrame({ children, theme, scale, label = "Bing app preview", interactive = true, overlay, livePreview = false }: {
  children: ReactNode;
  theme: PreviewTheme;
  scale: number;
  label?: string;
  interactive?: boolean;
  overlay?: ReactNode;
  livePreview?: boolean;
}) {
  const [statusOverlay, setStatusOverlay] = useState<HTMLDivElement | null>(null);

  return (
    <section className={styles.deviceBounds} aria-label={label} data-product="consumer" data-theme={theme}
      data-live-preview={livePreview || undefined}
      style={{ width: shellWidth * scale, height: shellHeight * scale }}>
      <div className={styles.device} aria-hidden={!interactive || undefined}
        {...(interactive ? {} : { inert: "" })}
        style={{ width: shellWidth, height: shellHeight, transform: `scale(${scale})` }}>
        <img className={styles.deviceShell} src={PREVIEW_DEVICE.shellSrc}
          width={shellWidth} height={shellHeight} alt="" aria-hidden="true" draggable={false} />
        <div ref={setStatusOverlay} className={styles.statusOverlay} data-product="consumer" data-theme={theme}
          style={{ width: screenWidth, height: screenHeight, left: SCREEN_INSET_X, top: SCREEN_INSET_Y }} />
        <NativeKeyboardProvider enabled={livePreview}>
          <IOSStatusBarOverlayContext.Provider value={statusOverlay}>
            <div className={styles.screen} data-preview-device={PREVIEW_DEVICE.name}
              data-product="consumer" data-theme={theme}
              style={{ width: screenWidth, height: screenHeight, left: SCREEN_INSET_X, top: SCREEN_INSET_Y,
                ...PREVIEW_SCREEN_MASK_STYLE }}>
              {children}
            </div>
          </IOSStatusBarOverlayContext.Provider>
        </NativeKeyboardProvider>
      </div>
      {overlay}
    </section>
  );
}
