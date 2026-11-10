import { chromium, type Browser, type BrowserContext, type Page, type Route } from "playwright";
import { MOBILE_USER_AGENT } from "./http";

const VIEWPORT = { width: 402, height: 874 };
const DEFAULT_TIMEOUT_MS = 18_000;
const IDLE_TIMEOUT_MS = 30_000;
const MAX_PENDING = 8;
const MAX_HTML_BYTES = 4 * 1024 * 1024;
const RESOURCE_HOSTS = ["bing.com", "bing.net", "msn.com", "microsoft.com", "msftstatic.com"];

interface Waiter {
  resolve: (release: () => void) => void;
  reject: (error: unknown) => void;
  cancel: () => void;
}

let browser: Browser | undefined;
let launching: Promise<Browser> | undefined;
let generation = 0;
let busy = false;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
const waiters: Waiter[] = [];

const abortReason = (signal: AbortSignal) => signal.reason ?? new DOMException("Rendering was cancelled", "AbortError");

/** Abort promptly, but still dispose resources that finish opening after cancellation. */
function abortable<T>(operation: Promise<T>, signal: AbortSignal, disposeLate?: (value: T) => Promise<unknown>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const abort = () => {
      if (settled) return;
      settled = true;
      reject(abortReason(signal));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    operation.then(value => {
      signal.removeEventListener("abort", abort);
      if (settled) { void disposeLate?.(value).catch(() => undefined); return; }
      settled = true;
      resolve(value);
    }, error => {
      signal.removeEventListener("abort", abort);
      if (!settled) { settled = true; reject(error); }
    });
  });
}

function cancelIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = undefined;
}

function scheduleIdleClose() {
  cancelIdleTimer();
  if (busy || waiters.length) return;
  idleTimer = setTimeout(() => {
    idleTimer = undefined;
    if (!busy && !waiters.length) void closeBingBrowser();
  }, IDLE_TIMEOUT_MS);
  idleTimer.unref();
}

function releaseSlot() {
  const next = waiters.shift();
  if (next) { next.cancel(); next.resolve(once(releaseSlot)); }
  else { busy = false; scheduleIdleClose(); }
}

function once(action: () => void) {
  let called = false;
  return () => { if (!called) { called = true; action(); } };
}

