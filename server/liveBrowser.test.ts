// @vitest-environment node
import { createServer, type Server } from "node:http";
import { EventEmitter } from "node:events";
import { WebSocket, type RawData } from "ws";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachLiveBrowserServer } from "./liveBrowser";
import { LIVE_BROWSER_FRAME_MAGIC, type LiveBrowserClientMessage, type LiveBrowserServerMessage } from "../src/services/liveBrowserProtocol";
import { bingSearchUrl } from "../src/services/bingPage";

const pool = vi.hoisted(() => ({ acquire: vi.fn(), close: vi.fn() }));
vi.mock("./bingBrowser", () => ({ acquireBingBrowser: pool.acquire, closeBingBrowser: pool.close }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
function browserFixture() {
  const cdp = new EventEmitter() as EventEmitter & { send: ReturnType<typeof vi.fn> };
  cdp.send = vi.fn().mockResolvedValue(undefined);
  const frame = {};
  const page = Object.assign(new EventEmitter(), {
    goto: vi.fn().mockResolvedValue(undefined), addStyleTag: vi.fn().mockResolvedValue(undefined),
    content: vi.fn().mockResolvedValue('<input id="sb_form_q" value="weather"><main id="b_content"><ol id="b_results"><li class="b_algo"><h2>Weather forecast</h2><p>Current weather information.</p></li></ol></main>'),
    waitForFunction: vi.fn().mockResolvedValue(undefined), title: vi.fn().mockResolvedValue("Weather - Bing"),
    url: vi.fn().mockReturnValue(bingSearchUrl("weather")),
    mainFrame: vi.fn().mockReturnValue(frame), evaluate: vi.fn().mockResolvedValue({ total: 3, index: 1 }),
    setViewportSize: vi.fn().mockResolvedValue(undefined),
    keyboard: { press: vi.fn().mockResolvedValue(undefined), insertText: vi.fn().mockResolvedValue(undefined) },
  });
  const context = Object.assign(new EventEmitter(), {
    route: vi.fn().mockResolvedValue(undefined), newPage: vi.fn().mockResolvedValue(page),
    routeWebSocket: vi.fn().mockResolvedValue(undefined),
    newCDPSession: vi.fn().mockResolvedValue(cdp), close: vi.fn().mockResolvedValue(undefined),
  });
  const browser = { newContext: vi.fn().mockResolvedValue(context) };
  const release = vi.fn();
  return { browser, context, page, frame, cdp, release };
}
interface Client {
  ws: WebSocket;
  messages: LiveBrowserServerMessage[];
  frames: Buffer[];
  wait: (predicate: (item: LiveBrowserServerMessage) => boolean) => Promise<LiveBrowserServerMessage>;
  send: (message: LiveBrowserClientMessage) => void;
}
function client(url: string, origin: string | null = "http://localhost:5174"): Promise<Client> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, origin ? { origin } : {});
    const messages: LiveBrowserServerMessage[] = [], frames: Buffer[] = [];
    ws.on("message", (data: RawData, binary) => {
      if (binary) frames.push(Buffer.from(data as Buffer)); else messages.push(JSON.parse(data.toString()));
    });
    ws.on("error", reject);
    ws.on("open", () => resolve({ ws, messages, frames,
      wait: predicate => waitFor(() => messages.find(predicate)), send: message => ws.send(JSON.stringify(message)),
    }));
  });
}
async function waitFor<T>(check: () => T | undefined | false): Promise<T> {
  const until = Date.now() + 2000;
  for (;;) {
    const result = check(); if (result) return result;
    if (Date.now() >= until) throw new Error("Condition did not settle");
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}
const start = { type: "start", query: "weather", width: 402, height: 668 } as const;

describe("bounded anonymous live browser transport", () => {
  let server: Server, url: string;
  let fixture: ReturnType<typeof browserFixture>;
  let transport: ReturnType<typeof attachLiveBrowserServer>;
  let clients: Client[];
  beforeEach(async () => {
    clients = [];
    pool.acquire.mockReset(); pool.close.mockReset();
    fixture = browserFixture();
    pool.acquire.mockResolvedValue({ browser: fixture.browser, release: fixture.release });
    server = createServer((_req, res) => res.end());
    transport = attachLiveBrowserServer(server, { allowedOrigins: ["http://localhost:5174"], idleTimeoutMs: 2000 });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test address");
    url = `ws://127.0.0.1:${address.port}/api/live-browser`;
  });
  afterEach(async () => {
    for (const connection of clients) connection.ws.terminate();
    await transport.close();
    await new Promise<void>(resolve => server.close(() => resolve()));
    vi.restoreAllMocks();
  });
  async function connect() { const connection = await client(url); clients.push(connection); return connection; }
  async function loaded() { const connection = await connect(); connection.send(start); await connection.wait(item => item.type === "ready"); return connection; }

  it("rejects missing and untrusted Origins without reserving or starting Chromium", async () => {
    for (const origin of [null, "http://untrusted.example"]) {
      await expect(client(url, origin)).rejects.toThrow("403");
    }
    expect(pool.acquire).not.toHaveBeenCalled();
    const connection = await loaded(); expect(connection.messages.some(item => item.type === "ready")).toBe(true);
  });

  it("does not report ready before a meaningful, visible, query-matched document", async () => {
    const visible = deferred<void>(); fixture.page.waitForFunction.mockReturnValue(visible.promise);
    const connection = await connect(); connection.send(start);
    await connection.wait(item => item.type === "status" && item.state === "loading");
    expect(connection.messages.some(item => item.type === "ready")).toBe(false);
    expect(fixture.cdp.send).not.toHaveBeenCalledWith("Page.startScreencast", expect.anything());
    expect(fixture.page.waitForFunction).toHaveBeenCalledWith(expect.any(Function), "weather", expect.objectContaining({ polling: 150 }));
    visible.resolve(); await connection.wait(item => item.type === "ready");
    expect(fixture.browser.newContext).toHaveBeenCalledWith(expect.objectContaining({ viewport: { width: 402, height: 668 }, serviceWorkers: "block", acceptDownloads: false }));
    expect(fixture.browser.newContext.mock.calls[0][0]).not.toHaveProperty("storageState");
    expect(fixture.page.addStyleTag).toHaveBeenCalledWith({ content: expect.stringContaining("#sb_form") });
  });

  it.each(["weather", "天气"])("keeps the global English market and request language for query %s", async query => {
    fixture.page.content.mockResolvedValue(`<input id="sb_form_q" value="${query}"><main id="b_content"><ol id="b_results"><li class="b_ans">Current weather information</li></ol></main>`);
    const connection = await connect(); connection.send({ ...start, query });
    await connection.wait(item => item.type === "ready");
    const requested = new URL(fixture.page.goto.mock.calls[0][0]);
    expect(Object.fromEntries(requested.searchParams)).toEqual({ q: query, setlang: "en-US", mkt: "en-US", cc: "US" });
    expect(fixture.browser.newContext).toHaveBeenCalledWith(expect.objectContaining({
      locale: "en-US", extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    }));
  });

  it("keeps the single slot until the old context is closed, then isolates the next session", async () => {
    const first = await loaded();
    const closing = deferred<void>(); fixture.context.close.mockReturnValue(closing.promise);
    first.ws.close(); await waitFor(() => fixture.context.close.mock.calls.length);
    const busy = await connect(); await busy.wait(item => item.type === "error" && item.code === "busy");
    expect(pool.acquire).toHaveBeenCalledTimes(1); expect(fixture.release).not.toHaveBeenCalled();
    closing.resolve(); await waitFor(() => fixture.release.mock.calls.length);
    const previous = fixture; fixture = browserFixture();
    pool.acquire.mockResolvedValue({ browser: fixture.browser, release: fixture.release });
    const second = await loaded();
    previous.cdp.emit("Page.screencastFrame", { sessionId: 99, data: Buffer.from("old-session").toString("base64") });
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(second.frames).toHaveLength(0);
    expect(previous.release).toHaveBeenCalledTimes(1); expect(fixture.browser.newContext).toHaveBeenCalledTimes(1);
  });

  it("streams binary frames and only acknowledges the corresponding client-rendered frame", async () => {
    const connection = await loaded();
    fixture.cdp.emit("Page.screencastFrame", { sessionId: 17, data: Buffer.from("JPEG").toString("base64") });
    await waitFor(() => connection.frames[0]);
    const frame = connection.frames[0];
    expect(frame.readUInt32BE(0)).toBe(LIVE_BROWSER_FRAME_MAGIC); expect(frame.readUInt16BE(8)).toBe(402);
    expect(frame.readUInt16BE(10)).toBe(668); expect(frame.subarray(12).toString()).toBe("JPEG");
    const id = frame.readUInt32BE(4);
    connection.send({ type: "ack", id: id + 1 });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(fixture.cdp.send).not.toHaveBeenCalledWith("Page.screencastFrameAck", { sessionId: 17 });
    connection.send({ type: "ack", id });
    await waitFor(() => fixture.cdp.send.mock.calls.find(args => args[0] === "Page.screencastFrameAck" && args[1].sessionId === 17));
  });

  it("intercepts external and subsequent Bing document navigations instead of loading them", async () => {
    const connection = await loaded();
    const intercept = fixture.context.route.mock.calls[0][1] as (route: unknown) => Promise<void>;
    const request = (value: string, navigation = true) => ({
      url: () => value, isNavigationRequest: () => navigation, resourceType: () => navigation ? "document" : "image",
      frame: () => ({ page: () => ({ mainFrame: () => fixture.frame }) }), redirectedFrom: () => null,
    });
    // Use this exact page/frame identity for top-level documents.
    const topFrame = { page: () => fixture.page }; fixture.page.mainFrame.mockReturnValue(topFrame);
    const route = (value: string, navigation = true) => {
      const req = request(value, navigation); req.frame = () => topFrame as never;
      return { request: () => req, abort: vi.fn().mockResolvedValue(undefined), continue: vi.fn().mockResolvedValue(undefined) };
    };
    const external = route("https://example.com/article"); await intercept(external);
    await connection.wait(item => item.type === "navigate" && item.url === "https://example.com/article");
    expect(external.abort).toHaveBeenCalled(); expect(external.continue).not.toHaveBeenCalled();
    const bing = route("https://www.bing.com/search?q=forecast"); await intercept(bing);
    await connection.wait(item => item.type === "navigate" && item.url.includes("q=forecast"));
    expect(bing.abort).toHaveBeenCalled();
    const evilResource = route("https://bing.com.attacker.example/track", false); await intercept(evilResource);
    expect(evilResource.abort).toHaveBeenCalled();
    const officialResource = route("https://th.bing.com/image.jpg", false); await intercept(officialResource);
    expect(officialResource.continue).toHaveBeenCalled();
  });

  it("releases a late lease after disconnection without creating an orphan context", async () => {
    const lease = deferred<{ browser: typeof fixture.browser; release: typeof fixture.release }>();
    pool.acquire.mockReturnValue(lease.promise);
    const connection = await connect(); connection.send(start); await waitFor(() => pool.acquire.mock.calls.length);
    connection.ws.close(); await new Promise(resolve => setTimeout(resolve, 15));
    lease.resolve({ browser: fixture.browser, release: fixture.release });
    await waitFor(() => fixture.release.mock.calls.length);
    expect(fixture.browser.newContext).not.toHaveBeenCalled(); expect(fixture.release).toHaveBeenCalledTimes(1);
  });

  it("closes a context created after disconnection before releasing its lease", async () => {
    const creating = deferred<typeof fixture.context>(); fixture.browser.newContext.mockReturnValue(creating.promise);
    const connection = await connect(); connection.send(start); await waitFor(() => fixture.browser.newContext.mock.calls.length);
    connection.ws.close(); await new Promise(resolve => setTimeout(resolve, 10));
    expect(fixture.release).not.toHaveBeenCalled();
    creating.resolve(fixture.context); await waitFor(() => fixture.release.mock.calls.length);
    expect(fixture.context.close).toHaveBeenCalled(); expect(fixture.context.newPage).not.toHaveBeenCalled();
  });

  it("rejects oversized viewports and repeated starts without starting a second context", async () => {
    const connection = await connect(); connection.send({ ...start, height: 5000 });
    await connection.wait(item => item.type === "error" && item.code === "invalid-message");
    expect(pool.acquire).not.toHaveBeenCalled();
    await waitFor(() => connection.ws.readyState === WebSocket.CLOSED);
    const another = await loaded(); another.send(start);
    await another.wait(item => item.type === "error" && item.code === "invalid-message");
    expect(fixture.browser.newContext).toHaveBeenCalledTimes(1);
  });

  it("does not let frame ACKs keep an otherwise inactive browser alive", async () => {
    await transport.close();
    transport = attachLiveBrowserServer(server, { allowedOrigins: ["http://localhost:5174"], idleTimeoutMs: 60 });
    const connection = await loaded();
    const ack = setInterval(() => { if (connection.ws.readyState === WebSocket.OPEN) connection.send({ type: "ack", id: 0 }); }, 10);
    try { await connection.wait(item => item.type === "error" && item.code === "inactive"); }
    finally { clearInterval(ack); }
    await waitFor(() => fixture.release.mock.calls.length);
  });

  it("bounds input values, supports IME text and returns correlated Find results", async () => {
    const connection = await loaded();
    connection.send({ type: "touch", phase: "start", x: -40, y: 1200 });
    connection.send({ type: "touch", phase: "end", x: -40, y: 1200 });
    connection.send({ type: "wheel", x: 900, y: -2, deltaX: 10000, deltaY: -10000 });
    connection.send({ type: "text", value: "天气 today" });
    connection.send({ type: "key", key: "Backspace" });
    connection.send({ type: "find", query: "weather", index: 1, requestId: 7 });
    const result = await connection.wait(item => item.type === "find-result");
    expect(result).toEqual({ type: "find-result", query: "weather", total: 3, index: 1, requestId: 7 });
    expect(fixture.cdp.send).toHaveBeenCalledWith("Input.dispatchTouchEvent", expect.objectContaining({ touchPoints: [expect.objectContaining({ x: 0, y: 667 })] }));
    expect(fixture.cdp.send).toHaveBeenCalledWith("Input.dispatchMouseEvent", expect.objectContaining({ x: 401, y: 0, deltaX: 800, deltaY: -800 }));
    expect(fixture.page.keyboard.insertText).toHaveBeenCalledWith("天气 today"); expect(fixture.page.keyboard.press).toHaveBeenCalledWith("Backspace");
  });

  it("eventually flushes the newest update after ACK even when no further frame arrives", async () => {
    const connection = await loaded();
    const emit = (sessionId: number, content: string) => fixture.cdp.emit("Page.screencastFrame", { sessionId, data: Buffer.from(content).toString("base64") });
    emit(1, "first"); await waitFor(() => connection.frames[0]);
    emit(2, "intermediate"); emit(3, "final");
    await new Promise(resolve => setTimeout(resolve, 10)); expect(connection.frames).toHaveLength(1);
    connection.send({ type: "ack", id: connection.frames[0].readUInt32BE(4) });
    await waitFor(() => connection.frames[1]);
    expect(connection.frames[1].subarray(12).toString()).toBe("final");
    expect(connection.frames).toHaveLength(2);
  });

  it("pauses without losing the document, blocks inactive input, and resumes with a fresh stream", async () => {
    const connection = await loaded();
    connection.send({ type: "pause", paused: true });
    await waitFor(() => fixture.cdp.send.mock.calls.find(args => args[0] === "Page.stopScreencast"));
    connection.send({ type: "text", value: "ignored while paused" });
    fixture.cdp.emit("Page.screencastFrame", { sessionId: 1, data: Buffer.from("paused").toString("base64") });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(connection.frames).toHaveLength(0); expect(fixture.page.keyboard.insertText).not.toHaveBeenCalled();
    expect(fixture.context.close).not.toHaveBeenCalled(); expect(fixture.release).not.toHaveBeenCalled();
    connection.send({ type: "pause", paused: false });
    await waitFor(() => fixture.cdp.send.mock.calls.filter(args => args[0] === "Page.startScreencast").length === 2);
    expect(fixture.page.goto).toHaveBeenCalledTimes(1); expect(connection.messages.filter(item => item.type === "ready")).toHaveLength(1);
  });

  it("closes the socket for end only after context disposal and lease release", async () => {
    const connection = await loaded(); const closing = deferred<void>();
    fixture.context.close.mockReturnValue(closing.promise);
    connection.send({ type: "end" }); await waitFor(() => fixture.context.close.mock.calls.length);
    expect(connection.ws.readyState).toBe(WebSocket.OPEN); expect(fixture.release).not.toHaveBeenCalled();
    closing.resolve(); await waitFor(() => connection.ws.readyState === WebSocket.CLOSED);
    expect(fixture.release).toHaveBeenCalledTimes(1);
  });

  it("coalesces resize work, reapplies Find, and emits the new viewport dimensions", async () => {
    const connection = await loaded();
    connection.send({ type: "find", query: "weather", index: -1, requestId: 9 });
    await connection.wait(item => item.type === "find-result");
    const resizing = deferred<void>(); fixture.page.setViewportSize.mockReturnValueOnce(resizing.promise);
    connection.send({ type: "resize", width: 402, height: 600 });
    await waitFor(() => fixture.page.setViewportSize.mock.calls.length);
    connection.send({ type: "resize", width: 402, height: 500 });
    connection.send({ type: "resize", width: 402, height: 400 });
    await new Promise(resolve => setTimeout(resolve, 10)); resizing.resolve();
    await waitFor(() => fixture.cdp.send.mock.calls.filter(args => args[0] === "Page.startScreencast").length === 2);
    expect(fixture.page.setViewportSize.mock.calls.map(args => args[0])).toEqual([{ width: 402, height: 600 }, { width: 402, height: 400 }]);
    expect(fixture.page.evaluate.mock.calls.at(-1)?.[1]).toEqual({ query: "weather", requestedIndex: -1 });
    fixture.cdp.emit("Page.screencastFrame", { sessionId: 8, data: Buffer.from("resized").toString("base64") });
    await waitFor(() => connection.frames[0]); expect(connection.frames[0].readUInt16BE(10)).toBe(400);
  });

  it("fails readiness honestly, without publishing hidden results or provider error details", async () => {
    fixture.page.waitForFunction.mockRejectedValue(new Error("private query cookie provider URL"));
    const connection = await connect(); connection.send(start);
    await connection.wait(item => item.type === "error" && item.code === "unavailable");
    await waitFor(() => fixture.release.mock.calls.length);
    expect(connection.messages.some(item => item.type === "ready")).toBe(false);
    expect(JSON.stringify(connection.messages)).not.toContain("private query");
    expect(fixture.cdp.send).not.toHaveBeenCalledWith("Page.startScreencast", expect.anything());
  });

  it("bounds message floods and expires connections that never initialize", async () => {
    const connection = await connect();
    for (let i = 0; i < 250; i++) connection.send({ type: "ack", id: 0 });
    await connection.wait(item => item.type === "error" && item.code === "rate-limit");
    await transport.close();
    transport = attachLiveBrowserServer(server, { allowedOrigins: ["http://localhost:5174"], initialMessageTimeoutMs: 40 });
    const uninitialized = await connect();
    await uninitialized.wait(item => item.type === "error" && item.code === "invalid-message");
    expect(pool.acquire).not.toHaveBeenCalled();
  });

  it("blocks real WebSocket channels through the dedicated browser route", async () => {
    await loaded();
    const socket = { close: vi.fn() };
    fixture.context.routeWebSocket.mock.calls[0][1](socket);
    expect(fixture.context.routeWebSocket.mock.calls[0][0]).toBe("**/*"); expect(socket.close).toHaveBeenCalled();
  });

  it("does not start frames from pause/resume or resize while ready metadata is still pending", async () => {
    const title = deferred<string>(); fixture.page.title.mockReturnValue(title.promise);
    const connection = await connect(); connection.send(start);
    await waitFor(() => fixture.page.title.mock.calls.length);
    connection.send({ type: "pause", paused: false }); connection.send({ type: "resize", width: 402, height: 500 });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(fixture.cdp.send).not.toHaveBeenCalledWith("Page.startScreencast", expect.anything());
    expect(fixture.page.setViewportSize).not.toHaveBeenCalled();
    title.resolve("Weather - Bing"); await connection.wait(item => item.type === "ready");
    await waitFor(() => fixture.page.setViewportSize.mock.calls.length);
  });

  it("rejects echoed queries with unrelated actual rows and bounds the captured document", async () => {
    fixture.page.content.mockResolvedValue('<input id="sb_form_q" value="weather"><ol id="b_results"><li class="b_algo"><h2>Unrelated Telegram and WhatsApp forums</h2><p>No relevant information here.</p></li></ol>');
    const connection = await connect(); connection.send(start);
    await connection.wait(item => item.type === "error" && item.code === "unavailable");
    expect(connection.messages.some(item => item.type === "ready")).toBe(false);
    await waitFor(() => fixture.release.mock.calls.length);
    fixture.page.content.mockResolvedValue("x".repeat(4 * 1024 * 1024 + 1));
    const oversized = await connect(); oversized.send(start);
    await oversized.wait(item => item.type === "error" && item.code === "unavailable");
    expect(oversized.messages.some(item => item.type === "ready")).toBe(false);
  });

  it("pause cancels an active gesture and invalidates queued input across a quick resume", async () => {
    const connection = await loaded();
    const blocked = deferred<void>();
    fixture.cdp.send.mockImplementation((method, parameters) => method === "Input.dispatchTouchEvent" && parameters.type === "touchStart" ? blocked.promise : Promise.resolve());
    connection.send({ type: "touch", phase: "start", x: 100, y: 100 });
    await waitFor(() => fixture.cdp.send.mock.calls.find(args => args[0] === "Input.dispatchTouchEvent" && args[1].type === "touchStart"));
    connection.send({ type: "text", value: "stale queued text" });
    connection.send({ type: "pause", paused: true }); connection.send({ type: "pause", paused: false });
    await new Promise(resolve => setTimeout(resolve, 10)); blocked.resolve();
    await waitFor(() => fixture.cdp.send.mock.calls.find(args => args[0] === "Input.dispatchTouchEvent" && args[1].type === "touchCancel"));
    expect(fixture.page.keyboard.insertText).not.toHaveBeenCalled();
    connection.send({ type: "touch", phase: "move", x: 120, y: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(fixture.cdp.send.mock.calls.filter(args => args[0] === "Input.dispatchTouchEvent" && args[1].type === "touchMove")).toHaveLength(0);
  });
});
