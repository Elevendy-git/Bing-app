import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowCounterclockwise20Regular, Settings20Regular } from "@fluentui/react-icons";
import { PhonePreview } from "./PhonePreview";
import { PreviewActivityProvider } from "./PreviewActivity";
import { PreviewKeyScreens } from "./PreviewKeyScreens";
import { PreviewLibrary } from "./PreviewLibrary";
import { PreviewSettings } from "./PreviewSettings";
import { PreviewWorkbenchBrand } from "./PreviewWorkbenchBrand";
import { CompactWorkbenchToolbar } from "./CompactWorkbenchToolbar";
import { WorkbenchSheet } from "./WorkbenchSheet";
import { useCompactWorkbench } from "./useCompactWorkbench";
import { useWorkbenchViewport } from "./useWorkbenchViewport";
import {
  PREVIEW_PROTOTYPE_PAGES, PreviewPrototypeNavigationProvider, PreviewPrototypeNavigationTarget,
  usePreviewPrototypeNavigation,
} from "./PreviewPrototypeNavigation";
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

/** Shared workspace for the live Prototype, Key screens and component Library. */
export function PreviewWorkbench({
  ...props
}: PreviewWorkbenchProps) {
  return <PreviewPrototypeNavigationProvider><WorkbenchContent {...props} /></PreviewPrototypeNavigationProvider>;
}

function WorkbenchContent({
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
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const compact = useCompactWorkbench();
  const viewportStyle = useWorkbenchViewport(compact);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsId = useId();
  const theme = usePreviewTheme(appearance);
  const { currentPage, requestNavigation, available } = usePreviewPrototypeNavigation();
  const pageTitle = PREVIEW_PROTOTYPE_PAGES.find(item => item.id === currentPage)?.label
    ?? (currentPage === "serp" ? "Search results" : currentPage === "settings" ? "Settings"
      : currentPage === "voice" || currentPage === "voice-language" ? "Voice search" : title === "Homepage" ? "Home" : title);
  const inspectorTitle = view === "prototype" ? pageTitle : view === "keyscreens" ? "Key screens" : "Library";
  const resetPrototype = () => setPrototypeRevision(revision => revision + 1);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);
  const closeMobileSettings = useCallback(() => setMobileSettingsOpen(false), []);
  useEffect(() => { if (!compact) setMobileSettingsOpen(false); }, [compact]);
  useEffect(() => {
    if (!compact && !settingsOpen) settingsButtonRef.current?.focus();
  }, [compact, settingsOpen]);

  return (
    <div className={styles.root} data-product="consumer" data-theme={theme} data-view={view} style={viewportStyle}>
      {compact && <CompactWorkbenchToolbar view={view} onViewChange={setView}
        page={currentPage} pageTitle={currentPage === "serp" ? "IAB" : pageTitle} navigationAvailable={available} onNavigate={requestNavigation}
        settingsId={settingsId} settingsOpen={mobileSettingsOpen} onOpenSettings={() => setMobileSettingsOpen(true)} />}
      {!compact && view === "prototype" && <aside className={styles.sidebar} aria-label="Prototype navigation">
        <PreviewWorkbenchBrand />
        <div className={styles.sidebarBody}>
          <nav className={styles.navigationTree} aria-label="Prototype pages">
            {PREVIEW_PROTOTYPE_PAGES.map(item => <button key={item.id} type="button" className={styles.navigationItem}
              aria-label={`Open ${item.label} page`}
              aria-current={currentPage === item.id || (!currentPage && item.id === "home") ? "page" : undefined}
              disabled={!available} onClick={() => requestNavigation(item.id)}>{item.label}</button>)}
          </nav>
        </div>
      </aside>}
      <div className={styles.previewArea}>
        <div className={styles.collapsedToolbar} hidden={compact || settingsOpen}>
          {view === "prototype" && <button type="button" className={styles.iconButton} aria-label="Reset prototype"
            title="Clear prototype activity and return to Homepage" onClick={resetPrototype}>
            <ArrowCounterclockwise20Regular aria-hidden="true" />
          </button>}
          <button ref={settingsButtonRef} type="button" className={styles.iconButton} aria-label="Open settings"
            aria-expanded={settingsOpen} aria-controls={settingsId} onClick={() => {
              setFocusSettings(true);
              setSettingsOpen(true);
            }}><Settings20Regular aria-hidden="true" /></button>
        </div>
        <div className={styles.viewContent} hidden={view !== "prototype"}>
          <PhonePreview theme={theme}>
            <PreviewActivityProvider value={view === "prototype"}>
              <PreviewPrototypeNavigationTarget>
                <Fragment key={prototypeRevision}>{children}</Fragment>
              </PreviewPrototypeNavigationTarget>
            </PreviewActivityProvider>
          </PhonePreview>
        </div>
        {view === "keyscreens" && (
          <PreviewKeyScreens theme={theme} screens={screens ?? [{ id: "current", title, content: children }]}
            navigationHeader={<PreviewWorkbenchBrand />} />
        )}
        {view === "library" && <PreviewLibrary theme={theme} groups={componentGroups} navigationHeader={<PreviewWorkbenchBrand />} />}
      </div>
      {!compact && settingsOpen && (
        <PreviewSettings
          id={settingsId} view={view} appearance={appearance}
          title={inspectorTitle} onResetPrototype={resetPrototype}
          focusOnMount={focusSettings} onViewChange={setView} onAppearanceChange={setAppearance} onClose={closeSettings}
        />
      )}
      {compact && <WorkbenchSheet id={settingsId} title="Inspector" open={mobileSettingsOpen} onClose={closeMobileSettings}>
        <PreviewSettings id={`${settingsId}-content`} view={view} appearance={appearance}
          title={inspectorTitle} onResetPrototype={() => { resetPrototype(); closeMobileSettings(); }}
          focusOnMount={false} onViewChange={setView} onAppearanceChange={setAppearance} onClose={closeMobileSettings}
          embedded responsiveDevice={view === "prototype"} />
      </WorkbenchSheet>}
    </div>
  );
}
