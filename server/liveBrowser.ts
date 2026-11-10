import type { IncomingMessage } from "node:http";
import type { EventEmitter } from "node:events";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import type { BrowserContext, CDPSession, Page, Route } from "playwright";
import type { Plugin } from "vite";
import { acquireBingBrowser, closeBingBrowser } from "./bingBrowser";
import { MOBILE_USER_AGENT } from "./http";
import { publicWebUrl } from "./webPageFetch";
import { assertBingSerpQuery } from "./bingSerpValidation";
import { resultDestination } from "../src/services/webNavigation";
import { BING_MARKET, bingSearchUrl } from "../src/services/bingPage";
import {
  LIVE_BROWSER_FRAME_HEADER_BYTES, LIVE_BROWSER_FRAME_MAGIC, LIVE_BROWSER_PATH,
  type LiveBrowserClientMessage, type LiveBrowserErrorCode, type LiveBrowserServerMessage,
} from "../src/services/liveBrowserProtocol";

const RESOURCE_HOSTS = ["bing.com", "bing.net", "msn.com", "microsoft.com", "msftstatic.com"];
const MAX_PAYLOAD_BYTES = 8192;
const MAX_BUFFERED_BYTES = 512 * 1024;
const MAX_FRAME_BYTES = 600 * 1024;
const MAX_SESSION_BYTES = 80 * 1024 * 1024;
const MAX_UPSTREAM_BYTES = 50 * 1024 * 1024;
const MAX_UPSTREAM_REQUESTS = 1000;
const MAX_QUEUE = 40;
const MAX_MESSAGE_BUCKET = 240;
const FRAME_INTERVAL_MS = 50; // A bandwidth cap, not an iOS animation timing.
const MAX_STARTUP_NAVIGATIONS = 3;
const PRESENTATION_CSS = `
  #sb_form,#id_h,#est_switch_keepH,#est_switch,#b_skip_to_content,#b_a11y_feedback{display:none!important}
  #b_header{position:static!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important}
  #ScopeRow,.b_scopebar{position:static!important;top:auto!important;margin-top:0!important}
  #b_content{padding-top:0!important}
`;
const KEY_NAMES = new Set(["Enter", "Backspace", "Delete", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape", "Home", "End", "PageUp", "PageDown"]);
const ERROR_MESSAGES: Record<LiveBrowserErrorCode, string> = {
  busy: "The live browser is in use. Please try again shortly.",
  "invalid-message": "The live browser received an unsupported request.",
  "rate-limit": "Too many requests. Please try again shortly.",
  unavailable: "Bing could not load usable live results. Please try again.",
  expired: "This live browser session has ended. Reopen the search to continue.",
  "bandwidth-limit": "This live browser session reached its resource limit. Reopen the search to continue.",
  inactive: "The inactive live browser was closed. Reopen the search to continue.",
};

export interface LiveBrowserOptions {
  allowedOrigins: readonly string[];
  idleTimeoutMs?: number;
  sessionTimeoutMs?: number;
  initialMessageTimeoutMs?: number;
  readinessTimeoutMs?: number;
  acquireTimeoutMs?: number;
}

interface Session {
  ws: WebSocket;
  closed: boolean;
  ready: boolean;
  paused: boolean;
  streaming: boolean;
  resizing: boolean;
  pendingViewport?: { width: number; height: number };
  lastFind?: { query: string; index: number; requestId: number };
  controller: AbortController;
  setup?: Promise<void>;
  cleanup?: Promise<void>;
  context?: BrowserContext;
  page?: Page;
  cdp?: CDPSession;
  release?: () => void;
  width: number;
  height: number;
  query: string;
  initialUrl: string;
  initialRequestSeen: boolean;
  startupNavigations: number;
  documentVersion: number;
  navigationPending: boolean;
  startupDeadline?: number;
  initialTimer?: ReturnType<typeof setTimeout>;
  acquireTimer?: ReturnType<typeof setTimeout>;
  idleTimer?: ReturnType<typeof setTimeout>;
  sessionTimer?: ReturnType<typeof setTimeout>;
  frameTimer?: ReturnType<typeof setTimeout>;
  flushTimer?: ReturnType<typeof setTimeout>;
  terminateTimer?: ReturnType<typeof setTimeout>;
  heartbeat?: ReturnType<typeof setInterval>;
  alive: boolean;
  touched: boolean;
  inputEpoch: number;
  queue: Promise<void>;
  queued: number;
  frameSequence: number;
  pendingFrame?: { id: number; cdpId?: number };
  latestFrame?: Buffer;
  lastFrameAt: number;
  bytes: number;
  upstreamBytes: number;
  upstreamRequests: number;
  messageTokens: number;
  messageRefillAt: number;
  lastNavigation?: { url: string; at: number };
}

function send(session: Session, message: LiveBrowserServerMessage) {
  if (!session.closed && session.ws.readyState === WebSocket.OPEN) session.ws.send(JSON.stringify(message));
}

function resourceAllowed(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && RESOURCE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch { return false; }
}

function rejectUpgrade(socket: Duplex, status: number, message: string) {
  socket.end(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

function validQuery(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f]/.test(value);
}
const queryKey = (value: string) => value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/gu, " ").trim();
function sameStartupSearch(value: string, query: string) {
  try {
    const url = new URL(value);
    return url.origin === "https://www.bing.com" && url.pathname === "/search" && !url.username && !url.password
      && url.searchParams.getAll("q").length === 1 && queryKey(url.searchParams.get("q") ?? "") === queryKey(query)
      && ["setlang", "mkt"].every(key => url.searchParams.getAll(key).length === 1 && url.searchParams.get(key) === BING_MARKET)
      && url.searchParams.getAll("cc").length === 1 && url.searchParams.get("cc") === "US";
  } catch { return false; }
}
function navigationInterrupted(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /Execution context was destroyed|Cannot find context|net::ERR_ABORTED|interrupted by another navigation|page is navigating|different document/iu.test(message);
}
function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function integer(value: unknown, min: number, max: number): value is number { return finite(value) && Number.isInteger(value) && value >= min && value <= max; }

function clientMessage(value: unknown): LiveBrowserClientMessage | undefined {
  if (!value || typeof value !== "object") return;
  const item = value as Record<string, unknown>;
  switch (item.type) {
    case "start": return validQuery(item.query) && integer(item.width, 320, 480) && integer(item.height, 300, 900) ? item as unknown as LiveBrowserClientMessage : undefined;
    case "ack": return integer(item.id, 0, 0xffffffff) ? item as unknown as LiveBrowserClientMessage : undefined;
    case "pause": return typeof item.paused === "boolean" ? item as unknown as LiveBrowserClientMessage : undefined;
    case "end": return { type: "end" };
    case "resize": return integer(item.width, 320, 480) && integer(item.height, 300, 900) ? item as unknown as LiveBrowserClientMessage : undefined;
    case "touch": return ["start", "move", "end", "cancel"].includes(String(item.phase)) && finite(item.x) && finite(item.y) ? item as unknown as LiveBrowserClientMessage : undefined;
    case "wheel": return [item.x, item.y, item.deltaX, item.deltaY].every(finite) ? item as unknown as LiveBrowserClientMessage : undefined;
    case "key": return typeof item.key === "string" && (KEY_NAMES.has(item.key) || Array.from(item.key).length === 1 && !/[\u0000-\u001f\u007f]/.test(item.key)) ? item as unknown as LiveBrowserClientMessage : undefined;
    case "text": return typeof item.value === "string" && item.value.length <= 500 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(item.value) ? item as unknown as LiveBrowserClientMessage : undefined;
    case "find": return typeof item.query === "string" && item.query.length <= 100 && integer(item.index, -10000, 10000) && integer(item.requestId, 0, 0xffffffff) ? item as unknown as LiveBrowserClientMessage : undefined;
    case "find-clear": return { type: "find-clear" };
    default: return;
  }
}

/** No DOM wrappers: preserve Bing's own component trees and event handlers. */
async function findInPage(page: Page, query: string, requestedIndex: number) {
  return page.evaluate(({ query, requestedIndex }) => {
    type HighlightRegistry = { delete(name: string): void; set(name: string, value: unknown): void };
    const registry = (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
    const HighlightType = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
    if (!registry || !HighlightType) return { total: 0, index: -1 };
    registry.delete("bing-app-find"); registry.delete("bing-app-find-current");
    const oldStyle = document.getElementById("bing-app-find-style");
    if (!query) { oldStyle?.remove(); return { total: 0, index: -1 }; }
    if (!oldStyle) {
      const style = document.createElement("style"); style.id = "bing-app-find-style";
      style.textContent = "::highlight(bing-app-find){background:#ffe27a;color:#111}::highlight(bing-app-find-current){background:#ffab3d;color:#111}";
      document.head.append(style);
    }
    const ranges: Range[] = [], needle = query.toLocaleLowerCase();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null, scanned = 0;
    while ((node = walker.nextNode()) && scanned < 300000 && ranges.length < 500) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script,style,noscript,input,textarea,select,svg,[contenteditable=true]") || !parent.getClientRects().length) continue;
      const style = getComputedStyle(parent);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const text = node.textContent ?? ""; scanned += text.length;
      const lower = text.toLocaleLowerCase(); let at = 0;
      while (ranges.length < 500 && (at = lower.indexOf(needle, at)) !== -1) {
        const range = document.createRange(); range.setStart(node, at); range.setEnd(node, Math.min(at + query.length, text.length));
        ranges.push(range); at += Math.max(1, needle.length);
      }
    }
    const index = ranges.length ? ((requestedIndex % ranges.length) + ranges.length) % ranges.length : -1;
    registry.set("bing-app-find", new HighlightType(...ranges));
    if (ranges[index]) {
      registry.set("bing-app-find-current", new HighlightType(ranges[index]));
      ranges[index].startContainer.parentElement?.scrollIntoView({ block: "center", behavior: "instant" });
    }
    return { total: ranges.length, index };
  }, { query, requestedIndex });
}

/**
 * One anonymous browser context at a time. The shared renderer lease also prevents
 * a snapshot Chromium page from competing for the free instance's memory.
 * No account profile, cookies, query, page URL or provider text is logged.
 */
export function attachLiveBrowserServer(server: Pick<EventEmitter, "on" | "off">, options: LiveBrowserOptions) {
  const origins = new Set(options.allowedOrigins);
  const idleTimeout = options.idleTimeoutMs ?? 90_000;
  const sessionTimeout = options.sessionTimeoutMs ?? 10 * 60_000;
  const initialTimeout = options.initialMessageTimeoutMs ?? 5000;
  const readinessTimeout = options.readinessTimeoutMs ?? 30_000;
  const acquireTimeout = options.acquireTimeoutMs ?? 8000;
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES, perMessageDeflate: false });
  const attempts = new Map<string, { count: number; until: number }>();
  let active: Session | undefined;
  let closing = false;

  const cleanup = (session: Session) => {
    if (session.cleanup) return session.cleanup;
    session.closed = true;
    session.controller.abort();
    for (const timer of [session.initialTimer, session.acquireTimer, session.idleTimer, session.sessionTimer, session.frameTimer, session.flushTimer]) clearTimeout(timer);
    session.latestFrame = undefined;
    clearInterval(session.heartbeat);
    // Closing an existing context aborts navigation/readiness promptly. If context
    // creation finishes late, setup sees closed and cleanup below closes it too.
    const earlyClose = session.context?.close().catch(() => undefined);
    session.cleanup = (async () => {
      await earlyClose;
      await session.setup?.catch(() => undefined);
      await session.context?.close().catch(() => undefined);
      session.release?.(); session.release = undefined;
      // Preserve the short close handshake so a final error can reach the client.
      if (session.ws.readyState === WebSocket.OPEN) session.ws.close();
      if (session.ws.readyState !== WebSocket.CLOSED && !session.terminateTimer) {
        session.terminateTimer = setTimeout(() => session.ws.terminate(), 250);
      }
      if (active === session) active = undefined;
    })();
    return session.cleanup;
  };
  const fail = (session: Session, code: LiveBrowserErrorCode, retryable = true) => {
    if (session.closed) return;
    send(session, { type: "error", code, message: ERROR_MESSAGES[code], retryable });
    session.ws.close(code === "busy" ? 1013 : 1000, code);
    session.terminateTimer = setTimeout(() => session.ws.terminate(), 250);
    void cleanup(session);
  };
  const touchActivity = (session: Session) => {
    clearTimeout(session.idleTimer);
    session.idleTimer = setTimeout(() => fail(session, "inactive"), idleTimeout);
  };
  const navigate = (session: Session, value: string) => {
    let url: string;
    try { url = publicWebUrl(resultDestination(value) ?? value).href; } catch { return; }
    const last = session.lastNavigation;
    if (last?.url === url && Date.now() - last.at < 500) return;
    session.lastNavigation = { url, at: Date.now() };
    send(session, { type: "navigate", url });
  };
  const routeResource = async (session: Session, route: Route) => {
    try {
      const request = route.request();
      if (++session.upstreamRequests > MAX_UPSTREAM_REQUESTS) { fail(session, "bandwidth-limit"); return await route.abort(); }
      if (request.isNavigationRequest()) {
        const frame = request.frame(), requestPage = frame.page();
        if (frame === requestPage.mainFrame()) {
          const first = requestPage === session.page && !session.initialRequestSeen && request.url() === session.initialUrl;
          const startup = requestPage === session.page && !session.ready && sameStartupSearch(request.url(), session.query);
          if (first) session.initialRequestSeen = true;
          else if (startup) {
            if (session.startupNavigations >= MAX_STARTUP_NAVIGATIONS || Date.now() >= (session.startupDeadline ?? 0)) {
              fail(session, "unavailable"); return await route.abort();
            }
            session.startupNavigations++;
          } else { navigate(session, request.url()); return await route.abort(); }
          session.documentVersion++; session.navigationPending = true;
        }
      }
      if (!resourceAllowed(request.url()) || ["media", "websocket", "eventsource"].includes(request.resourceType())) return await route.abort();
      await route.continue();
    } catch { await route.abort().catch(() => undefined); }
  };
  const ackFrame = async (session: Session, id: number) => {
    if (session.pendingFrame?.id !== id) return;
    const frame = session.pendingFrame;
    session.pendingFrame = undefined; clearTimeout(session.frameTimer);
    if (frame.cdpId !== undefined) await session.cdp?.send("Page.screencastFrameAck", { sessionId: frame.cdpId }).catch(() => undefined);
    flushLatest(session);
  };
  const transmitFrame = (session: Session, jpeg: Buffer, cdpId?: number) => {
    if (session.closed || session.paused || session.resizing || session.ws.readyState !== WebSocket.OPEN) return;
    if (session.bytes + jpeg.length > MAX_SESSION_BYTES) { fail(session, "bandwidth-limit"); return; }
    const id = session.frameSequence++ >>> 0;
    const header = Buffer.allocUnsafe(LIVE_BROWSER_FRAME_HEADER_BYTES);
    header.writeUInt32BE(LIVE_BROWSER_FRAME_MAGIC, 0); header.writeUInt32BE(id, 4);
    header.writeUInt16BE(session.width, 8); header.writeUInt16BE(session.height, 10);
    session.pendingFrame = { id, cdpId }; session.lastFrameAt = Date.now(); session.bytes += jpeg.length;
    session.ws.send(Buffer.concat([header, jpeg]), { binary: true }, error => { if (error) void cleanup(session); });
    session.frameTimer = setTimeout(() => { void ackFrame(session, id); }, 1000);
  };
  const flushLatest = (session: Session) => {
    if (session.closed || session.paused || session.resizing || session.pendingFrame || !session.latestFrame) return;
    clearTimeout(session.flushTimer);
    const delay = session.ws.bufferedAmount > MAX_BUFFERED_BYTES ? 100 : Math.max(0, FRAME_INTERVAL_MS - (Date.now() - session.lastFrameAt));
    if (delay) { session.flushTimer = setTimeout(() => flushLatest(session), delay); return; }
    const jpeg = session.latestFrame; session.latestFrame = undefined;
    transmitFrame(session, jpeg);
  };
  const enqueue = (session: Session, action: () => Promise<unknown>) => {
    if (session.queued >= MAX_QUEUE) { fail(session, "rate-limit"); return; }
    session.queued++;
    session.queue = session.queue.then(async () => { if (!session.closed) await action(); })
      .catch(() => { if (!session.closed) fail(session, "unavailable"); })
      .finally(() => { session.queued--; });
  };
  const enqueueInput = (session: Session, action: () => Promise<unknown>) => {
    const epoch = session.inputEpoch;
    enqueue(session, async () => {
      if (!session.paused && !session.resizing && epoch === session.inputEpoch) await action();
    });
  };
  const cancelTouch = async (session: Session) => {
    if (!session.touched) return;
    session.touched = false;
    await session.cdp?.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  };
  const setStreaming = async (session: Session, running: boolean) => {
    if (!session.cdp || session.closed || session.streaming === running) return;
    session.streaming = running;
    if (!running) {
      clearTimeout(session.flushTimer); clearTimeout(session.frameTimer);
      session.latestFrame = undefined;
      if (session.pendingFrame?.cdpId !== undefined) await session.cdp.send("Page.screencastFrameAck", { sessionId: session.pendingFrame.cdpId }).catch(() => undefined);
      session.pendingFrame = undefined;
      await session.cdp.send("Page.stopScreencast");
    } else {
      session.lastFrameAt = 0;
      await session.cdp.send("Page.startScreencast", { format: "jpeg", quality: 70, maxWidth: session.width, maxHeight: session.height, everyNthFrame: 1 });
    }
  };
  const resize = (session: Session) => {
    if (session.resizing || !session.page || !session.ready) return;
    session.resizing = true;
    enqueue(session, async () => {
      await cancelTouch(session);
      await setStreaming(session, false);
      while (session.pendingViewport && !session.closed) {
        const viewport = session.pendingViewport; session.pendingViewport = undefined;
        await session.page!.setViewportSize(viewport);
        session.width = viewport.width; session.height = viewport.height;
      }
      if (session.lastFind && !session.closed) {
        const find = session.lastFind;
        const result = await findInPage(session.page!, find.query, find.index);
        send(session, { type: "find-result", query: find.query, total: result.total, index: result.index, requestId: find.requestId });
      }
      session.resizing = false;
      if (session.pendingViewport) resize(session);
      else if (!session.paused) await setStreaming(session, true);
    });
  };
  const setup = async (session: Session) => {
    session.acquireTimer = setTimeout(() => { if (!session.release) { session.controller.abort(); fail(session, "busy"); } }, acquireTimeout);
    const lease = await acquireBingBrowser(session.controller.signal, () => clearTimeout(session.acquireTimer));
    clearTimeout(session.acquireTimer); session.release = lease.release;
    if (session.closed) return;
    session.context = await lease.browser.newContext({
      viewport: { width: session.width, height: session.height }, deviceScaleFactor: 1,
      isMobile: true, hasTouch: true, userAgent: MOBILE_USER_AGENT,
      locale: "en-US", extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
      serviceWorkers: "block", acceptDownloads: false,
    });
    if (session.closed) return;
    await session.context.route("**/*", route => routeResource(session, route));
    await session.context.routeWebSocket("**/*", socket => socket.close());
    session.page = await session.context.newPage();
    if (session.closed) return;
    session.context.on("page", popup => {
      if (popup !== session.page) {
        if (popup.url() !== "about:blank") navigate(session, popup.url());
        // Let routeResource see an about:blank popup's first target before close.
        const timer = setTimeout(() => { void popup.close().catch(() => undefined); }, 300);
        timer.unref();
      }
    });
    session.page.on("crash", () => fail(session, "unavailable"));
    session.page.on("framenavigated", frame => {
      if (frame === session.page?.mainFrame()) session.navigationPending = false;
    });
    session.page.on("download", download => { void download.cancel().catch(() => undefined); });
    session.cdp = await session.context.newCDPSession(session.page);
    if (session.closed) return;
    await session.cdp.send("Page.enable");
    await session.cdp.send("Network.enable");
    session.cdp.on("Network.dataReceived", event => {
      session.upstreamBytes += Math.max(event.encodedDataLength, event.dataLength);
      if (session.upstreamBytes > MAX_UPSTREAM_BYTES) fail(session, "bandwidth-limit");
    });
    session.cdp.on("Page.screencastFrame", event => {
      if (session.closed || !session.cdp) return;
      if (session.paused || session.resizing || !session.streaming) {
        void session.cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => undefined); return;
      }
      const now = Date.now();
      const jpeg = Buffer.from(event.data, "base64");
      if (jpeg.length > MAX_FRAME_BYTES) { fail(session, "bandwidth-limit"); return; }
      if (session.pendingFrame || session.latestFrame || session.ws.bufferedAmount > MAX_BUFFERED_BYTES || now - session.lastFrameAt < FRAME_INTERVAL_MS) {
        // Keep only the newest update. ACK its CDP frame now, and eventually
        // flush it after client ACK / throttling, even when the page goes static.
        session.latestFrame = jpeg;
        void session.cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => undefined);
        flushLatest(session); return;
      }
      transmitFrame(session, jpeg, event.sessionId);
    });
    if (session.closed) return;
    send(session, { type: "status", state: "loading" });
    const deadline = Date.now() + readinessTimeout;
    session.startupDeadline = deadline;
    try { await session.page.goto(session.initialUrl, { waitUntil: "domcontentloaded", timeout: readinessTimeout }); }
    catch (error) { if (session.closed) return; if (!session.startupNavigations || !navigationInterrupted(error)) throw error; }
    let title = "";
    for (;;) {
      if (session.closed) return;
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error("Unavailable result document");
      const version = session.documentVersion;
      try {
        await session.page.waitForLoadState("domcontentloaded", { timeout: remaining });
        await session.page.waitForFunction(expected => {
          const content = document.querySelector("#b_content"), results = document.querySelector("#b_results");
          const visible = (element: Element | null) => {
            if (!element?.isConnected || !Array.from(element.getClientRects()).some(rect => rect.width > 0 && rect.height > 0)) return false;
            for (let current: Element | null = element; current; current = current.parentElement) {
              const style = getComputedStyle(current);
              if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || style.opacity === "0" || style.contentVisibility === "hidden") return false;
            }
            return true;
          };
          const input = document.querySelector<HTMLInputElement>("#sb_form_q");
          if (input && input.value.trim().toLocaleLowerCase() !== expected.trim().toLocaleLowerCase()) return false;
          return visible(content) && visible(results) && Array.from(results!.querySelectorAll(".b_algo,.b_ans,.b_no,.b_entityTP")).some(element => visible(element) && (element.textContent?.trim().length ?? 0) > 10);
        }, session.query, { timeout: Math.max(1, deadline - Date.now()), polling: 150 });
        // Install on the final document; an allowed startup redirect discards CSS
        // from the previous page. Keep provider scripts/component trees intact.
        await session.page.addStyleTag({ content: PRESENTATION_CSS });
        title = (await session.page.title()).slice(0, 300);
        const source = await session.page.content();
        if (session.closed) return;
        if (Buffer.byteLength(source, "utf8") > 4 * 1024 * 1024 || Date.now() > deadline) throw new Error("Unavailable result document");
        if (version !== session.documentVersion || session.navigationPending) {
          await new Promise(resolve => setTimeout(resolve, 20)); continue;
        }
        // Echoed search text alone cannot legitimize unrelated cloud-IP results.
        assertBingSerpQuery(source, session.query);
        break;
      } catch (error) {
        if (session.closed) return;
        if (!navigationInterrupted(error) || !session.startupNavigations) throw error;
      }
    }
    session.ready = true;
    send(session, { type: "ready", width: session.width, height: session.height,
      sourceUrl: session.initialUrl, title,
      faviconUrl: "https://www.bing.com/favicon.ico", fetchedAt: new Date().toISOString() });
    send(session, { type: "status", state: "ready" });
    // Starting now guarantees a fresh frame after ready, including a static page.
    if (session.pendingViewport) resize(session);
    else if (!session.paused) await setStreaming(session, true);
  };

  wss.on("connection", ws => {
    if (active || closing) {
      ws.send(JSON.stringify({ type: "error", code: "busy", message: ERROR_MESSAGES.busy, retryable: true } satisfies LiveBrowserServerMessage));
      ws.close(1013, "busy"); const timer = setTimeout(() => ws.terminate(), 250); timer.unref(); return;
    }
    const session: Session = {
      ws, closed: false, ready: false, paused: false, streaming: false, resizing: false,
      controller: new AbortController(), width: 402, height: 668,
      query: "", initialUrl: "", initialRequestSeen: false, startupNavigations: 0,
      documentVersion: 0, navigationPending: false, alive: true,
      touched: false, inputEpoch: 0, queue: Promise.resolve(), queued: 0, frameSequence: 0, lastFrameAt: 0,
      bytes: 0, upstreamBytes: 0, upstreamRequests: 0, messageTokens: MAX_MESSAGE_BUCKET, messageRefillAt: Date.now(),
    };
    active = session;
    session.initialTimer = setTimeout(() => fail(session, "invalid-message", false), initialTimeout);
    session.sessionTimer = setTimeout(() => fail(session, "expired"), sessionTimeout);
    session.heartbeat = setInterval(() => {
      if (!session.alive) { void cleanup(session); return; }
      session.alive = false; if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 15_000);
    ws.on("pong", () => { session.alive = true; });
    ws.on("close", () => { void cleanup(session); }); ws.on("error", () => { void cleanup(session); });
    ws.on("message", (raw: RawData, binary: boolean) => {
      if (session.closed) return;
      const now = Date.now();
      session.messageTokens = Math.min(MAX_MESSAGE_BUCKET, session.messageTokens + (now - session.messageRefillAt) * 0.12);
      session.messageRefillAt = now;
      if (--session.messageTokens < 0) { fail(session, "rate-limit"); return; }
      let message: LiveBrowserClientMessage | undefined;
      try { if (!binary) message = clientMessage(JSON.parse(raw.toString())); } catch { /* Invalid messages close below. */ }
      if (!message) { fail(session, "invalid-message", false); return; }
      if (message.type === "end") { void cleanup(session); return; }
      if (message.type === "ack") { void ackFrame(session, message.id); return; }
      if (message.type === "start") {
        if (session.setup) { fail(session, "invalid-message", false); return; }
        clearTimeout(session.initialTimer); touchActivity(session);
        session.query = message.query.trim(); session.width = message.width; session.height = message.height;
        session.initialUrl = new URL(bingSearchUrl(session.query)).href;
        send(session, { type: "status", state: "starting" });
        session.setup = setup(session).catch(() => { if (!session.closed) fail(session, "unavailable"); });
        return;
      }
      if (message.type === "pause") {
        const paused = message.paused;
        session.paused = paused; if (paused) session.inputEpoch++;
        touchActivity(session);
        if (session.cdp) enqueue(session, async () => {
          if (paused) await cancelTouch(session);
          if (session.ready) await setStreaming(session, !paused && !session.resizing);
        });
        return;
      }
      if (message.type === "resize") {
        session.pendingViewport = { width: message.width, height: message.height };
        session.inputEpoch++;
        touchActivity(session); resize(session); return;
      }
      if (session.paused) return;
      if (!session.setup || !session.cdp || !session.page) return;
      touchActivity(session);
      const cdp = session.cdp, page = session.page;
      // Find is document state, not a pointer gesture. Preserve requests that
      // arrive while the viewport is resizing, then apply in queue order.
      if (message.type === "find") {
        session.lastFind = { query: message.query, index: message.index, requestId: message.requestId };
        enqueue(session, async () => {
          if (session.paused) return;
          const result = await findInPage(page, message.query, message.index);
          send(session, { type: "find-result", query: message.query, total: result.total, index: result.index, requestId: message.requestId });
        });
        return;
      }
      if (message.type === "find-clear") {
        session.lastFind = undefined;
        enqueue(session, () => session.paused ? Promise.resolve() : findInPage(page, "", 0));
        return;
      }
      if (session.resizing) return;
      const point = (x: number, y: number) => ({ x: Math.max(0, Math.min(session.width - 1, x)), y: Math.max(0, Math.min(session.height - 1, y)) });
      if (message.type === "touch") enqueueInput(session, async () => {
        if (message.phase === "start") session.touched = true;
        if (!session.touched) return;
        const type = ({ start: "touchStart", move: "touchMove", end: "touchEnd", cancel: "touchCancel" } as const)[message.phase];
        await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: message.phase === "end" || message.phase === "cancel" ? [] : [{ ...point(message.x, message.y), radiusX: 1, radiusY: 1, force: 0.5, id: 1 }] });
        if (message.phase === "end" || message.phase === "cancel") {
          session.touched = false;
          const editable = await page.evaluate(() => {
            const element = document.activeElement;
            return element instanceof HTMLElement && (element.isContentEditable
              || element instanceof HTMLTextAreaElement && !element.disabled && !element.readOnly
              || element instanceof HTMLInputElement && !element.disabled && !element.readOnly && !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(element.type));
          });
          send(session, { type: "focus", editable: Boolean(editable) });
        }
      });
      else if (message.type === "wheel") enqueueInput(session, () => cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", ...point(message.x, message.y), deltaX: Math.max(-800, Math.min(800, message.deltaX)), deltaY: Math.max(-800, Math.min(800, message.deltaY)) }));
      else if (message.type === "key") enqueueInput(session, () => KEY_NAMES.has(message.key) ? page.keyboard.press(message.key) : page.keyboard.insertText(message.key));
      else if (message.type === "text") enqueueInput(session, () => page.keyboard.insertText(message.value));
    });
  });

  const upgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    let url: URL;
    try { url = new URL(req.url ?? "/", "http://localhost"); } catch { return; }
    if (url.pathname !== LIVE_BROWSER_PATH) return; // Coexist with Vite HMR and other WS endpoints.
    if (closing) return rejectUpgrade(socket, 503, "Unavailable");
    if (url.search || (req.url?.length ?? 0) > 256 || !req.headers.origin || !origins.has(req.headers.origin)) return rejectUpgrade(socket, 403, "Forbidden");
    const now = Date.now();
    for (const [key, bucket] of attempts) if (bucket.until <= now) attempts.delete(key);
    const key = req.socket.remoteAddress ?? "unknown"; // Never trust forwarded headers.
    let bucket = attempts.get(key);
    if (!bucket) {
      if (attempts.size >= 1000) return rejectUpgrade(socket, 503, "Unavailable");
      bucket = { count: 0, until: now + 60_000 }; attempts.set(key, bucket);
    }
    if (++bucket.count > 30) return rejectUpgrade(socket, 429, "Too Many Requests");
    // Upgraded streams own their heartbeat/idle policy, not HTTP's 25s timer.
    if ("setTimeout" in socket && typeof socket.setTimeout === "function") socket.setTimeout(0);
    wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
  };
  server.on("upgrade", upgrade);
  return {
    async close() {
      if (closing) { await active?.cleanup; return; }
      closing = true; server.off("upgrade", upgrade);
      if (active) await cleanup(active);
      for (const client of wss.clients) client.terminate();
      await new Promise<void>(resolve => wss.close(() => resolve()));
      attempts.clear();
    },
  };
}

export function liveBrowserPlugin(): Plugin {
  let controller: ReturnType<typeof attachLiveBrowserServer> | undefined;
  const close = async () => { await controller?.close(); await closeBingBrowser(); };
  return {
    name: "bing-live-browser",
    configureServer(server) {
      if (!server.httpServer) return;
      controller = attachLiveBrowserServer(server.httpServer, { allowedOrigins: ["http://localhost:5174", "http://127.0.0.1:5174"] });
      server.httpServer.once("close", () => { void close(); });
    },
    closeBundle: close,
  };
}
