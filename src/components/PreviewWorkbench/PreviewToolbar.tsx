import type { RefObject } from "react";
import { ArrowCounterclockwise20Regular, Settings20Regular } from "@fluentui/react-icons";
import type { PreviewView } from "./previewTypes";
import styles from "./PreviewWorkbench.module.css";

interface PreviewToolbarProps {
  view: PreviewView;
  settingsOpen: boolean;
  settingsId: string;
  settingsButtonRef: RefObject<HTMLButtonElement>;
  onSettingsToggle: () => void;
  onResetPrototype: () => void;
}

export function PreviewToolbar({
  view, settingsOpen, settingsId, settingsButtonRef, onSettingsToggle, onResetPrototype,
}: PreviewToolbarProps) {
  return (
    <header className={styles.toolbar} data-view={view}>
      <span className={styles.brand}>Bing App</span>
      <div className={styles.toolbarMain}>
        {view === "prototype" && <button type="button" className={styles.resetButton}
          aria-label="Reset prototype" title="Clear prototype activity and return to Homepage"
          onClick={onResetPrototype}>
          <ArrowCounterclockwise20Regular aria-hidden="true" />Reset
        </button>}
        <button
          ref={settingsButtonRef}
          type="button"
          className={styles.iconButton}
          aria-label={settingsOpen ? "Hide settings" : "Open settings"}
          aria-expanded={settingsOpen}
          aria-controls={settingsId}
          title="Settings"
          onClick={onSettingsToggle}
        >
          <Settings20Regular aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
