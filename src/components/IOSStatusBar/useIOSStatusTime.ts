import { useSyncExternalStore } from "react";

export function formatIOSStatusTime(date: Date, locales?: Intl.LocalesArgument): string {
  // Resolve the current locale/time zone again after system settings change.
  // iOS status artwork omits the day period even in a 12-hour locale.
  return new Intl.DateTimeFormat(locales, { hour: "numeric", minute: "2-digit" }).formatToParts(date)
    .filter(part => part.type === "hour" || part.type === "minute")
    .map(part => part.value).join(":");
}

let systemTime = formatIOSStatusTime(new Date());
let timer: number | undefined;
const listeners = new Set<() => void>();
const getSnapshot = () => systemTime;
const noSubscription = () => () => {};

function syncSystemTime() {
  window.clearTimeout(timer);
  const now = new Date();
  const next = formatIOSStatusTime(now);
  if (next !== systemTime) {
    systemTime = next;
    listeners.forEach(listener => listener());
  }
  if (listeners.size) {
    const elapsed = now.getSeconds() * 1000 + now.getMilliseconds();
    timer = window.setTimeout(syncSystemTime, 60_000 - elapsed);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("focus", syncSystemTime);
    window.addEventListener("pageshow", syncSystemTime);
    window.addEventListener("languagechange", syncSystemTime);
    document.addEventListener("visibilitychange", syncSystemTime);
    syncSystemTime();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    window.clearTimeout(timer);
    window.removeEventListener("focus", syncSystemTime);
    window.removeEventListener("pageshow", syncSystemTime);
    window.removeEventListener("languagechange", syncSystemTime);
    document.removeEventListener("visibilitychange", syncSystemTime);
  };
}

/** All live screen instances share one clock; fixed design specimens subscribe to nothing. */
export function useIOSStatusTime(timeSource: "fixed" | "system", fixedTime: string) {
  const systemTime = useSyncExternalStore(timeSource === "system" ? subscribe : noSubscription, getSnapshot, getSnapshot);
  return timeSource === "system" ? systemTime : fixedTime;
}
