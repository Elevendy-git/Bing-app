import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { animate, MotionConfig, motion, useIsPresent, useMotionValue, usePresence, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { iosMotion } from "./iosMotion";

/** Exiting artwork remains visible but must no longer accept actions or focus. */
export const MotionPresence = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(function MotionPresence(props, ref) {
  const present = useIsPresent();
  return <motion.div {...props} ref={ref} aria-hidden={!present || props["aria-hidden"]}
    {...(!present ? { inert: "" } : {})} data-exiting={!present || undefined} />;
});

/** Own the opacity timeline so a restored mode reverses its in-flight exit. */
export const CrossfadeContent = forwardRef<HTMLDivElement, { children: ReactNode; className?: string; enabled: boolean; enter: boolean }>(
  function CrossfadeContent({ children, className, enabled, enter }, ref) {
    const [present, remove] = usePresence();
    const opacity = useMotionValue(enter ? 0 : 1);
    const reducedMotion = useReducedMotion();
    useEffect(() => {
      let cancelled = false;
      const animation = animate(opacity, present ? 1 : 0, enabled && !reducedMotion ? iosMotion.pageFade : iosMotion.instant);
      if (!present) animation.then(() => { if (!cancelled) remove?.(); });
      return () => { cancelled = true; animation.stop(); };
    }, [present, enabled, reducedMotion, opacity, remove]);
    return <motion.div ref={ref} className={className} style={{ opacity }} aria-hidden={!present || undefined}
      {...(!present ? { inert: "" } : {})}>{children}</motion.div>;
  },
);

/** Rows collapse in normal flow, so text is never stretched by layout projection. */
export function CollapsingContent({ enabled = false, children, ...props }: HTMLMotionProps<"div"> & { enabled?: boolean }) {
  const reducedMotion = useReducedMotion();
  return <MotionPresence {...props} initial={false} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
    style={{ minWidth: 0, overflow: "hidden", ...props.style }}
    transition={enabled && !reducedMotion ? { height: iosMotion.listCollapse, opacity: iosMotion.itemExit } : iosMotion.instant}>
    {children}
  </MotionPresence>;
}

/** Normalize layout animation measurements to device pixels, not the workbench zoom. */
export function MotionLayout({ children, ...props }: HTMLMotionProps<"div">) {
  const root = useRef<HTMLDivElement>(null);
  const localPoint = useCallback((point: { x: number; y: number }) => {
    const element = root.current;
    const scale = element?.clientWidth ? element.getBoundingClientRect().width / element.clientWidth : 1;
    return scale ? { x: point.x / scale, y: point.y / scale } : point;
  }, []);
  return <MotionConfig transformPagePoint={localPoint}><motion.div {...props} ref={root}>{children}</motion.div></MotionConfig>;
}

/** Retain modal ownership until the visual exit ends; a reversal keeps the lock. */
export function useOverlayPresence(open: boolean, onClosed?: () => void) {
  const [retained, setRetained] = useState(open);
  const latest = useRef({ open, onClosed });
  const focusFrame = useRef<number>();
  useLayoutEffect(() => {
    latest.current = { open, onClosed };
    if (open) {
      setRetained(true);
      cancelAnimationFrame(focusFrame.current ?? 0);
    }
  }, [open, onClosed]);
  useLayoutEffect(() => () => cancelAnimationFrame(focusFrame.current ?? 0), []);
  const finishExit = useCallback(() => {
    if (latest.current.open) return;
    setRetained(false);
    // Focus after React releases the background's inert state.
    cancelAnimationFrame(focusFrame.current ?? 0);
    focusFrame.current = requestAnimationFrame(() => {
      if (!latest.current.open) latest.current.onClosed?.();
    });
  }, []);
  return { presented: open || retained, finishExit };
}

/** Retain screens through fades and navigation returns, including interrupted exits. */
export const ScreenLayer = forwardRef<HTMLDivElement, HTMLMotionProps<"div"> & {
  visible: boolean; children: ReactNode; exitToRight?: boolean; immediate?: boolean; onHidden?: () => void;
}>(
  function ScreenLayer({ visible, children, exitToRight = false, immediate = false, onHidden, ...props }, ref) {
    const reducedMotion = useReducedMotion();
    const opacity = useMotionValue(visible ? 1 : 0);
    const x = useMotionValue("0%");
    const hiddenCallback = useRef(onHidden); hiddenCallback.current = onHidden;
    useLayoutEffect(() => {
      if (reducedMotion || immediate) {
        opacity.jump(visible ? 1 : 0);
        x.jump("0%");
        if (!visible) hiddenCallback.current?.();
        return;
      }
      let cancelled = false;
      const popping = !visible && exitToRight && opacity.get() > 0;
      const fade = animate(opacity, visible || popping ? 1 : 0, iosMotion.pageFade);
      const slide = visible || popping ? animate(x, popping ? "100%" : "0%", iosMotion.navigation) : undefined;
      void (slide ?? fade).then(() => {
        if (cancelled || visible) return;
        // Reset only after the screen is hidden; its document and scroll stay mounted.
        opacity.jump(0);
        x.jump("0%");
        hiddenCallback.current?.();
      });
      return () => { cancelled = true; fade.stop(); slide?.stop(); };
    }, [visible, exitToRight, immediate, reducedMotion, opacity, x]);
    return <motion.div {...props} ref={ref} initial={false}
      style={{ opacity, x, visibility: "visible", pointerEvents: visible ? undefined : "none", ...props.style }}>{children}</motion.div>;
  },
);