function acquireSlot(signal: AbortSignal): Promise<() => void> {
  if (signal.aborted) return Promise.reject(abortReason(signal));
  cancelIdleTimer();
  if (!busy) { busy = true; return Promise.resolve(once(releaseSlot)); }
  if (waiters.length >= MAX_PENDING) return Promise.reject(new Error("Bing renderer is busy"));
  return new Promise((resolve, reject) => {
    const abort = () => {
      const index = waiters.indexOf(waiter);
      if (index >= 0) waiters.splice(index, 1);
      waiter.cancel();
      reject(abortReason(signal));
    };
    const waiter: Waiter = { resolve, reject, cancel: () => signal.removeEventListener("abort", abort) };
    waiters.push(waiter);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

async function sharedBrowser() {
  if (browser?.isConnected()) return browser;
  if (launching) return launching;
  const version = generation;
  const pending = chromium.launch({ headless: true, timeout: 10_000, args: ["--disable-dev-shm-usage"] }).then(async created => {
    if (generation !== version) { await created.close(); throw new Error("Bing renderer was closed"); }
    browser = created;
    created.on("disconnected", () => { if (browser === created) browser = undefined; });
    if (!busy) scheduleIdleClose();
    return created;
  }).finally(() => { if (launching === pending) launching = undefined; });
  launching = pending;
  return pending;
}

async function routeResource(route: Route) {
  const request = route.request();
  try {
    const url = new URL(request.url());
    // The renderer only visits Bing and its Microsoft-hosted result resources.
    // Never turn browser execution into an arbitrary URL/public-network proxy.
    const allowed = url.protocol === "https:" && !url.username && !url.password && !url.port
      && RESOURCE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
    if (!allowed || ["media", "websocket", "eventsource"].includes(request.resourceType())) return await route.abort();
    await route.continue();
  } catch { await route.abort().catch(() => undefined); }
}

/** Stop after a brief quiet DOM period; Bing telemetry can keep the network busy indefinitely. */
async function settleResults(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => {
    const content = document.querySelector("#b_content");
    if (!content) { resolve(); return; }
    let quiet: ReturnType<typeof setTimeout>;
    const finish = () => { clearTimeout(quiet); clearTimeout(limit); observer.disconnect(); resolve(); };
    const changed = () => { clearTimeout(quiet); quiet = setTimeout(finish, 450); };
    const observer = new MutationObserver(changed);
    const limit = setTimeout(finish, 1500);
    observer.observe(content, { subtree: true, childList: true, characterData: true, attributes: true });
    changed();
  }));
}

export interface BingBrowserOptions {
  signal: AbortSignal;
  locale: string;
  /** One budget includes browser launch, queueing, navigation and hydration. */
  timeoutMs?: number;
}

/** Anonymous mobile DOM snapshot. It does not import cookies or run remote scripts in the app. */
export async function renderBingSearch(query: string, options: BingBrowserOptions): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("Invalid Bing renderer deadline");
  const deadline = Date.now() + timeoutMs;
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(new DOMException("Bing rendering timed out", "TimeoutError")), timeoutMs);
  timer.unref();
  const signal = AbortSignal.any([options.signal, timeout.signal]);
  let release: (() => void) | undefined;
  let context: BrowserContext | undefined;
  let closing: Promise<void> | undefined;
  const closeContext = () => closing ??= context?.close().catch(() => closeBingBrowser()) ?? Promise.resolve();
  const abort = () => { void closeContext(); };
  const remaining = () => Math.max(1, deadline - Date.now());
  try {
    release = await acquireSlot(signal);
    signal.throwIfAborted();
    const instance = await abortable(sharedBrowser(), signal);
    context = await abortable(instance.newContext({
      viewport: VIEWPORT, screen: VIEWPORT, userAgent: MOBILE_USER_AGENT,
      locale: options.locale, isMobile: true, hasTouch: true, deviceScaleFactor: 1,
      colorScheme: "light", serviceWorkers: "block", acceptDownloads: false,
    }), signal, late => late.close());
    signal.addEventListener("abort", abort, { once: true });
    signal.throwIfAborted();
    await abortable(context.route("**/*", routeResource), signal);
    const page = await abortable(context.newPage(), signal);
    page.on("popup", popup => { void popup.close().catch(() => undefined); });
    const url = new URL("https://www.bing.com/search");
    url.searchParams.set("q", query);
    url.searchParams.set("setlang", options.locale.toLowerCase().startsWith("zh") ? "zh-Hans" : "en");
    const response = await abortable(page.goto(url.href, { waitUntil: "domcontentloaded", timeout: remaining() }), signal);
    if (!response?.ok() || new URL(page.url()).origin !== url.origin) throw new Error("Bing did not return a result page");
    await abortable(page.locator("#b_content #b_results").waitFor({ state: "visible", timeout: remaining() }), signal);
    await abortable(settleResults(page), signal);
    const html = await abortable(page.content(), signal);
    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) throw new Error("Bing document is too large");
    return html;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    await closeContext();
    release?.();
  }
}

/** Also used on process shutdown; queued requests cannot reopen a closing browser. */
export async function closeBingBrowser() {
  cancelIdleTimer();
  generation++;
  for (const waiter of waiters.splice(0)) {
    waiter.cancel();
    waiter.reject(new DOMException("Bing renderer was closed", "AbortError"));
  }
  const current = browser;
  const pending = launching;
  browser = undefined;
  launching = undefined;
  await current?.close().catch(() => undefined);
  await pending?.catch(() => undefined);
}
