import { IOS_METRICS } from "../../components/IOSNative/iosMetrics";

export interface SearchTransitionOrigin {
  kind: "home" | "serp";
  offsetY: number;
  height: number;
  /** Space reserved beside the field, in unscaled phone coordinates. */
  insetEnd: number;
  compact?: boolean;
  value: string;
  theme?: "light" | "dark";
  privateMode?: boolean;
}

/** Measure the actual composer so device sizing and workbench zoom share one path. */
export function measureSearchOrigin(screen: HTMLElement | null, kind: SearchTransitionOrigin["kind"], value?: string): SearchTransitionOrigin | null {
  const composer = screen?.querySelector<HTMLElement>(kind === "home" ? '[role="search"]' : '[data-variant="serp"]');
  if (!screen || !composer) return null;
  const bounds = screen.getBoundingClientRect();
  const box = composer.getBoundingClientRect();
  const scale = screen.offsetWidth && bounds.width ? bounds.width / screen.offsetWidth : 1;
  const inset = parseFloat(getComputedStyle(screen).getPropertyValue("--gnrc-layout-search-inset")) || 16;
  const local = (value: number) => Math.round(value * 1000) / 1000;
  return {
    kind,
    offsetY: box.height ? local((box.top - bounds.top) / scale - IOS_METRICS.statusBarHeight) : 0,
    height: box.height ? local(box.height / scale) : kind === "serp" ? 48 : 56,
    insetEnd: box.width ? local(Math.max(0, screen.offsetWidth - 2 * inset - box.width / scale)) : 0,
    compact: composer.dataset.compact === "true",
    value: value ?? composer.querySelector<HTMLInputElement>("input")?.value ?? "",
    theme: composer.closest('[data-theme]')?.getAttribute("data-theme") === "dark" ? "dark" : "light",
    privateMode: composer.closest('[data-private-mode]')?.getAttribute("data-private-mode") === "true",
  };
}
