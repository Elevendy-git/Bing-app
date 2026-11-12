import { Dismiss20Regular, Navigation20Regular, Settings20Regular } from "@fluentui/react-icons";
import type { RefObject } from "react";
import type { PreviewView } from "./previewTypes";
import { PreviewWorkbenchBrand } from "./PreviewWorkbenchBrand";
import { PreviewViewSwitcher } from "./PreviewViewSwitcher";
import styles from "./PreviewWorkbench.module.css";

export function CompactWorkbenchToolbar({ view, onViewChange, navigationId, navigationOpen, navigationButtonRef, onToggleNavigation, settingsId, settingsOpen, onOpenSettings }: {
  view: PreviewView;
  onViewChange: (view: PreviewView) => void;
  navigationId: string;
  navigationOpen: boolean;
  navigationButtonRef: RefObject<HTMLButtonElement>;
  onToggleNavigation: () => void;
  settingsId: string;
  settingsOpen: boolean;
  onOpenSettings: () => void;
}) {
  return <header className={styles.compactToolbar} aria-label="Workbench controls">
    <div className={styles.compactToolbarRow}>
      <button ref={navigationButtonRef} type="button" className={styles.compactIconButton}
        aria-label={navigationOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={navigationOpen} aria-controls={navigationId} onClick={onToggleNavigation}>
        {navigationOpen ? <Dismiss20Regular aria-hidden="true" /> : <Navigation20Regular aria-hidden="true" />}
      </button>
      <PreviewWorkbenchBrand />
      <button type="button" className={styles.compactIconButton} aria-label="Open inspector"
        aria-haspopup="dialog" aria-expanded={settingsOpen} aria-controls={settingsId} onClick={onOpenSettings}>
        <Settings20Regular aria-hidden="true" />
      </button>
    </div>
    <PreviewViewSwitcher view={view} onChange={onViewChange} />
  </header>;
}
