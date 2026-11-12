import { createContext, useContext, useMemo, type ReactNode } from "react";
import styles from "./PreviewWorkbench.module.css";

interface ResponsiveNavigationState {
  compact: boolean;
  open: boolean;
  id: string;
  onClose: () => void;
}

const ResponsiveNavigationContext = createContext<ResponsiveNavigationState>({
  compact: false,
  open: false,
  id: "",
  onClose: () => {},
});

export function ResponsiveNavigationProvider({ compact, open, id, onClose, children }: ResponsiveNavigationState & { children: ReactNode }) {
  const value = useMemo(() => ({ compact, open, id, onClose }), [compact, open, id, onClose]);
  return <ResponsiveNavigationContext.Provider value={value}>{children}</ResponsiveNavigationContext.Provider>;
}

/** One navigation tree serves the sidebar and the compact inline disclosure. */
export function useResponsiveNavigation() {
  return useContext(ResponsiveNavigationContext);
}

export function ResponsiveSidebar({ label, variant = "prototype", children }: {
  label: string;
  variant?: "prototype" | "library";
  children: ReactNode;
}) {
  const { compact, open, id, onClose } = useResponsiveNavigation();
  const navigation = variant === "library"
    ? <nav className={styles.libraryNavigation} aria-label={label} data-responsive-sidebar={compact ? variant : undefined}>{children}</nav>
    : <aside className={styles.sidebar} aria-label={label} data-responsive-sidebar={compact ? variant : undefined}>{children}</aside>;

  return compact
    ? <div id={id} className={styles.compactNavigationPanel} role="region" aria-label="Workbench navigation" hidden={!open}
        onKeyDown={event => {
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}>{navigation}</div>
    : navigation;
}
