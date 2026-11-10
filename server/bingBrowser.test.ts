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
    evaluate: vi.fn().mockResolvedValue(undefined),
    content: vi.fn().mockResolvedValue('<main id="b_content"><ol id="b_results"><li>Weather card</li></ol></main>'),
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
    vi.useRealTimers();
  });

  const options = () => ({ signal: new AbortController().signal, locale: "en-US" });

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
      "https://www.bing.com/search?q=weather+Seattle&setlang=en", expect.any(Object));
    for (const context of contexts) expect(context.close).toHaveBeenCalledTimes(1);
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

  it("cancels a queued request without consuming or leaking the renderer slot", async () => {
    const loading = deferred<{ ok: () => boolean }>();
    const started = deferred<void>();
    const firstContext = resultContext();
    firstContext.page.goto.mockImplementation(() => { started.resolve(); return loading.promise; });
    browser.newContext.mockResolvedValueOnce(firstContext);
    const first = renderer.renderBingSearch("weather", options());
    await started.promise;
    const cancelled = new AbortController();
    const second = renderer.renderBingSearch("discarded", { signal: cancelled.signal, locale: "en-US" });
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
    const first = renderer.renderBingSearch("weather", { signal: cancelled.signal, locale: "en-US" });
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

  it("can launch again after Chromium fails to start", async () => {
    playwright.launch.mockRejectedValueOnce(new Error("Browser unavailable"));
    await expect(renderer.renderBingSearch("weather", options())).rejects.toThrow("Browser unavailable");
    await expect(renderer.renderBingSearch("next", options())).resolves.toContain("Weather card");
    expect(playwright.launch).toHaveBeenCalledTimes(2);
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
