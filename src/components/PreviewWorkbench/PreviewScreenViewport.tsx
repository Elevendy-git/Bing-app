import type { ReactNode } from "react";
import type { PreviewTheme } from "./PhonePreview";
import { PREVIEW_DEVICE, PREVIEW_SCREEN_MASK_STYLE } from "./previewDevice";
import type { PreviewScreen } from "./previewTypes";
import styles from "./PreviewKeyScreens.module.css";

const { screenWidth, screenHeight } = PREVIEW_DEVICE;

/** Gallery and enlarged view render the same logical mobile screen. */
export function PreviewScreenViewport({ screen, theme, scale, interactive = true, children }: {
  screen: PreviewScreen;
  theme: PreviewTheme;
  scale: number;
  interactive?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={styles.viewport} aria-label={`${screen.title} preview`}
      data-preview-device={PREVIEW_DEVICE.name} data-product="consumer" data-theme={theme}
      style={{ width: screenWidth * scale, height: screenHeight * scale, ...PREVIEW_SCREEN_MASK_STYLE }}>
      <div className={styles.screenContent} aria-hidden={!interactive || undefined}
        {...(interactive ? {} : { inert: "" })}
        style={{ width: screenWidth, height: screenHeight, transform: `scale(${scale})` }}>
        {screen.content}
      </div>
      {children}
    </section>
  );
}
