export const REWARDS_PATH = "/api/rewards";

/** A read-only capture from an explicitly signed-in Rewards dashboard. No credentials. */
export interface RewardsSnapshot {
  accountEmail: string;
  availablePoints: number;
  readyToClaim: number | null;
  dailyStreakDays: number | null;
  observedAt: string;
  source: "microsoft-rewards-dashboard";
}

export const normalizeRewardsAccount = (email: string) => email.trim().toLowerCase();
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

/** Validate and whitelist fields so saved page text or credentials never reach the UI. */
export function parseRewardsSnapshot(value: unknown): RewardsSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.accountEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.accountEmail.trim())
    || !count(data.availablePoints) || !(data.readyToClaim === null || count(data.readyToClaim))
    || !(data.dailyStreakDays === null || count(data.dailyStreakDays))
    || data.source !== "microsoft-rewards-dashboard" || typeof data.observedAt !== "string"
    || !Number.isFinite(Date.parse(data.observedAt)) || Date.parse(data.observedAt) > Date.now() + 300_000) return null;
  return {
    accountEmail: normalizeRewardsAccount(data.accountEmail), availablePoints: data.availablePoints,
    readyToClaim: data.readyToClaim, dailyStreakDays: data.dailyStreakDays,
    observedAt: new Date(data.observedAt).toISOString(), source: data.source,
  };
}
