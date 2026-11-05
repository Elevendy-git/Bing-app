import { Fragment, useCallback, useId, useRef, useState, type ReactNode } from "react";
import { PhonePreview } from "./PhonePreview";
import { PreviewActivityProvider } from "./PreviewActivity";
import { PreviewKeyScreens } from "./PreviewKeyScreens";
import { PreviewLibrary } from "./PreviewLibrary";
import { PreviewSettings } from "./PreviewSettings";
import { PreviewToolbar } from "./PreviewToolbar";
import type { PreviewAppearance, PreviewComponentGroup, PreviewScreen, PreviewView } from "./previewTypes";
import { usePreviewTheme } from "./usePreviewTheme";
import styles from "./PreviewWorkbench.module.css";

export interface PreviewWorkbenchProps {
  children: ReactNode;
  title: string;
  defaultTheme?: PreviewAppearance;
  defaultView?: PreviewView;
  screens?: readonly PreviewScreen[];
  componentGroups?: readonly PreviewComponentGroup[];
}

/** Bing-styled workspace for Library, Key screens, and Prototype previews. */
export function PreviewWorkbench({
  children,
  title,
  defaultTheme = "system",
  defaultView = "prototype",
  screens,
  componentGroups = [],
}: PreviewWorkbenchProps) {
  const [appearance, setAppearance] = useState<PreviewAppearance>(defaultTheme);
  const [view, setView] = useState<PreviewView>(defaultView);
  const [prototypeRevision, setPrototypeRevision] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [focusSettings, setFocusSettings] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsId = useId();
  const theme = usePreviewTheme(appearance);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    settingsButtonRef.current?.focus();
  }, []);

  return (
    <div className={styles.root} data-product="consumer" data-theme={theme}>
      <div className={styles.previewArea}>
        <PreviewToolbar
          view={view}
          onResetPrototype={() => setPrototypeRevision(revision => revision + 1)}
          settingsOpen={settingsOpen} settingsId={settingsId} settingsButtonRef={settingsButtonRef}
          onSettingsToggle={() => {
            if (settingsOpen) closeSettings();
            else {
              setFocusSettings(true);
              setSettingsOpen(true);
            }
          }}
        />
        <div className={styles.viewContent} hidden={view !== "prototype"}>
          <PhonePreview theme={theme}>
            <PreviewActivityProvider value={view === "prototype"}>
              <Fragment key={prototypeRevision}>{children}</Fragment>
            </PreviewActivityProvider>
          </PhonePreview>
        </div>
        {view === "keyscreens" && (
          <PreviewKeyScreens theme={theme} screens={screens ?? [{ id: "current", title, content: children }]} />
        )}
        {view === "library" && <PreviewLibrary theme={theme} groups={componentGroups} />}
      </div>
      {settingsOpen && (
        <PreviewSettings
          id={settingsId} view={view} appearance={appearance}
          focusOnMount={focusSettings} onViewChange={setView} onAppearanceChange={setAppearance} onClose={closeSettings}
        />
      )}
    </div>
  );
}
