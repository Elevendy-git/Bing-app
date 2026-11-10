// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const playwright = vi.hoisted(() => ({ launch: vi.fn() }));
vi.mock("playwright", () => ({ chromium: { launch: playwright.launch } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function resultContext() {
  const page = {
    on: vi.fn(),
    goto: vi.fn().mockResolvedValue({ ok: () => true }),
    url: vi.fn().mockReturnValue("https://www.bing.com/search?q=weather"),
    locator: vi.fn().mockReturnValue({ waitFor: vi.fn().mockResolvedValue(undefined) }),
    evaluate: vi.fn().mockResolvedValue('<main id="b_content"><ol id="b_results"><li>Weather card</li></ol></main>'),
  };
  return {
    page,
    route: vi.fn().mockResolvedValue(undefined),
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe("anonymous Bing browser renderer", () => {
  let renderer: typeof import("./bingBrowser");
  let contexts: ReturnType<typeof resultContext>[];
  let browser: { newContext: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; isConnected: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.resetModules();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    playwright.launch.mockReset();
    contexts = [];
    browser = {
      newContext: vi.fn().mockImplementation(async () => {
        const context = resultContext();
        contexts.push(context);
        return context;
      }),
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
    };
    playwright.launch.mockResolvedValue(browser);
    renderer = await import("./bingBrowser");
  });

  afterEach(async () => {
    await renderer.closeBingBrowser();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const options = () => ({ signal: new AbortController().signal });

  it("reuses Chromium while giving each result an isolated mobile context", async () => {
    const first = await renderer.renderBingSearch("weather", options());
    const second = await renderer.renderBingSearch("weather Seattle", options());
    expect(first).toContain("Weather card");
    expect(second).toContain("Weather card");
    expect(playwright.launch).toHaveBeenCalledTimes(1);
    expect(contexts).toHaveLength(2);
    expect(browser.newContext).toHaveBeenCalledWith(expect.objectContaining({
      viewport: { width: 402, height: 874 }, locale: "en-US", isMobile: true,
      serviceWorkers: "block", acceptDownloads: false,
    }));
    expect(contexts[1].page.goto).toHaveBeenCalledWith(
      "https://www.bing.com/search?q=weather+Seattle&setlang=en-US&mkt=en-US&cc=US", expect.any(Object));
    for (const context of contexts) expect(context.close).toHaveBeenCalledTimes(1);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("serializes rendering so a second request never opens a concurrent page", async () => {
    const loading = deferred<{ ok: () => boolean }>();
    const started = deferred<void>();
    const firstContext = resultContext();
    firstContext.page.goto.mockImplementation(() => { started.resolve(); return loading.promise; });
    browser.newContext.mockResolvedValueOnce(firstContext);
    const first = renderer.renderBingSearch("weather", options());
    await started.promise;
    const second = renderer.renderBingSearch("news", options());
    await Promise.resolve();
    expect(browser.newContext).toHaveBeenCalledTimes(1);
    loading.resolve({ ok: () => true });
    await Promise.all([first, second]);
    expect(firstContext.close).toHaveBeenCalledTimes(1);
    expect(browser.newContext).toHaveBeenCalledTimes(2);
  });

  it("keeps snapshots queued behind a live browser lease and cancels abandoned lease waits", async () => {
    const live = await renderer.acquireBingBrowser(options().signal);
    expect(live.browser).toBe(browser);
    const pending = renderer.renderBingSearch("weather", options());
    const cancelled = new AbortController();
    const waiting = renderer.acquireBingBrowser(cancelled.signal);
    cancelled.abort();
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
    expect(browser.newContext).not.toHaveBeenCalled();
    live.release();
    await expect(pending).resolves.toContain("Weather card");
    expect(browser.newContext).toHaveBeenCalledOnce();
    // Repeated cleanup cannot release a lease owned by a newer consumer.
    live.release();
    const next = await renderer.acquireBingBrowser(options().signal);
    next.release();
  });

  it("cancels a queued request without consuming or leaking the renderer slot", async () => {
    const loading = deferred<{ ok: () => boolean }>();
    const started = deferred<void>();
    const firstContext = resultContext();
    firstContext.page.goto.mockImplementation(() => { started.resolve(); return loading.promise; });
    browser.newContext.mockResolvedValueOnce(firstContext);
    const first = renderer.renderBingSearch("weather", options());
    await started.promise;
    const cancelled = new AbortController();
    const second = renderer.renderBingSearch("discarded", { signal: cancelled.signal });
    cancelled.abort();
    await expect(second).rejects.toMatchObject({ name: "AbortError" });
    expect(browser.newContext).toHaveBeenCalledTimes(1);
    loading.resolve({ ok: () => true });
    await first;
    await renderer.renderBingSearch("next", options());
    expect(browser.newContext).toHaveBeenCalledTimes(2);
  });

  it("closes a cancelled active context and lets the next search proceed", async () => {
    const started = deferred<void>();
    const firstContext = resultContext();
    firstContext.page.goto.mockImplementation(() => { started.resolve(); return new Promise(() => undefined); });
    browser.newContext.mockResolvedValueOnce(firstContext);
    const cancelled = new AbortController();
    const first = renderer.renderBingSearch("weather", { signal: cancelled.signal });
    await started.promise;
    cancelled.abort();
    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    expect(firstContext.close).toHaveBeenCalledTimes(1);
    await expect(renderer.renderBingSearch("next", options())).resolves.toContain("Weather card");
  });

  it("includes queueing in the deadline instead of starting stale searches", async () => {
    vi.useFakeTimers();
    const loading = deferred<{ ok: () => boolean }>();
    const started = deferred<void>();
    const firstContext = resultContext();
    firstContext.page.goto.mockImplementation(() => { started.resolve(); return loading.promise; });
    browser.newContext.mockResolvedValueOnce(firstContext);
    const first = renderer.renderBingSearch("weather", options());
    await started.promise;
    const queued = renderer.renderBingSearch("stale", { ...options(), timeoutMs: 30 });
    const failure = expect(queued).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(31);
    await failure;
    expect(console.warn).toHaveBeenCalledExactlyOnceWith("Bing browser rendering failed", {
      phase: "launch", rejectedResourceHosts: [], pageErrorCount: 0, deadline: true,
    });
    expect(browser.newContext).toHaveBeenCalledTimes(1);
    loading.resolve({ ok: () => true });
    await first;
  });

  it("cleans up a navigation failure and releases the slot", async () => {
    const failed = resultContext();
    failed.page.goto.mockRejectedValue(new Error("Upstream connection failed"));
    browser.newContext.mockResolvedValueOnce(failed);
    await expect(renderer.renderBingSearch("weather", options())).rejects.toThrow("Upstream connection failed");
    expect(failed.close).toHaveBeenCalledTimes(1);
    await expect(renderer.renderBingSearch("next", options())).resolves.toContain("Weather card");
  });

  it("waits again when hydration hides the result container after its first visible state", async () => {
    const context = resultContext();
    const content = { isConnected: true, getClientRects: () => [{ width: 402, height: 800 }], parentElement: null, style: { visibility: "hidden" } };
    const results = { isConnected: true, getClientRects: () => [{ width: 402, height: 800 }], parentElement: content, children: [{}], style: {} };
    const snapshot = '<html><body><main id="b_content"><ol id="b_results"><li>Fresh weather card</li></ol></main></body></html>';
    vi.stubGlobal("document", {
      querySelector: (selector: string) => selector === "#b_content" ? content : results,
      doctype: null, documentElement: { outerHTML: snapshot },
    });
    vi.stubGlobal("getComputedStyle", (element: typeof content) => element.style);
    context.page.evaluate
      .mockImplementationOnce(async () => undefined)
      .mockImplementationOnce(async (capture: () => string | null) => capture())
      .mockImplementationOnce(async () => { content.style.visibility = "visible"; })
      .mockImplementationOnce(async (capture: () => string | null) => capture());
    browser.newContext.mockResolvedValueOnce(context);
    await expect(renderer.renderBingSearch("weather", options())).resolves.toContain("Fresh weather card");
    expect(context.page.locator).toHaveBeenCalledWith("#b_content");
    expect(context.page.evaluate).toHaveBeenCalledTimes(4);
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it("does not return hidden transition content when the page never becomes visible again", async () => {
    const context = resultContext();
    const waitFor = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error("Visible results timed out"));
    context.page.locator.mockReturnValue({ waitFor });
    context.page.evaluate.mockResolvedValueOnce(undefined).mockResolvedValueOnce(null);
    browser.newContext.mockResolvedValueOnce(context);
    await expect(renderer.renderBingSearch("weather", options())).rejects.toThrow("Visible results timed out");
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it("can launch again after Chromium fails to start", async () => {
    playwright.launch.mockRejectedValueOnce(new Error("Browser unavailable"));
    await expect(renderer.renderBingSearch("weather", options())).rejects.toThrow("Browser unavailable");
    await expect(renderer.renderBingSearch("next", options())).resolves.toContain("Weather card");
    expect(playwright.launch).toHaveBeenCalledTimes(2);
  });

  it("logs one failure diagnostic containing only phase, unique hostnames, page error count and deadline state", async () => {
    const context = resultContext();
    const loading = deferred<never>();
    const started = deferred<void>();
    context.page.goto.mockImplementation(() => { started.resolve(); return loading.promise; });
    browser.newContext.mockResolvedValueOnce(context);
    const result = renderer.renderBingSearch("a private query", options());
    await started.promise;
    const route = context.route.mock.calls[0][1] as (route: unknown) => Promise<void>;
    for (const path of ["/first?query=private", "/second?token=private"]) {
      await route({ request: () => ({ url: () => `https://blocked.example${path}`, resourceType: () => "script" }), abort: vi.fn().mockResolvedValue(undefined) });
    }
    const pageError = context.page.on.mock.calls.find(call => call[0] === "pageerror")![1] as () => void;
    pageError();
    pageError();
    loading.reject(new Error("Private upstream URL and response text"));
    await expect(result).rejects.toThrow("Private upstream URL and response text");
    expect(console.warn).toHaveBeenCalledExactlyOnceWith("Bing browser rendering failed", {
      phase: "navigate", rejectedResourceHosts: ["blocked.example"], pageErrorCount: 2, deadline: false,
    });
  });

  it("blocks non-provider and private-address resources during browser execution", async () => {
    await renderer.renderBingSearch("weather", options());
    const route = contexts[0].route.mock.calls[0][1] as (route: unknown) => Promise<void>;
    for (const url of ["http://127.0.0.1/", "https://example.com/", "https://bing.com.attacker.test/", "https://user:pass@www.bing.com/"]) {
      const request = { request: () => ({ url: () => url, resourceType: () => "image" }), abort: vi.fn().mockResolvedValue(undefined), continue: vi.fn().mockResolvedValue(undefined) };
      await route(request);
      expect(request.abort).toHaveBeenCalledTimes(1);
      expect(request.continue).not.toHaveBeenCalled();
    }
    const image = { request: () => ({ url: () => "https://th.bing.com/image.jpg", resourceType: () => "image" }), abort: vi.fn().mockResolvedValue(undefined), continue: vi.fn().mockResolvedValue(undefined) };
    await route(image);
    expect(image.continue).toHaveBeenCalledTimes(1);
  });

  it("releases Chromium after idle time instead of retaining its memory indefinitely", async () => {
    vi.useFakeTimers();
    await renderer.renderBingSearch("weather", options());
    await vi.advanceTimersByTimeAsync(30_001);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });
});
