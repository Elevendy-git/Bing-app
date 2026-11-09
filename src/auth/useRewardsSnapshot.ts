import { useEffect, useState } from "react";
import { normalizeRewardsAccount, parseRewardsSnapshot, REWARDS_PATH, type RewardsSnapshot } from "./rewards";

/** Refresh the locally captured data, never Microsoft's login session or Graph tokens. */
export function useRewardsSnapshot(accountEmail?: string) {
  const email = normalizeRewardsAccount(accountEmail || "");
  const [reading, setReading] = useState<{ email: string; snapshot: RewardsSnapshot | null } | null>(null);
  useEffect(() => {
    // The saved capture is private to this machine, never part of a public deployment.
    if (!email || !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)) { setReading(null); return; }
    let disposed = false;
    let request: AbortController | null = null;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      request?.abort();
      const current = new AbortController();
      request = current;
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}${REWARDS_PATH.slice(1)}`, {
          method: "POST", signal: current.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
          headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ accountEmail: email }),
        });
        if (!response.ok) return; // A previous capture keeps its original visible timestamp.
        const payload: unknown = await response.json();
        const snapshot = parseRewardsSnapshot(payload && typeof payload === "object" && "snapshot" in payload ? payload.snapshot : null);
        if (!disposed && !current.signal.aborted) setReading({ email, snapshot: snapshot?.accountEmail === email ? snapshot : null });
      } catch { /* No fallback numbers or automatic sign-in after an unavailable local connection. */ }
    };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 30_000);
    const onVisible = () => { void refresh(); };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true; request?.abort(); window.clearInterval(interval);
      window.removeEventListener("focus", onVisible); document.removeEventListener("visibilitychange", onVisible);
    };
  }, [email]);
  // Hide an old identity's reading in the same render, before effect cleanup runs.
  return email && reading?.email === email ? reading.snapshot : null;
}
