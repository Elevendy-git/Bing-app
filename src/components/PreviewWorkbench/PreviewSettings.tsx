import { useEffect, useRef } from "react";
import {
  ArrowCounterclockwise20Regular, Desktop20Regular, Dismiss20Regular,
  WeatherMoon20Regular, WeatherSunny20Regular,
} from "@fluentui/react-icons";
import {
  PREVIEW_APPEARANCES,
  type PreviewAppearance, type PreviewView,
} from "./previewTypes";
import styles from "./PreviewWorkbench.module.css";
import { PREVIEW_DEVICE } from "./previewDevice";
import { PreviewViewSwitcher } from "./PreviewViewSwitcher";

const APPEARANCE_ICONS = {
  system: Desktop20Regular,
  light: WeatherSunny20Regular,
  dark: WeatherMoon20Regular,
};

interface PreviewSettingsProps {
  id: string;
  view: PreviewView;
  appearance: PreviewAppearance;
  title: string;
  focusOnMount: boolean;
  onViewChange: (view: PreviewView) => void;
  onAppearanceChange: (appearance: PreviewAppearance) => void;
  onClose: () => void;
  onResetPrototype: () => void;
  embedded?: boolean;
}

export function PreviewSettings({
  id, view, appearance, title, focusOnMount,
  onViewChange, onAppearanceChange, onClose, onResetPrototype, embedded = false,
}: PreviewSettingsProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (embedded) return;
    if (focusOnMount) closeRef.current?.focus();
  }, [focusOnMount, embedded]);

  useEffect(() => {
    if (embedded) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, embedded]);

  return (
    <aside id={id} className={styles.settings} data-embedded={embedded || undefined} aria-label="Settings">
      {!embedded && <header className={styles.settingsHeader}>
        <h2>Inspector</h2>
        <div className={styles.headerActions}>
          {view === "prototype" && <button type="button" className={styles.iconButton} aria-label="Reset prototype"
            title="Clear prototype activity and return to Homepage" onClick={onResetPrototype}>
            <ArrowCounterclockwise20Regular aria-hidden="true" />
          </button>}
          <button ref={closeRef} type="button" className={styles.iconButton} aria-label="Close settings" onClick={onClose}>
            <Dismiss20Regular aria-hidden="true" />
          </button>
        </div>
      </header>}
      <div className={styles.settingsBody}>
        {!embedded && <PreviewViewSwitcher view={view} onChange={onViewChange} />}
        <h3 className={styles.inspectorTitle}>{title}</h3>
        {view !== "library" && <section className={styles.inspectorSection} aria-label="Preview device">
          <h4>Device</h4>
          <div className={styles.deviceField}><output>{PREVIEW_DEVICE.name}</output></div>
          <dl className={styles.deviceDetails}>
            <div><dt>Viewport</dt><dd>{`${PREVIEW_DEVICE.screenWidth} × ${PREVIEW_DEVICE.screenHeight} px`}</dd></div>
          </dl>
        </section>}
        <div className={styles.settingsRow}>
          <span>Appearance</span>
          <div className={styles.settingsOptions} role="group" aria-label="Preview appearance">
            {PREVIEW_APPEARANCES.map((option) => {
              const Icon = APPEARANCE_ICONS[option.value];
              return (
                <button key={option.value} type="button" className={styles.settingsOption}
                  aria-pressed={appearance === option.value} onClick={() => onAppearanceChange(option.value)}>
                  <Icon aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {embedded && view === "prototype" && <button type="button" className={styles.compactReset} onClick={onResetPrototype}>
          <ArrowCounterclockwise20Regular aria-hidden="true" /> Reset prototype
        </button>}
      </div>
    </aside>
  );
}
