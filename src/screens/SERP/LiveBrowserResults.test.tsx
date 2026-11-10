import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveBrowserResults } from "./LiveBrowserResults";
import { awaitPublicApiReady } from "../../services/publicApiReady";
import { LIVE_BROWSER_FRAME_MAGIC, type LiveBrowserClientMessage } from "../../services/liveBrowserProtocol";

vi.mock("../../services/publicApiReady", () => ({ awaitPublicApiReady: vi.fn(async () => {}) }));

class Socket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: Socket[] = [];
  readyState = 0;
  binaryType = "";
  sent: LiveBrowserClientMessage[] = [];
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  constructor(readonly url: string) { Socket.instances.push(this); }
  send = vi.fn((raw: string) => {
    const message = JSON.parse(raw) as LiveBrowserClientMessage;
    this.sent.push(message);
    if (message.type === "end") queueMicrotask(() => this.close());
  });
  close = vi.fn(() => { if (this.readyState === 3) return; this.readyState = 3; this.onclose?.(new Event("close")); });
  open() { this.readyState = 1; this.onopen?.(new Event("open")); }
  message(data: unknown) { this.onmessage?.(new MessageEvent("message", { data })); }
}
class Pointer extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? "mouse"; }
}
const bitmap = () => ({ width: 402, height: 668, close: vi.fn() });
let draw: ReturnType<typeof vi.fn>;
let animationId = 0;
let animations: Map<number, FrameRequestCallback>;
let resize: ResizeObserverCallback | undefined;
const frame = (id: number, width = 402, height = 668) => {
  const buffer = new ArrayBuffer(16), header = new DataView(buffer);
  header.setUint32(0, LIVE_BROWSER_FRAME_MAGIC); header.setUint32(4, id); header.setUint16(8, width); header.setUint16(10, height);
  new Uint8Array(buffer).set([0xff, 0xd8, 0xff, 0xd9], 12);
  return buffer;
};
const metadata = (query = "weather", height = 668) => ({ type: "ready", width: 402, height,
  sourceUrl: `https://www.bing.com/search?${new URLSearchParams({ q: query })}`, title: `${query} - Search`,
  faviconUrl: "https://www.bing.com/favicon.ico", fetchedAt: "2026-11-10T10:00:00Z" });
const json = (socket: Socket, value: unknown) => socket.message(JSON.stringify(value));
const connected = async (position = 0) => { await waitFor(() => expect(Socket.instances.length).toBeGreaterThan(position)); const socket = Socket.instances[position]; act(() => socket.open()); return socket; };
const ready = async (socket: Socket, query = "weather") => {
  await act(async () => { json(socket, metadata(query)); socket.message(frame(1)); });
};
const flushAnimation = () => act(() => { const pending = [...animations.values()]; animations.clear(); pending.forEach(callback => callback(0)); });

beforeEach(() => {
  Socket.instances = []; animations = new Map(); resize = undefined;
  vi.mocked(awaitPublicApiReady).mockResolvedValue(undefined);
  vi.stubGlobal("WebSocket", Socket); vi.stubGlobal("PointerEvent", Pointer);
  vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap()));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { const id = ++animationId; animations.set(id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => animations.delete(id));
  vi.stubGlobal("ResizeObserver", class { constructor(callback: ResizeObserverCallback) { resize = callback; } observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(402);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(668);
  draw = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: draw } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,/9j/2Q==");
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 10, top: 20, width: 201, height: 334, right: 211, bottom: 354, x: 10, y: 20, toJSON: () => ({}) });
});
afterEach(async () => {
  cleanup(); await act(async () => {});
  for (const socket of Socket.instances) socket.close();
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.mocked(awaitPublicApiReady).mockClear();
});

