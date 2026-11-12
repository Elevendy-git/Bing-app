import { PREVIEW_VIEWS, type PreviewView } from "./previewTypes";
import styles from "./PreviewWorkbench.module.css";

/** The same workbench views stay available when the side panels collapse. */
export function PreviewViewSwitcher({ view, onChange }: { view: PreviewView; onChange: (view: PreviewView) => void }) {
  return <div className={styles.viewOptions} role="group" aria-label="Preview view">
    {PREVIEW_VIEWS.map(option => <button key={option.value} type="button" className={styles.viewOption}
      aria-label={option.label} aria-pressed={view === option.value} onClick={() => onChange(option.value)}>
      {option.value === "keyscreens" ? "Screens" : option.label}
    </button>)}
  </div>;
}
