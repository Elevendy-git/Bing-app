import { ChevronDown20Regular, Settings20Regular } from "@fluentui/react-icons";
import { PREVIEW_VIEWS, type PreviewView } from "./previewTypes";
import { PREVIEW_PROTOTYPE_PAGES, type PreviewPrototypeCurrentPage } from "./PreviewPrototypeNavigation";
import styles from "./PreviewWorkbench.module.css";

const logo = new URL("../AppSearchBox/assets/bing.svg", import.meta.url).href;

export function CompactWorkbenchToolbar({ view, onViewChange, page, pageTitle, navigationAvailable, onNavigate, settingsId, settingsOpen, onOpenSettings }: {
  view: PreviewView;
  onViewChange: (view: PreviewView) => void;
  page: PreviewPrototypeCurrentPage | null;
  pageTitle: string;
  navigationAvailable: boolean;
  onNavigate: (page: typeof PREVIEW_PROTOTYPE_PAGES[number]["id"]) => void;
  settingsId: string;
  settingsOpen: boolean;
  onOpenSettings: () => void;
}) {
  const selectedPage = page ?? "home";
  const knownPage = PREVIEW_PROTOTYPE_PAGES.some(item => item.id === selectedPage);
  return <header className={styles.compactToolbar} aria-label="Workbench controls">
    <img className={styles.compactLogo} src={logo} alt="Bing App" width={28} height={28} />
    <label className={styles.compactSelect}>
      <select aria-label="Workbench view" value={view} onChange={event => onViewChange(event.target.value as PreviewView)}>
        {PREVIEW_VIEWS.map(option => <option key={option.value} value={option.value}>
          {option.value === "keyscreens" ? "Screens" : option.label}
        </option>)}
      </select>
      <ChevronDown20Regular aria-hidden="true" />
    </label>
    {view === "prototype" && <label className={`${styles.compactSelect} ${styles.compactPageSelect}`}>
      <select aria-label="Prototype page" value={selectedPage} disabled={!navigationAvailable}
        onChange={event => {
          const target = PREVIEW_PROTOTYPE_PAGES.find(item => item.id === event.target.value);
          if (target) onNavigate(target.id);
        }}>
        {!knownPage && <option value={selectedPage}>{pageTitle}</option>}
        {PREVIEW_PROTOTYPE_PAGES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <ChevronDown20Regular aria-hidden="true" />
    </label>}
    <button type="button" className={styles.compactInspectorButton} aria-label="Open inspector"
      aria-haspopup="dialog" aria-expanded={settingsOpen} aria-controls={settingsId} onClick={onOpenSettings}>
      <Settings20Regular aria-hidden="true" />
    </button>
  </header>;
}