describe("Live remote Bing viewport", () => {
  it("starts one usable connection after StrictMode replays a deferred mount", async () => {
    const pending: (() => void)[] = [];
    vi.mocked(awaitPublicApiReady).mockImplementation(() => new Promise(resolve => pending.push(resolve)));
    const onPageReady = vi.fn();
    render(<StrictMode><LiveBrowserResults query="weather" onPageReady={onPageReady} /></StrictMode>);
    expect(awaitPublicApiReady).toHaveBeenCalledTimes(2);
    await act(async () => { pending.forEach(resolve => resolve()); });
    const socket = await connected();
    expect(Socket.instances).toHaveLength(1);
    expect(socket.sent).toContainEqual({ type: "start", query: "weather", width: 402, height: 668 });
    await ready(socket);
    expect(onPageReady).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Live Bing results for weather")).toHaveAttribute("data-live-browser-ready", "true");
  });

  it("activates after an inactive StrictMode mount and survives inactivity while health is pending", async () => {
    const pending: (() => void)[] = [];
    vi.mocked(awaitPublicApiReady).mockImplementation(() => new Promise(resolve => pending.push(resolve)));
    const view = (active: boolean) => <StrictMode><LiveBrowserResults query="weather" active={active} /></StrictMode>;
    const { rerender } = render(view(false));
    expect(Socket.instances).toHaveLength(0);
    rerender(view(true));
    expect(pending).toHaveLength(1);
    rerender(view(false));
    await act(async () => { pending.shift()!(); });
    rerender(view(true));
    await act(async () => { pending.splice(0).forEach(resolve => resolve()); });
    const socket = await connected();
    expect(Socket.instances).toHaveLength(1);
    expect(socket.sent).toContainEqual({ type: "start", query: "weather", width: 402, height: 668 });
    await ready(socket);
    expect(screen.getByLabelText("Live Bing results for weather")).toHaveAttribute("data-live-browser-ready", "true");
  });

  it("wakes the backend, keeps the query out of the socket URL, and publishes one real decoded thumbnail", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://bing-app-backend.onrender.com/service");
    const onPageReady = vi.fn(), onLoad = vi.fn();
    render(<LiveBrowserResults query="weather & forecast" onPageReady={onPageReady} onLoadStateChange={onLoad} />);
    const socket = await connected();
    expect(awaitPublicApiReady).toHaveBeenCalledOnce();
    expect(socket.url).toBe("wss://bing-app-backend.onrender.com/service/api/live-browser");
    expect(socket.sent[0]).toEqual({ type: "start", query: "weather & forecast", width: 402, height: 668 });
    await ready(socket, "weather & forecast");
    expect(draw).toHaveBeenCalledOnce();
    expect(socket.sent).toContainEqual({ type: "ack", id: 1 });
    expect(onPageReady).toHaveBeenCalledOnce();
    expect(onPageReady).toHaveBeenCalledWith(expect.objectContaining({ sourceUrl: "https://www.bing.com/search?q=weather+%26+forecast", viewportWidth: 402, viewportHeight: 668,
      html: expect.stringContaining('<img src="data:image/jpeg;base64,/9j/2Q=="') }));
    await act(async () => socket.message(frame(2)));
    expect(draw).toHaveBeenCalledTimes(2);
    expect(onPageReady).toHaveBeenCalledOnce();
    expect(onLoad.mock.calls.filter(([state]) => state === "complete")).toHaveLength(1);
  });

  it("never promotes a loading frame or a late decode from an obsolete socket", async () => {
    let finish!: (value: ReturnType<typeof bitmap>) => void;
    vi.mocked(createImageBitmap).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const onPageReady = vi.fn();
    const { rerender } = render(<LiveBrowserResults query="weather" onPageReady={onPageReady} />);
    const old = await connected();
    act(() => old.message(frame(1)));
    act(() => json(old, metadata()));
    expect(screen.getByLabelText("Live Bing results for weather")).toHaveAttribute("data-live-browser-ready", "false");
    const staleBitmap = bitmap();
    await act(async () => finish(staleBitmap));
    expect(onPageReady).not.toHaveBeenCalled();
    expect(staleBitmap.close).toHaveBeenCalledOnce();
    await act(async () => old.message(frame(2)));
    expect(onPageReady).toHaveBeenCalledOnce();

    let finishOld!: (value: ReturnType<typeof bitmap>) => void;
    vi.mocked(createImageBitmap).mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    act(() => old.message(frame(3)));
    rerender(<LiveBrowserResults query="news" onPageReady={onPageReady} />);
    const next = await connected(1);
    const count = draw.mock.calls.length, closedBitmap = bitmap();
    await act(async () => finishOld(closedBitmap));
    expect(draw).toHaveBeenCalledTimes(count);
    expect(closedBitmap.close).toHaveBeenCalledOnce();
    expect(old.sent).not.toContainEqual({ type: "ack", id: 3 });
    await ready(next, "news");
    expect(onPageReady).toHaveBeenCalledTimes(2);
  });

  it("maps scaled pointer and wheel input, releases a drag on blur, and waits for editable touch focus", async () => {
    render(<><button>Other control</button><LiveBrowserResults query="weather" /></>);
    const socket = await connected(); await ready(socket);
    const surface = screen.getByRole("img", { name: "Live Bing results for weather" });
    const keyboard = screen.getByRole("textbox", { name: "Type into Bing results" });
    screen.getByRole("button", { name: "Other control" }).focus();
    fireEvent.pointerDown(surface, { pointerId: 7, pointerType: "touch", button: 0, clientX: 110.5, clientY: 187 });
    expect(keyboard).not.toHaveFocus();
    expect(socket.sent).toContainEqual({ type: "touch", phase: "start", x: 201, y: 334 });
    fireEvent.pointerMove(surface, { pointerId: 7, pointerType: "touch", clientX: 211, clientY: 354 }); flushAnimation();
    expect(socket.sent).toContainEqual({ type: "touch", phase: "move", x: 401, y: 667 });
    fireEvent(window, new Event("blur"));
    expect(socket.sent).toContainEqual({ type: "touch", phase: "cancel", x: 401, y: 667 });
    fireEvent.wheel(surface, { clientX: 110.5, clientY: 187, deltaX: 5, deltaY: 20 }); flushAnimation();
    expect(socket.sent).toContainEqual({ type: "wheel", x: 201, y: 334, deltaX: 10, deltaY: 40 });
    act(() => json(socket, { type: "focus", editable: true }));
    expect(keyboard).toHaveFocus();
    fireEvent.keyDown(keyboard, { key: "A" }); fireEvent.keyDown(keyboard, { key: "Backspace" });
    fireEvent.compositionStart(keyboard); fireEvent.keyDown(keyboard, { key: "Process", isComposing: true });
    fireEvent.compositionEnd(keyboard, { data: "天气" });
    fireEvent.paste(keyboard, { clipboardData: { getData: () => "paste text" } });
    expect(socket.sent).toContainEqual({ type: "text", value: "A" });
    expect(socket.sent).toContainEqual({ type: "key", key: "Backspace" });
    expect(socket.sent).toContainEqual({ type: "text", value: "天气" });
    expect(socket.sent).toContainEqual({ type: "text", value: "paste text" });
  });

  it("pauses and resumes the same page, while a different document waits for ordered release", async () => {
    const onPageReady = vi.fn();
    const { rerender } = render(<LiveBrowserResults query="weather" onPageReady={onPageReady} />);
    const first = await connected(); await ready(first);
    rerender(<LiveBrowserResults query="weather" active={false} onPageReady={onPageReady} />);
    expect(first.sent).toContainEqual({ type: "pause", paused: true });
    expect(first.close).not.toHaveBeenCalled();
    rerender(<LiveBrowserResults query="weather" active onPageReady={onPageReady} />);
    expect(first.sent).toContainEqual({ type: "pause", paused: false });
    expect(Socket.instances).toHaveLength(1);
    await act(async () => first.message(frame(2)));
    expect(onPageReady).toHaveBeenCalledOnce();
    const close = first.close;
    close.mockImplementationOnce(() => {});
    render(<LiveBrowserResults query="news" />);
    await waitFor(() => expect(first.sent).toContainEqual({ type: "end" }));
    expect(Socket.instances).toHaveLength(1);
    act(() => { first.readyState = Socket.CLOSED; first.onclose?.(new Event("close")); });
    const second = await connected(1); await ready(second, "news");
  });

  it("retains a page that becomes ready while Recent is open beyond the startup deadline", async () => {
    vi.useFakeTimers();
    try {
      const onPageReady = vi.fn();
      const view = (active: boolean) => <LiveBrowserResults query="weather" active={active} onPageReady={onPageReady} />;
      const { rerender } = render(view(true));
      await act(async () => {});
      const socket = Socket.instances[0]; act(() => socket.open());
      await act(async () => vi.advanceTimersByTime(5000));
      rerender(view(false));
      act(() => json(socket, metadata()));
      await act(async () => vi.advanceTimersByTime(60_000));
      expect(socket.close).not.toHaveBeenCalled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(onPageReady).not.toHaveBeenCalled();
      rerender(view(true));
      await act(async () => socket.message(frame(1)));
      expect(Socket.instances).toHaveLength(1);
      expect(onPageReady).toHaveBeenCalledOnce();
      expect(screen.getByLabelText("Live Bing results for weather")).toHaveAttribute("data-live-browser-ready", "true");
    } finally { vi.useRealTimers(); }
  });

  it("bounds first-frame foreground time without charging time spent paused", async () => {
    vi.useFakeTimers();
    try {
      const view = (active: boolean) => <LiveBrowserResults query="weather" active={active} />;
      const { rerender } = render(view(true));
      await act(async () => {});
      const socket = Socket.instances[0]; act(() => socket.open());
      act(() => json(socket, metadata()));
      await act(async () => vi.advanceTimersByTime(4000));
      rerender(view(false));
      await act(async () => vi.advanceTimersByTime(60_000));
      expect(socket.close).not.toHaveBeenCalled();
      rerender(view(true));
      await act(async () => vi.advanceTimersByTime(5999));
      expect(socket.close).not.toHaveBeenCalled();
      await act(async () => vi.advanceTimersByTime(1));
      expect(socket.close).toHaveBeenCalledOnce();
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t connect to live results");
    } finally { vi.useRealTimers(); }
  });

  it("allows the full cold-start budget but still bounds a missing ready message", async () => {
    vi.useFakeTimers();
    try {
      render(<LiveBrowserResults query="weather" />);
      await act(async () => {});
      const socket = Socket.instances[0]; act(() => socket.open());
      await act(async () => vi.advanceTimersByTime(54_999));
      expect(socket.close).not.toHaveBeenCalled();
      await act(async () => vi.advanceTimersByTime(1));
      expect(socket.close).toHaveBeenCalledOnce();
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t connect to live results");
    } finally { vi.useRealTimers(); }
  });

  it("opens another result after returning from an external page without reopening the stream", async () => {
    const onNavigate = vi.fn();
    const { rerender } = render(<LiveBrowserResults query="weather" onNavigate={onNavigate} />);
    const socket = await connected(); await ready(socket);
    act(() => { json(socket, { type: "navigate", url: "https://example.com/first" }); json(socket, { type: "navigate", url: "https://example.com/first" }); });
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("https://example.com/first");
    rerender(<LiveBrowserResults query="weather" active={false} onNavigate={onNavigate} />);
    act(() => json(socket, { type: "navigate", url: "https://example.com/covered" }));
    expect(onNavigate).toHaveBeenCalledOnce();
    rerender(<LiveBrowserResults query="weather" active onNavigate={onNavigate} />);
    act(() => json(socket, { type: "navigate", url: "https://example.com/second" }));
    expect(onNavigate).toHaveBeenCalledTimes(2);
    expect(onNavigate).toHaveBeenLastCalledWith("https://example.com/second");
    expect(Socket.instances).toHaveLength(1);
  });

  it("forwards current find requests, rejects stale results, and resizes without reconnecting", async () => {
    vi.useFakeTimers();
    const onFindResult = vi.fn(), request = { query: "forecast", index: 0, requestId: 1 };
    render(<LiveBrowserResults query="weather" findRequest={request} onFindResult={onFindResult} />);
    await act(async () => {});
    const socket = Socket.instances[0]; act(() => socket.open()); await ready(socket);
    expect(socket.sent).toContainEqual({ type: "find", ...request });
    act(() => { json(socket, { type: "find-result", ...request, total: 3, index: 0, requestId: 0 }); json(socket, { type: "find-result", ...request, total: 3, index: 0 }); });
    expect(onFindResult).toHaveBeenCalledExactlyOnceWith({ ...request, total: 3 });
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(500);
    act(() => resize?.([], {} as ResizeObserver));
    await act(async () => vi.advanceTimersByTime(120));
    expect(socket.sent).toContainEqual({ type: "resize", width: 402, height: 500 });
    expect(Socket.instances).toHaveLength(1);
    cleanup(); await act(async () => {}); vi.useRealTimers();
  });

  it("connects on demand, exposes busy retry, and never accepts a wrong-query ready message", async () => {
    const onPageReady = vi.fn();
    const { rerender } = render(<LiveBrowserResults query="weather" active={false} onPageReady={onPageReady} />);
    expect(Socket.instances).toHaveLength(0);
    rerender(<LiveBrowserResults query="weather" active onPageReady={onPageReady} />);
    const first = await connected();
    act(() => json(first, { type: "error", code: "busy", retryable: true }));
    expect(screen.getByRole("alert")).toHaveTextContent("Live results are busy");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    const next = await connected(1);
    act(() => json(next, metadata("claude")));
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t connect to live results");
    expect(onPageReady).not.toHaveBeenCalled();
    expect(draw).not.toHaveBeenCalled();
  });
});
