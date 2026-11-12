import { useLayoutEffect, useState, type CSSProperties } from "react";

/** Follow the visible browser canvas when a mobile keyboard or browser bar resizes it. */
export function useWorkbenchViewport(compact: boolean): CSSProperties | undefined {
  const [viewport, setViewport] = useState<{ height: number; top: number; width: number; restingHeight: number }>();
  useLayoutEffect(() => {
    if (!compact || !window.visualViewport) {
      setViewport(undefined);
      return;
    }
    const visual = window.visualViewport;
    const update = () => {
      // Pinch zoom owns its own viewport. Do not reflow the app during magnification.
      if (Math.abs(visual.scale - 1) > 0.01 || visual.height <= 0) return;
      const height = Math.round(visual.height);
      const top = Math.max(0, Math.round(visual.offsetTop));
      const width = Math.round(visual.width);
      setViewport(previous => {
        const restingHeight = previous?.width === width ? Math.max(previous.restingHeight, height) : height;
        return previous?.height === height && previous.top === top && previous.width === width
          ? previous : { height, top, width, restingHeight };
      });
    };
    update();
    visual.addEventListener("resize", update);
    visual.addEventListener("scroll", update);
    return () => {
      visual.removeEventListener("resize", update);
      visual.removeEventListener("scroll", update);
    };
  }, [compact]);
  return compact && viewport ? {
    "--gnrc-workbench-height": `${viewport.height}px`,
    "--gnrc-workbench-top": `${viewport.top}px`,
    "--gnrc-workbench-resting-height": `${viewport.restingHeight}px`,
  } as CSSProperties : undefined;
}
