import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { publicApiUrl } from "../../services/apiUrl";
import { awaitPublicApiReady } from "../../services/publicApiReady";
import { bingPageIdentity, bingSearchQuery, type BingPageSnapshot } from "../../services/bingPage";
import {
  LIVE_BROWSER_FRAME_HEADER_BYTES, LIVE_BROWSER_FRAME_MAGIC, LIVE_BROWSER_PATH,
  type LiveBrowserClientMessage, type LiveBrowserErrorCode,
} from "../../services/liveBrowserProtocol";
import { normalizeSearchQuery } from "../../services/searchSuggestions";
import { resultDestination, type IABFindRequest, type IABFindResult } from "../../services/webNavigation";
import type { BingLoadState } from "./LiveBingResults";
import styles from "./LiveBrowserResults.module.css";

interface Viewport { width: number; height: number }
interface ReadyPage extends Viewport { sourceUrl: string; title: string; faviconUrl: string | null; fetchedAt: string }
interface Failure { code: LiveBrowserErrorCode; retryable: boolean }
interface Connection {
  socket: WebSocket;
  viewport: Viewport;
  ready: boolean;
  send: (message: LiveBrowserClientMessage) => void;
  release: () => void;
  resetNavigation: () => void;
  updateActivity: (active: boolean) => void;
}
interface BrowserOwner { id: symbol; end: () => Promise<void> }
let browserOwner: BrowserOwner | null = null;
let ownerQueue: Promise<void> = Promise.resolve();

