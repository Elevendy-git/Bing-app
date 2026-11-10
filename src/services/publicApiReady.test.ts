import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const healthy = () => ({ ok: true, status: 200, json: async () => ({ status: "ok" }) }) as Response;
const unavailable = () => ({ ok: false, status: 503 }) as Response;
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
const service = async () => (await import("./publicApiReady")).awaitPublicApiReady;

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", "https://backend.onrender.com");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(healthy()));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("public API readiness", () => {
  it.each(["", "  ", "http://localhost:3000", "http://127.0.0.1:3000"])("keeps local API configuration %j immediate", async base => {
    vi.stubEnv("VITE_API_BASE_URL", base);
    const ready = await service();
    await ready(new AbortController().signal);
    expect(fetch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shares an anonymous health request between callers, caches success ten minutes, and never sends queries", async () => {
    const reply = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(reply.promise);
    const ready = await service();
    const first = ready(new AbortController().signal), second = ready(new AbortController().signal);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith("https://backend.onrender.com/health", expect.objectContaining({
      signal: expect.any(AbortSignal), credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", headers: { Accept: "application/json" },
    }));
    reply.resolve(healthy());
    await Promise.all([first, second]);
    await vi.advanceTimersByTimeAsync(599_999);
    await ready(new AbortController().signal);
    expect(fetch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    await ready(new AbortController().signal);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps independent service bases separate and preserves a configured base path", async () => {
    const firstReply = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(firstReply.promise);
    const ready = await service();
    const first = ready(new AbortController().signal);
    vi.stubEnv("VITE_API_BASE_URL", "https://other.example/service/");
    await ready(new AbortController().signal);
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      "https://backend.onrender.com/health", "https://other.example/service/health",
    ]);
    firstReply.resolve(healthy());
    await first;
  });

  it("cancels a subscriber without cancelling another caller's wake or continuing its provider work", async () => {
    const reply = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(reply.promise);
    const ready = await service(), old = new AbortController(), latest = new AbortController();
    const oldProvider = vi.fn(), latestProvider = vi.fn();
    const first = ready(old.signal).then(oldProvider), second = ready(latest.signal).then(latestProvider);
    const oldFailure = expect(first).rejects.toMatchObject({ name: "AbortError" });
    old.abort();
    await oldFailure;
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(false);
    reply.resolve(healthy());
    await second;
    expect(oldProvider).not.toHaveBeenCalled();
    expect(latestProvider).toHaveBeenCalledOnce();
  });

  it("aborts an abandoned wake, ignores its late success, and starts fresh next time", async () => {
    const reply = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(reply.promise);
    const ready = await service(), controller = new AbortController();
    const first = ready(controller.signal), failure = expect(first).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await failure;
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    reply.resolve(healthy());
    await Promise.resolve();
    await ready(new AbortController().signal);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not start any work for an already cancelled subscriber", async () => {
    const ready = await service(), controller = new AbortController();
    controller.abort();
    await expect(ready(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("waits through startup 503 responses, then allows work only after valid health JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(unavailable()).mockResolvedValueOnce(unavailable());
    const ready = await service(), provider = vi.fn();
    const request = ready(new AbortController().signal).then(provider);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(provider).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(2_001);
    await request;
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(provider).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits through a network TypeError from a CORS-blocked loading page", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const ready = await service(), provider = vi.fn();
    const request = ready(new AbortController().signal).then(provider);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(fetch).toHaveBeenCalledOnce();
    expect(provider).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await request;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(provider).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels a network-error retry without issuing another health or provider request", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const ready = await service(), controller = new AbortController(), provider = vi.fn();
    const request = ready(controller.signal).then(provider), failure = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await failure;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetch).toHaveBeenCalledOnce();
    expect(provider).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["http", "invalid", "json", "abort"])("does not cache or retry a %s health failure", async failure => {
    if (failure === "http") vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    if (failure === "invalid") vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: "starting" }) } as Response);
    if (failure === "json") {
      const reply = healthy();
      reply.json = async () => { throw new TypeError("Invalid JSON body"); };
      vi.mocked(fetch).mockResolvedValueOnce(reply);
    }
    if (failure === "abort") vi.mocked(fetch).mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));
    const ready = await service();
    await expect(ready(new AbortController().signal)).rejects.toMatchObject({ name: failure === "abort" ? "AbortError" : failure === "json" ? "TypeError" : "Error" });
    expect(fetch).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    await ready(new AbortController().signal);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["503", "network"])("bounds %s startup retries at 65 seconds with no scheduled background work", async failure => {
    if (failure === "503") vi.mocked(fetch).mockResolvedValue(unavailable());
    else vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    const ready = await service();
    const request = ready(new AbortController().signal), timedOut = expect(request).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(65_000);
    await timedOut;
    const count = vi.mocked(fetch).mock.calls.length;
    expect(count).toBeLessThanOrEqual(33);
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetch).toHaveBeenCalledTimes(count);
  });

  it("bounds a hanging transport even if it ignores abort, and never caches its late reply", async () => {
    const reply = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(reply.promise);
    const ready = await service();
    const request = ready(new AbortController().signal), failure = expect(request).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(65_000);
    await failure;
    reply.resolve(healthy());
    await Promise.resolve();
    await ready(new AbortController().signal);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
