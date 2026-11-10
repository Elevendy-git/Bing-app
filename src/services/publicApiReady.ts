import { resolvePublicApiUrl } from "./apiUrl";

const READY_TTL_MS = 10 * 60_000;
const WAKE_TIMEOUT_MS = 65_000;
const WAKE_RETRY_MS = 2_000;
const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
interface PendingWake {
  controller: AbortController;
  promise: Promise<void>;
  subscribers: number;
  settled: boolean;
}
const readyUntil = new Map<string, number>();
const pendingWakes = new Map<string, PendingWake>();

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The request was cancelled", "AbortError");
}

/** Abort the wait even if a transport ignores its AbortSignal. */
function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener("abort", abort); reject(abortReason(signal)); };
    signal.addEventListener("abort", abort, { once: true });
    promise.then(value => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) reject(abortReason(signal)); else resolve(value);
    }, error => { signal.removeEventListener("abort", abort); reject(error); });
  });
}

function delay(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); reject(abortReason(signal)); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, WAKE_RETRY_MS);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

function healthUrl(): string | null {
  const base = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!base) return null;
  // Reuse public API URL validation, including support for a service base path.
  const api = new URL(resolvePublicApiUrl("/api/", base));
  if (loopbackHosts.has(api.hostname) || api.origin === window.location.origin) return null;
  return new URL("../health", api).href;
}

async function wake(url: string, controller: AbortController): Promise<void> {
  const { signal } = controller;
  const timeout = setTimeout(() => controller.abort(new DOMException("The data service did not start in time", "TimeoutError")), WAKE_TIMEOUT_MS);
  try {
    for (;;) {
      let response: Response;
      try {
        response = await withAbort(fetch(url, {
          signal, credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", headers: { Accept: "application/json" },
        }), signal);
      } catch (error) {
        // A host-generated loading page may omit CORS headers, so browsers
        // expose its 503 as a network TypeError rather than an HTTP response.
        if (signal.aborted || !(error instanceof TypeError)) throw error;
        await delay(signal); continue;
      }
      // Render may return its HTML startup page before the application can answer.
      // Only that unavailable status is retried; API/provider failures are not.
      if (response.status === 503) {
        // The host's loading page can be large; release it before the next probe.
        void response.body?.cancel().catch(() => {});
        await delay(signal); continue;
      }
      if (!response.ok) throw new Error("The data service is unavailable");
      const body: unknown = await withAbort(response.json(), signal);
      if (!body || typeof body !== "object" || !("status" in body) || body.status !== "ok") {
        throw new Error("Invalid data service health response");
      }
      if (signal.aborted) throw abortReason(signal);
      readyUntil.set(url, Date.now() + READY_TTL_MS);
      return;
    }
  } finally { clearTimeout(timeout); }
}

/**
 * Wake an explicitly configured remote service on demand, before starting the
 * provider deadline. Subscribers share only readiness, never queries or results.
 * No interval keeps the service alive; failed/cancelled wakes are never cached.
 */
export async function awaitPublicApiReady(signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw abortReason(signal);
  const url = healthUrl();
  if (!url || (readyUntil.get(url) ?? 0) > Date.now()) return;
  let pending = pendingWakes.get(url);
  if (!pending || pending.controller.signal.aborted) {
    const controller = new AbortController();
    const current: PendingWake = { controller, promise: Promise.resolve(), subscribers: 0, settled: false };
    current.promise = wake(url, controller).finally(() => {
      current.settled = true;
      if (pendingWakes.get(url) === current) pendingWakes.delete(url);
    });
    pendingWakes.set(url, current);
    pending = current;
  }
  const current = pending;
  ++current.subscribers;
  try { await withAbort(current.promise, signal); }
  finally {
    if (--current.subscribers === 0 && !current.settled) current.controller.abort();
  }
}
