import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRewardsSnapshot } from "./useRewardsSnapshot";

const snapshot = {
  accountEmail: "owner@example.com", availablePoints: 731, readyToClaim: 30, dailyStreakDays: 0,
  observedAt: "2026-01-01T10:00:00.000Z", source: "microsoft-rewards-dashboard",
};
const response = (data: unknown) => ({ ok: true, json: async () => ({ snapshot: data }) });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Rewards snapshot account lifecycle", () => {
  it("never requests a private account capture from a public host or the configured backend", () => {
    const deployedWindow = Object.create(window) as Window;
    Object.defineProperty(deployedWindow, "location", { value: new URL("https://elevendy-git.github.io/Bing-app/") });
    vi.stubGlobal("window", deployedWindow);
    vi.stubEnv("VITE_API_BASE_URL", "https://bing-backend.onrender.com");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const { result } = renderHook(() => useRewardsSnapshot(snapshot.accountEmail));
    expect(result.current).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("only requests data for a signed-in email and sends no credentials", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(snapshot));
    vi.stubGlobal("fetch", fetcher);
    const { result, rerender } = renderHook(({ email }) => useRewardsSnapshot(email), { initialProps: { email: "" } });
    expect(fetcher).not.toHaveBeenCalled();
    rerender({ email: " OWNER@EXAMPLE.COM " });
    await waitFor(() => expect(result.current?.availablePoints).toBe(731));
    expect(fetcher).toHaveBeenLastCalledWith("/api/rewards", expect.objectContaining({
      method: "POST", credentials: "omit", cache: "no-store", body: JSON.stringify({ accountEmail: snapshot.accountEmail }),
    }));
    rerender({ email: "" });
    expect(result.current).toBeNull();
  });

  it("clears old identity data immediately and ignores its late response", async () => {
    let finish!: (value: ReturnType<typeof response>) => void;
    const fetcher = vi.fn().mockResolvedValueOnce(response(snapshot)).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValue(response(null));
    vi.stubGlobal("fetch", fetcher);
    const { result, rerender } = renderHook(({ email }) => useRewardsSnapshot(email), { initialProps: { email: snapshot.accountEmail } });
    await waitFor(() => expect(result.current?.availablePoints).toBe(731));
    act(() => { window.dispatchEvent(new Event("focus")); });
    rerender({ email: "other@example.com" });
    expect(result.current).toBeNull();
    await act(async () => { finish(response(snapshot)); });
    expect(result.current).toBeNull();
  });

  it("retains the capture's timestamp on network failure, and clears it when disconnected", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(snapshot)).mockRejectedValueOnce(Error("offline")).mockResolvedValue(response(null));
    vi.stubGlobal("fetch", fetcher);
    const { result } = renderHook(() => useRewardsSnapshot(snapshot.accountEmail));
    await waitFor(() => expect(result.current?.observedAt).toBe(snapshot.observedAt));
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(result.current?.observedAt).toBe(snapshot.observedAt);
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(result.current).toBeNull();
  });
});
