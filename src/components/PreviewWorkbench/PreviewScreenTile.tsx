import type { PreviewTheme } from "./PhonePreview";
import { PREVIEW_DEVICE } from "./previewDevice";
import { PreviewScreenViewport } from "./PreviewScreenViewport";
import type { PreviewScreen } from "./previewTypes";
import styles from "./PreviewKeyScreens.module.css";

// Match Copilot's gallery scale while retaining the full mobile layout internally.
const SCREEN_SCALE = 0.5;
const { screenWidth } = PREVIEW_DEVICE;

export function PreviewScreenTile({ screen, theme, onOpen }: {
  screen: PreviewScreen;
  theme: PreviewTheme;
  onOpen: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <figure className={styles.screenTile} style={{ width: screenWidth * SCREEN_SCALE }}>
      <PreviewScreenViewport screen={screen} theme={theme} scale={SCREEN_SCALE} interactive={false}>
        <button type="button" className={styles.enlargeScreen} aria-label={`Enlarge ${screen.title}`}
          onClick={(event) => onOpen(event.currentTarget)} />
      </PreviewScreenViewport>
      <figcaption className={styles.caption}>
        <button type="button" aria-label={`Open enlarged preview of ${screen.title}`}
          onClick={(event) => onOpen(event.currentTarget)}>{screen.title}</button>
      </figcaption>
    </figure>
  );
}
