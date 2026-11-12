import { useCallback, useEffect, useRef, type RefObject } from "react";
import { animate, useReducedMotion } from "motion/react";
import { iosMotion } from "../../motion/iosMotion";

export const HOMEPAGE_SEARCH_TRAVEL = 332;
// Shareout 1:20253: composer y=62, Glance cards y=138, feed y=238.
export const HOMEPAGE_SCROLL_DOWN = 384;
const SCROLL_IDLE_MS = 60;

/** Settle a downward hero gesture into the supplied scrolled screen, without snapping the feed. */
export function useHomepageScrollSnap(
  scrollRef: RefObject<HTMLDivElement>,
  onPositionChange: (position: number) => void,
  enabled: boolean,
  { searchTravel = HOMEPAGE_SEARCH_TRAVEL, scrollDown = HOMEPAGE_SCROLL_DOWN }: {
    searchTravel?: number;
    scrollDown?: number;
  } = {},
) {
  const reducedMotion = useReducedMotion();
  const returnToTop = useRef<() => void>(() => {});

  useEffect(() => {
    const content = scrollRef.current;
    if (!content || !enabled) return;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let animation: { stop: () => void } | undefined;
    let direction = 0;
    let held = false;
    let touchY: number | undefined;

    const cancel = () => {
      clearTimeout(idle);
      animation?.stop();
      animation = undefined;
    };
    const update = (position: number) => {
      content.scrollTop = position;
      // Use the same frame for the native cards and the separate fixed composer.
      onPositionChange(content.scrollTop);
    };
    returnToTop.current = () => {
      cancel();
      direction = 0;
      held = false;
      if (reducedMotion || content.scrollTop <= 0) { update(0); return; }
      animation = animate(content.scrollTop, 0, {
        ...iosMotion.navigation,
        onUpdate: update,
        onComplete: () => { animation = undefined; update(0); },
      });
    };
    const settle = () => {
      const position = content.scrollTop;
      if (held || animation || direction <= 0 || position < searchTravel * 0.3 || position >= scrollDown
        || !content.clientHeight || content.scrollHeight - content.clientHeight < scrollDown
        || content.closest("[inert], [hidden]")) return;
      direction = 0;
      if (reducedMotion) {
        update(scrollDown);
        return;
      }
      animation = animate(position, scrollDown, {
        ...iosMotion.scrollSnap,
        onUpdate: update,
        onComplete: () => { animation = undefined; update(scrollDown); },
      });
    };
    const schedule = () => {
      clearTimeout(idle);
      if (!held && !animation && direction > 0) idle = setTimeout(settle, SCROLL_IDLE_MS);
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      cancel();
      direction = Math.sign(event.deltaY);
      schedule();
    };
    const onPointerDown = () => { cancel(); direction = 0; held = true; };
    const onPointerUp = () => { held = false; schedule(); };
    const onPointerCancel = (event: PointerEvent) => {
      // Touch scrolling normally cancels Pointer Events; touchend still owns release.
      if (event.pointerType === "touch") return;
      cancel(); held = false; direction = 0;
    };
    const onTouchStart = (event: TouchEvent) => {
      cancel();
      held = true;
      direction = 0;
      touchY = event.touches.length === 1 ? event.touches[0].clientY : undefined;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchY === undefined || event.touches.length !== 1) return;
      const nextY = event.touches[0].clientY;
      if (nextY !== touchY) direction = Math.sign(touchY - nextY);
      touchY = nextY;
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length) return;
      touchY = undefined;
      held = false;
      schedule();
    };
    const onTouchCancel = () => { cancel(); touchY = undefined; held = false; direction = 0; };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target !== content) return;
      const down = ["ArrowDown", "PageDown", "End"].includes(event.key) || (event.key === " " && !event.shiftKey);
      const up = ["ArrowUp", "PageUp", "Home"].includes(event.key) || (event.key === " " && event.shiftKey);
      if (!down && !up) return;
      cancel();
      direction = down ? 1 : -1;
      schedule();
    };
    content.addEventListener("scroll", schedule, { passive: true });
    content.addEventListener("wheel", onWheel, { passive: true });
    content.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true });
    // Touch scrolling cancels Pointer Events; Touch Events retain the actual finger-up boundary.
    content.addEventListener("touchstart", onTouchStart, { passive: true });
    content.addEventListener("touchmove", onTouchMove, { passive: true });
    content.addEventListener("touchend", onTouchEnd, { passive: true });
    content.addEventListener("touchcancel", onTouchCancel, { passive: true });
    content.addEventListener("keydown", onKeyDown);
    return () => {
      cancel();
      returnToTop.current = () => {};
      content.removeEventListener("scroll", schedule);
      content.removeEventListener("wheel", onWheel);
      content.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      content.removeEventListener("touchstart", onTouchStart);
      content.removeEventListener("touchmove", onTouchMove);
      content.removeEventListener("touchend", onTouchEnd);
      content.removeEventListener("touchcancel", onTouchCancel);
      content.removeEventListener("keydown", onKeyDown);
    };
  }, [scrollRef, onPositionChange, enabled, reducedMotion, searchTravel, scrollDown]);

  return useCallback(() => returnToTop.current(), []);
}
