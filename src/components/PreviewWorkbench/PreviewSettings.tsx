import { useEffect, useRef } from "react";
import {
  Apps20Regular, Desktop20Regular, Dismiss20Regular, ImageMultiple20Regular,
  Phone20Regular, WeatherMoon20Regular, WeatherSunny20Regular,
} from "@fluentui/react-icons";
import {
  PREVIEW_APPEARANCES, PREVIEW_VIEWS,
  type PreviewAppearance, type PreviewView,
} from "./previewTypes";
import styles from "./PreviewWorkbench.module.css";

const VIEW_ICONS = {
  prototype: Phone20Regular,
  keyscreens: ImageMultiple20Regular,
  library: Apps20Regular,
};

const APPEARANCE_ICONS = {
  system: Desktop20Regular,
  light: WeatherSunny20Regular,
  dark: WeatherMoon20Regular,
};

interface PreviewSettingsProps {
  id: string;
  view: PreviewView;
  appearance: PreviewAppearance;
  focusOnMount: boolean;
  onViewChange: (view: PreviewView) => void;
  onAppearanceChange: (appearance: PreviewAppearance) => void;
  onClose: () => void;
}

export function PreviewSettings({
  id, view, appearance, focusOnMount,
  onViewChange, onAppearanceChange, onClose,
}: PreviewSettingsProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focusOnMount) closeRef.current?.focus();
  }, [focusOnMount]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <aside id={id} className={styles.settings} aria-label="Settings">
      <header className={styles.settingsHeader}>
        <h2>Settings</h2>
        <button ref={closeRef} type="button" className={styles.iconButton} aria-label="Close settings" onClick={onClose}>
          <Dismiss20Regular aria-hidden="true" />
        </button>
      </header>
      <div className={styles.settingsBody}>
        <div className={styles.settingsRow}>
          <span>View</span>
          <div className={styles.settingsOptions} role="group" aria-label="Preview view">
            {PREVIEW_VIEWS.map((option) => {
              const Icon = VIEW_ICONS[option.value];
              return (
                <button key={option.value} type="button" className={styles.settingsOption}
                  aria-pressed={view === option.value} onClick={() => onViewChange(option.value)}>
                  <Icon aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
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
      </div>
    </aside>
  );
}
