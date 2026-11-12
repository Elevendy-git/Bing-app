import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PREVIEW_DEVICE } from "./previewDevice";
import { PhoneFrame, type PreviewTheme } from "./PhoneFrame";
import styles from "./PreviewWorkbench.module.css";

export type { PreviewTheme } from "./PhoneFrame";

const { shellWidth, shellHeight } = PREVIEW_DEVICE;
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
      <PhoneFrame theme={theme} scale={scale} label={label} livePreview>{children}</PhoneFrame>
    </div>
  );
}