/** One free browser slot, transferred only after the previous server releases it. */
function claimBrowser(owner: BrowserOwner, signal: AbortSignal): Promise<boolean> {
  const task = ownerQueue.then(async () => {
    if (signal.aborted) return false;
    if (browserOwner && browserOwner.id !== owner.id) await browserOwner.end();
    if (signal.aborted) return false;
    browserOwner = owner;
    return true;
  });
  ownerQueue = task.then(() => undefined, () => undefined);
  return task;
}
function releaseBrowser(id: symbol) { if (browserOwner?.id === id) browserOwner = null; }
export interface LiveBrowserResultsProps {
  query: string;
  active?: boolean;
  onNavigate?: (url: string) => void;
  onLoadStateChange?: (state: BingLoadState, attempt: number) => void;
  onPageReady?: (snapshot: BingPageSnapshot) => void;
  findRequest?: IABFindRequest;
  onFindResult?: (result: IABFindResult) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const integer = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
const escape = (value: string) => value.replace(/[&"<>]/g, character => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[character]!);
const controlKeys = new Set(["Enter", "Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown", "Escape"]);
const STARTUP_TIMEOUT_MS = 55_000;
const FIRST_FRAME_ACTIVE_TIMEOUT_MS = 10_000;

function socketUrl(): string {
  const url = new URL(publicApiUrl(LIVE_BROWSER_PATH), window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.href;
}

async function decodeFrame(blob: Blob): Promise<{ source: CanvasImageSource; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error("Invalid browser frame")); image.src = url;
    });
    return { source: image, close: () => URL.revokeObjectURL(url) };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

/** A live remote viewport; app navigation and system chrome remain outside it. */
export function LiveBrowserResults(props: LiveBrowserResultsProps) {
  const { query, active = true, findRequest } = props;
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const keyboard = useRef<HTMLTextAreaElement>(null);
  const callbacks = useRef(props); callbacks.current = props;
  const current = useRef<Connection | null>(null);
  const connecting = useRef(false);
  const generation = useRef(0);
  const viewport = useRef<Viewport | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const pendingMove = useRef<{ x: number; y: number } | null>(null);
  const moveFrame = useRef<number>();
  const composing = useRef(false);
  const postedFind = useRef<IABFindRequest | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [activation, setActivation] = useState(0);
  const [readyQuery, setReadyQuery] = useState<string | null>(null);
  const ready = readyQuery === query;
  const [failure, setFailure] = useState<Failure | null>(null);

  const inputConnection = () => {
    const connection = current.current;
    return active && connection?.ready && !root.current?.closest("[inert]") ? connection : null;
  };
  const coordinates = (clientX: number, clientY: number, connection: Connection) => {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return {
      x: clamp((clientX - rect.left) * connection.viewport.width / rect.width, 0, connection.viewport.width - 1),
      y: clamp((clientY - rect.top) * connection.viewport.height / rect.height, 0, connection.viewport.height - 1),
    };
  };
  const flushMove = () => {
    if (moveFrame.current !== undefined) cancelAnimationFrame(moveFrame.current);
    moveFrame.current = undefined;
    const move = pendingMove.current; pendingMove.current = null;
    const connection = inputConnection();
    if (move && connection && pointer.current) connection.send({ type: "touch", phase: "move", ...move });
  };

  useEffect(() => {
    setReadyQuery(null); setFailure(null); postedFind.current = null;
    if (!active) return;
    const ticket = ++generation.current;
    const ownerId = Symbol("live-browser-connection");
    connecting.current = true;
    const controller = new AbortController();
    let disposed = false, failed = false, ended = false, decoding = false, drawn = false, published = false, navigationSent = false;
    let readiness = 0;
    let socket: WebSocket | null = null, page: ReadyPage | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let frameTimeout: ReturnType<typeof setTimeout> | undefined;
    let awaitingFirstFrame = false;
    let frameTimeRemaining = FIRST_FRAME_ACTIVE_TIMEOUT_MS;
    let frameStartedAt: number | undefined;
    let finishClose: (() => void) | null = null;
    let ending: Promise<void> | null = null;
    callbacks.current.onLoadStateChange?.("loading", attempt);
    const isCurrent = () => !disposed && !failed && !ended;
    const send = (message: LiveBrowserClientMessage) => {
      if (!disposed && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    };
    const release = () => {
      if (moveFrame.current !== undefined) cancelAnimationFrame(moveFrame.current);
      moveFrame.current = undefined; pendingMove.current = null;
      const touch = pointer.current; pointer.current = null;
      if (touch) send({ type: "touch", phase: "cancel", x: touch.x, y: touch.y });
      composing.current = false;
      if (keyboard.current) keyboard.current.value = "";
    };
    const pauseFrameDeadline = () => {
      clearTimeout(frameTimeout); frameTimeout = undefined;
      if (frameStartedAt !== undefined) frameTimeRemaining = Math.max(0, frameTimeRemaining - (Date.now() - frameStartedAt));
      frameStartedAt = undefined;
    };
    const end = (): Promise<void> => {
      if (ending) return ending;
      release(); clearTimeout(timeout); pauseFrameDeadline(); ended = true;
      if (current.current?.socket === socket) current.current = null;
      if (!socket || socket.readyState === WebSocket.CLOSED) { releaseBrowser(ownerId); return Promise.resolve(); }
      const endingSocket = socket;
      ending = new Promise<void>((resolve, reject) => {
        // This is a resource handoff deadline, not an animation parameter.
        const timer = setTimeout(() => { endingSocket.close(); reject(new Error("The previous live page did not close")); }, 15_000);
        finishClose = () => { clearTimeout(timer); releaseBrowser(ownerId); resolve(); };
        if (endingSocket.readyState === WebSocket.OPEN) endingSocket.send(JSON.stringify({ type: "end" } satisfies LiveBrowserClientMessage));
        else endingSocket.close();
      });
      return ending;
    };
    const fail = (code: LiveBrowserErrorCode = "unavailable", retryable = true) => {
      if (!isCurrent()) return;
      release(); failed = true; clearTimeout(timeout); pauseFrameDeadline();
      if (current.current?.socket === socket) { current.current.ready = false; current.current = null; }
      setReadyQuery(null); setFailure({ code, retryable });
      callbacks.current.onLoadStateChange?.("error", attempt);
      socket?.close();
    };
    const updateActivity = (enabled: boolean) => {
      pauseFrameDeadline();
      if (!enabled || !awaitingFirstFrame || !isCurrent()) return;
      frameStartedAt = Date.now();
      frameTimeout = setTimeout(() => fail(), frameTimeRemaining);
    };
    const publish = () => {
      if (!isCurrent() || !page || !drawn || !canvas.current || published) return;
      clearTimeout(timeout); awaitingFirstFrame = false; pauseFrameDeadline(); setReadyQuery(query);
      if (current.current?.socket === socket) current.current.ready = true;
      callbacks.current.onLoadStateChange?.("complete", attempt);
      published = true;
      let image: string;
      try { image = canvas.current.toDataURL("image/jpeg", 0.75); }
      catch { return; } // A failed thumbnail must not disconnect the live page.
      if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)) return;
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><title>${escape(page.title)}</title></head><body style="margin:0"><img src="${image}" width="${page.width}" height="${page.height}" alt="" style="display:block;width:100%;height:auto"></body></html>`;
      callbacks.current.onPageReady?.({ ...page, html, viewportWidth: page.width, viewportHeight: page.height });
    };
    const receiveFrame = async (data: ArrayBuffer) => {
      if (!isCurrent()) return;
      if (decoding || data.byteLength <= LIVE_BROWSER_FRAME_HEADER_BYTES || data.byteLength > 8 * 1024 * 1024) { fail(); return; }
      const header = new DataView(data);
      const id = header.getUint32(4), width = header.getUint16(8), height = header.getUint16(10);
      if (header.getUint32(0) !== LIVE_BROWSER_FRAME_MAGIC || !integer(width, 1, 2048) || !integer(height, 1, 2048)) { fail(); return; }
      decoding = true;
      const frameReadiness = readiness;
      let decoded: Awaited<ReturnType<typeof decodeFrame>> | undefined;
      try {
        decoded = await decodeFrame(new Blob([data.slice(LIVE_BROWSER_FRAME_HEADER_BYTES)], { type: "image/jpeg" }));
        if (!isCurrent()) return;
        const element = canvas.current, context = element?.getContext("2d");
        if (!element || !context) throw new Error("Browser rendering unavailable");
        element.width = width; element.height = height;
        context.drawImage(decoded.source, 0, 0, width, height);
        if (current.current?.socket === socket && integer(width, 320, 480) && integer(height, 300, 900)) current.current.viewport = { width, height };
        // A frame already decoding when ready arrives still belongs to loading.
        drawn = Boolean(page && frameReadiness === readiness);
        send({ type: "ack", id }); publish();
      } catch { fail(); }
      finally { decoded?.close(); decoding = false; }
    };
    const connect = async () => {
      try {
        await awaitPublicApiReady(controller.signal);
        if (!isCurrent() || controller.signal.aborted || callbacks.current.active === false) return;
        if (!await claimBrowser({ id: ownerId, end }, controller.signal) || !isCurrent()) return;
        viewport.current ??= {
          width: clamp(Math.round(root.current?.clientWidth || 402), 320, 480),
          height: clamp(Math.round(root.current?.clientHeight || 668), 300, 900),
        };
        socket = new WebSocket(socketUrl()); socket.binaryType = "arraybuffer";
        current.current = { socket, viewport: viewport.current, ready: false, send, release,
          resetNavigation: () => { navigationSent = false; }, updateActivity };
        // Resource budgets: up to 8s queueing, 10s browser launch and 30s readiness.
        timeout = setTimeout(() => fail(), STARTUP_TIMEOUT_MS);
        socket.onopen = () => {
          if (!isCurrent()) return;
          send({ type: "start", query, ...viewport.current! });
          if (callbacks.current.active === false) send({ type: "pause", paused: true });
        };
        socket.onerror = () => fail();
        socket.onclose = () => { finishClose?.(); releaseBrowser(ownerId); if (isCurrent()) fail(); };
        socket.onmessage = event => {
          if (!isCurrent()) return;
          if (event.data instanceof ArrayBuffer) { void receiveFrame(event.data); return; }
          if (typeof event.data !== "string") { fail(); return; }
          let message: Record<string, unknown>;
          try {
            const value: unknown = JSON.parse(event.data);
            if (!value || typeof value !== "object") throw new Error("Invalid message");
            message = value as Record<string, unknown>;
          } catch { fail(); return; }
          if (message.type === "status") {
            if (!page && (message.state === "starting" || message.state === "loading")) callbacks.current.onLoadStateChange?.("loading", attempt);
          } else if (message.type === "ready") {
            if (page) return;
            if (!integer(message.width, 320, 480) || !integer(message.height, 300, 900) || typeof message.sourceUrl !== "string"
              || bingSearchQuery(message.sourceUrl) !== normalizeSearchQuery(query) || typeof message.title !== "string"
              || typeof message.fetchedAt !== "string" || !Number.isFinite(Date.parse(message.fetchedAt))) { fail(); return; }
            const identity = bingPageIdentity(query, message.sourceUrl, message.faviconUrl);
            page = { width: message.width, height: message.height, ...identity, title: message.title, fetchedAt: message.fetchedAt };
            ++readiness; drawn = false;
            clearTimeout(timeout); timeout = undefined;
            // A paused server deliberately sends no frames. Count only foreground
            // time toward the first-frame budget, preserving it across reversals.
            awaitingFirstFrame = true; updateActivity(callbacks.current.active !== false);
            if (current.current?.socket === socket) current.current.viewport = { width: page.width, height: page.height };
            callbacks.current.onLoadStateChange?.("rendering", attempt); publish();
          } else if (message.type === "error") {
            const code = ["busy", "invalid-message", "rate-limit", "unavailable", "expired", "bandwidth-limit", "inactive"].includes(String(message.code))
              ? message.code as LiveBrowserErrorCode : "unavailable";
            fail(code, message.retryable !== false);
          } else if (message.type === "navigate" && typeof message.url === "string") {
            const destination = resultDestination(message.url);
            if (destination && !navigationSent && page && current.current?.ready && callbacks.current.active !== false) {
              navigationSent = true; release(); callbacks.current.onNavigate?.(destination);
            }
          } else if (message.type === "focus" && typeof message.editable === "boolean" && page && current.current?.ready
            && callbacks.current.active !== false && !root.current?.closest("[inert]")) {
            if (message.editable) keyboard.current?.focus({ preventScroll: true });
            else if (document.activeElement === keyboard.current) keyboard.current?.blur();
          } else if (message.type === "find-result") {
            const latest = callbacks.current.findRequest, posted = postedFind.current;
            if (!latest || !posted || message.requestId !== latest.requestId || message.requestId !== posted.requestId
              || message.query !== latest.query || message.query !== posted.query || !integer(message.total, 0, Number.MAX_SAFE_INTEGER)
              || !Number.isSafeInteger(message.index) || (message.total === 0 ? message.index !== -1 : Number(message.index) < 0 || Number(message.index) >= message.total)) return;
            callbacks.current.onFindResult?.({ ...latest, total: message.total, index: Number(message.index) });
          }
        };
      } catch { if (!controller.signal.aborted) fail(); }
      finally { if (generation.current === ticket) connecting.current = false; }
    };
    const blur = () => release();
    window.addEventListener("blur", blur);
    void connect();
    return () => {
      release(); send({ type: "find-clear" });
      void end().catch(() => {});
      disposed = true; controller.abort(); clearTimeout(timeout);
      window.removeEventListener("blur", blur);
      if (current.current?.socket === socket) current.current = null;
      if (generation.current === ticket) connecting.current = false;
      keyboard.current?.blur();
    };
  }, [query, attempt, activation]);

  useEffect(() => {
    const connection = current.current;
    if (active) {
      if (connection) { connection.resetNavigation(); connection.updateActivity(true); connection.send({ type: "pause", paused: false }); }
      else if (!connecting.current) setActivation(value => value + 1);
    } else if (connection) {
      connection.release(); connection.updateActivity(false); connection.send({ type: "pause", paused: true });
      if (document.activeElement === keyboard.current) keyboard.current?.blur();
    }
  }, [active]);

  useEffect(() => {
    if (!active || !ready || !root.current || typeof ResizeObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const connection = current.current, element = root.current;
        if (!connection?.ready || !element?.clientWidth || !element.clientHeight) return;
        const next = { width: clamp(Math.round(element.clientWidth), 320, 480), height: clamp(Math.round(element.clientHeight), 300, 900) };
        if (next.width === viewport.current?.width && next.height === viewport.current?.height) return;
        viewport.current = next; connection.send({ type: "resize", ...next });
      }, 120);
    };
    const observer = new ResizeObserver(measure); observer.observe(root.current); measure();
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [active, ready]);

  useEffect(() => {
    const connection = current.current;
    if (!active || !ready || !connection?.ready) return;
    postedFind.current = findRequest ?? null;
    connection.send(findRequest ? { type: "find", ...findRequest } : { type: "find-clear" });
  }, [active, ready, findRequest]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let pending: { x: number; y: number; deltaX: number; deltaY: number } | null = null;
    let animation: number | undefined;
    const wheel = (event: WheelEvent) => {
      const connection = inputConnection();
      if (!connection) return;
      event.preventDefault();
      const point = coordinates(event.clientX, event.clientY, connection), rect = element.getBoundingClientRect();
      if (!point) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? connection.viewport.height : 1;
      pending = { ...point, deltaX: (pending?.deltaX ?? 0) + event.deltaX * unit * connection.viewport.width / rect.width,
        deltaY: (pending?.deltaY ?? 0) + event.deltaY * unit * connection.viewport.height / rect.height };
      animation ??= requestAnimationFrame(() => {
        animation = undefined;
        const value = pending; pending = null;
        if (value) inputConnection()?.send({ type: "wheel", ...value, deltaX: clamp(value.deltaX, -800, 800), deltaY: clamp(value.deltaY, -800, 800) });
      });
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => { element.removeEventListener("wheel", wheel); if (animation !== undefined) cancelAnimationFrame(animation); };
  }, [active, ready]);

  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const connection = inputConnection();
    if (!connection || pointer.current || event.button !== 0) return;
    const point = coordinates(event.clientX, event.clientY, connection);
    if (!point) return;
    event.preventDefault();
    // A card tap must not summon the device keyboard. The bridge supports mouse
    // and physical keyboard input; touch input waits for a remote editable focus.
    if (event.pointerType !== "touch" && event.pointerType !== "pen") keyboard.current?.focus({ preventScroll: true });
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Older browsers still dispatch an ordinary click. */ }
    pointer.current = { id: event.pointerId, ...point }; connection.send({ type: "touch", phase: "start", ...point });
  };
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const connection = inputConnection();
    if (!connection || pointer.current?.id !== event.pointerId) return;
    const point = coordinates(event.clientX, event.clientY, connection);
    if (!point) return;
    event.preventDefault(); pointer.current = { id: event.pointerId, ...point }; pendingMove.current = point;
    moveFrame.current ??= requestAnimationFrame(flushMove);
  };
  const pointerEnd = (event: PointerEvent<HTMLCanvasElement>, phase: "end" | "cancel") => {
    if (pointer.current?.id !== event.pointerId) return;
    flushMove();
    const connection = inputConnection(), point = connection && coordinates(event.clientX, event.clientY, connection);
    if (point) connection?.send({ type: "touch", phase, ...point });
    pointer.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Capture may already be released by the browser. */ }
  };
  const sendText = (value: string) => {
    const connection = inputConnection();
    if (!connection) return;
    const text = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
    for (let offset = 0; offset < text.length;) {
      let end = Math.min(offset + 500, text.length);
      if (end < text.length && /[\ud800-\udbff]/u.test(text[end - 1])) --end;
      connection.send({ type: "text", value: text.slice(offset, end) }); offset = end;
    }
  };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const connection = inputConnection();
    if (!connection || composing.current || event.nativeEvent.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (controlKeys.has(event.key)) { event.preventDefault(); connection.send({ type: "key", key: event.key }); }
    else if (event.key.length === 1) { event.preventDefault(); sendText(event.key); }
  };

  const displayed = Boolean(ready && current.current?.ready);
  return <div ref={root} className={styles.root} aria-busy={active && !displayed && !failure}>
    <canvas ref={canvas} className={styles.canvas} role="img" aria-label={`Live Bing results for ${query}`} tabIndex={active && displayed ? 0 : -1}
      data-live-browser-ready={displayed} style={{ visibility: displayed ? "visible" : "hidden" }}
      onFocus={() => { if (inputConnection()) keyboard.current?.focus({ preventScroll: true }); }}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => pointerEnd(event, "end")}
      onPointerCancel={event => pointerEnd(event, "cancel")} onLostPointerCapture={event => pointerEnd(event, "cancel")} />
    <textarea ref={keyboard} className={styles.keyboard} aria-label="Type into Bing results" tabIndex={-1} autoComplete="off" autoCapitalize="off" spellCheck={false}
      onKeyDown={keyDown} onBlur={() => current.current?.release()}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={event => { composing.current = false; sendText(event.data); event.currentTarget.value = ""; }}
      onInput={event => { if (!composing.current) { sendText(event.currentTarget.value); event.currentTarget.value = ""; } }}
      onPaste={event => { event.preventDefault(); sendText(event.clipboardData.getData("text/plain")); }} />
    {failure && <div className={styles.message} role="alert">
      <p>{failure.code === "busy" ? "Live results are busy" : failure.code === "expired" || failure.code === "inactive" ? "Live results ended" : "Couldn’t connect to live results"}</p>
      <p className={styles.explanation}>Try again to open a live Bing page.</p>
      {failure.retryable && <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button>}
    </div>}
  </div>;
}
