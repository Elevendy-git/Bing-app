import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

export const PREVIEW_PROTOTYPE_PAGES = [
  { id: "home", label: "Home" },
  { id: "profile", label: "Profile" },
  { id: "recent", label: "Recent" },
  { id: "tabs", label: "Tabs" },
  { id: "history", label: "History" },
  { id: "bookmark", label: "Bookmark" },
  { id: "search", label: "Search" },
] as const;

export type PreviewPrototypePage = typeof PREVIEW_PROTOTYPE_PAGES[number]["id"];
export type PreviewPrototypeCurrentPage = PreviewPrototypePage | "serp" | "settings" | "voice" | "voice-language";
interface Registration {
  currentPage: PreviewPrototypeCurrentPage;
  enabled: boolean;
  navigate: (page: PreviewPrototypePage) => void;
}
interface Navigation {
  currentPage: PreviewPrototypeCurrentPage | null;
  available: boolean;
  requestNavigation: (page: PreviewPrototypePage) => void;
}
type Register = (registration: Registration) => () => void;
const emptyNavigation: Navigation = { currentPage: null, available: false, requestNavigation: () => {} };
const NavigationContext = createContext<Navigation>(emptyNavigation);
const RegistrationContext = createContext<Register | null>(null);
const TargetContext = createContext<Register | null>(null);

/** The workbench forwards commands; the mounted prototype remains the route owner. */
export function PreviewPrototypeNavigationProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const latest = useRef<Registration | null>(null);
  const register = useCallback<Register>(next => {
    latest.current = next;
    setRegistration(next);
    return () => {
      if (latest.current !== next) return;
      latest.current = null;
      setRegistration(null);
    };
  }, []);
  const requestNavigation = useCallback((page: PreviewPrototypePage) => {
    if (PREVIEW_PROTOTYPE_PAGES.some(option => option.id === page) && latest.current?.enabled) latest.current.navigate(page);
  }, []);
  const navigation = useMemo<Navigation>(() => ({ currentPage: registration?.currentPage ?? null,
    available: registration?.enabled ?? false, requestNavigation }), [registration, requestNavigation]);
  return <RegistrationContext.Provider value={register}>
    <NavigationContext.Provider value={navigation}>{children}</NavigationContext.Provider>
  </RegistrationContext.Provider>;
}

/** Scope registration to the retained phone, excluding independent Key screens. */
export function PreviewPrototypeNavigationTarget({ children }: { children: ReactNode }) {
  const register = useContext(RegistrationContext);
  return <TargetContext.Provider value={register}>{children}</TargetContext.Provider>;
}

export function usePreviewPrototypeNavigation(): Navigation {
  return useContext(NavigationContext);
}

/** A missing workbench/target leaves standalone and gallery prototypes unchanged. */
export function usePublishPreviewPrototypeNavigation(currentPage: PreviewPrototypeCurrentPage,
  navigate: (page: PreviewPrototypePage) => void, enabled = true): void {
  const register = useContext(TargetContext);
  const latest = useRef(navigate); latest.current = navigate;
  useLayoutEffect(() => register?.({ currentPage, enabled, navigate: page => latest.current(page) }), [register, currentPage, enabled]);
}
