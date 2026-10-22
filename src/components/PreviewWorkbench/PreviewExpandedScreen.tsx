import { useId, useLayoutEffect, useRef, useState } from "react";
import { Dismiss24Regular } from "@fluentui/react-icons";
import type { PreviewTheme } from "./PhonePreview";
import { PREVIEW_DEVICE } from "./previewDevice";
import { PreviewScreenViewport } from "./PreviewScreenViewport";
import type { PreviewScreen } from "./previewTypes";
import styles from "./PreviewKeyScreens.module.css";

export function PreviewExpandedScreen({ screen, theme, returnFocusTo, onClose }: {
  screen: PreviewScreen;
  theme: PreviewTheme;
  returnFocusTo: HTMLButtonElement | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Own Escape even when browser keyboard navigation leaves focus on the body.
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("keydown", handleEscape, true);
      dialog.close();
      if (returnFocusTo?.isConnected) returnFocusTo.focus({ preventScroll: true });
    };
  }, [returnFocusTo, onClose]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const style = getComputedStyle(stage);
      const width = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const height = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      if (width > 0 && height > 0) setScale(Math.min(1, width / PREVIEW_DEVICE.screenWidth, height / PREVIEW_DEVICE.screenHeight));
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    observer?.observe(stage);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <dialog ref={dialogRef} className={styles.expandedPreview} aria-labelledby={headingId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header className={styles.expandedHeader}>
        <h2 id={headingId}>{screen.title}</h2>
        <button type="button" className={styles.closeButton} aria-label="Close enlarged preview" autoFocus onClick={onClose}>
          <Dismiss24Regular aria-hidden="true" />
        </button>
      </header>
      <div ref={stageRef} className={styles.expandedStage} onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
        <PreviewScreenViewport screen={screen} theme={theme} scale={scale} />
      </div>
    </dialog>
  );
}
