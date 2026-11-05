import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MotionPresence, useOverlayPresence } from "../../motion/MotionPresence";
import { iosMenuMotion, iosMotion } from "../../motion/iosMotion";
import { IOS_METRICS } from "../IOSNative/iosMetrics";
import styles from "./AnchoredMenu.module.css";

export type AnchoredMenuState = { kind: "page" } | { kind: "item"; entryId: string; top: number; right: number };

export interface ItemMenuGeometry {
  height: number;
  overlap?: number;
  /** Space occupied by the safe area, footer or keyboard, in device pixels. */
  bottomInset?: number;
}

export function itemMenuPosition(screen: HTMLElement, button: HTMLElement,
  { height, overlap = 2, bottomInset = IOS_METRICS.bottomSafeArea }: ItemMenuGeometry) {
  const bounds = screen.getBoundingClientRect();
  const target = button.getBoundingClientRect();
  const scale = screen.offsetWidth && bounds.width ? bounds.width / screen.offsetWidth : 1;
  const bottomLimit = screen.clientHeight - bottomInset - 8;
  let top = (target.bottom - bounds.top) / scale - overlap;
  if (top + height > bottomLimit) top = (target.top - bounds.top) / scale - height + overlap;
  return { top: Math.max(IOS_METRICS.statusBarHeight + 56, top), right: (bounds.right - target.right) / scale + 6 };
}

/** Own menu state, anchoring and focus restoration after the background unlocks. */
export function useAnchoredMenu({ root, fallback, active = true, initialState = null }: {
  root: RefObject<HTMLElement>;
  fallback: RefObject<HTMLElement>;
  active?: boolean;
  initialState?: AnchoredMenuState | null;
}) {
  const [state, setState] = useState(initialState);
  const trigger = useRef<HTMLElement | null>(null);
  const id = useId();
  const overlay = useOverlayPresence(Boolean(state));
  useLayoutEffect(() => {
    if (overlay.presented || !trigger.current) return;
    // Wait for the committed background unlock and pointer defaults. Reopening
    // or leaving the screen cancels this callback before it can steal focus.
    const frame = requestAnimationFrame(() => {
      const previous = trigger.current;
      trigger.current = null;
      if (!active || !previous || root.current?.closest("[inert], [hidden]")) return;
      const target = previous.isConnected && !previous.closest("[inert], [hidden]") ? previous : fallback.current;
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [active, overlay.presented, root, fallback]);
  useEffect(() => { if (!active) setState(null); }, [active]);
  const close = useCallback((restoreToContent = false) => {
    if (restoreToContent) trigger.current = fallback.current;
    setState(null);
  }, [fallback]);
  const openPage = (button: HTMLElement) => {
    if (!active) return;
    trigger.current = button;
    setState({ kind: "page" });
  };
  const openItem = (entryId: string, button: HTMLElement, geometry: ItemMenuGeometry) => {
    if (!active || !root.current) return;
    trigger.current = button;
    setState({ kind: "item", entryId, ...itemMenuPosition(root.current, button, geometry) });
  };
  return { state, id, close, openPage, openItem, ...overlay, initiallyOpen: Boolean(initialState) };
}

/** Shared menu surface. MenuList owns keyboard navigation and Escape dismissal. */
export function AnchoredMenu({ menu, interactive = false, layer = 4, children }: {
  menu: ReturnType<typeof useAnchoredMenu>;
  interactive?: boolean;
  layer?: number;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const { state, initiallyOpen } = menu;
  const transition = reducedMotion ? iosMotion.instant : iosMotion.control;
  const resting = iosMenuMotion.expanded;
  const collapsed = reducedMotion ? resting : iosMenuMotion.collapsed;
  return <AnimatePresence onExitComplete={menu.finishExit}>
    {state && <MotionPresence className={styles.menuLayer} style={{ zIndex: layer }}
      initial={initiallyOpen ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
      <div className={styles.dismissArea} aria-hidden="true" onPointerDown={interactive ? event => {
        event.preventDefault();
        menu.close();
      } : undefined} />
      <motion.div className={styles.menuAnchor} style={state.kind === "item" ? { top: state.top, right: state.right } : undefined}
        initial={initiallyOpen ? false : collapsed} animate={resting} exit={collapsed} transition={transition}>
        {children}
      </motion.div>
    </MotionPresence>}
  </AnimatePresence>;
}
