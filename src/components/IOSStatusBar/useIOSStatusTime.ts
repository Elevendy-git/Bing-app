import { useEffect, useState } from "react";

const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export function formatIOSStatusTime(date: Date): string {
  return timeFormat.formatToParts(date)
    .filter((part) => part.type === "hour" || part.type === "minute" || part.value === ":")
    .map((part) => part.value).join("");
}

export function useIOSStatusTime(timeSource: "fixed" | "system", fixedTime: string) {
  const [systemTime, setSystemTime] = useState(() => formatIOSStatusTime(new Date()));

  useEffect(() => {
    if (timeSource !== "system") return;
    let timer: number | undefined;
    const updateAtMinuteBoundary = () => {
      const now = new Date();
      setSystemTime(formatIOSStatusTime(now));
      const elapsed = now.getSeconds() * 1000 + now.getMilliseconds();
      timer = window.setTimeout(updateAtMinuteBoundary, 60_000 - elapsed);
    };
    updateAtMinuteBoundary();
    return () => window.clearTimeout(timer);
  }, [timeSource]);

  return timeSource === "system" ? systemTime : fixedTime;
}
