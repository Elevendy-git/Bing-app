import { afterEach, describe, expect, it, vi } from "vitest";
import { copyBrowserLink, openBrowserLink, shareBrowserLink } from "./browserActions";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const pageUrl = "https://example.com/articles/mobile?q=real%20results&lang=en#section-two";

describe("Browser URL actions", () => {
  it("copies the actual document URL with its query and fragment", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await copyBrowserLink(pageUrl);
    expect(writeText).toHaveBeenCalledExactlyOnceWith(pageUrl);
  });

  it("opens only valid web URLs in a separate browser without an opener or referrer", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    openBrowserLink(pageUrl);
    openBrowserLink("javascript:alert(1)");
    openBrowserLink("https://user:password@example.com/");
    expect(open).toHaveBeenCalledExactlyOnceWith(pageUrl, "_blank", "noopener,noreferrer");
  });

  it("uses native sharing with the actual URL and loaded page title", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });
    await expect(shareBrowserLink(pageUrl, "Loaded article title")).resolves.toBe("shared");
    expect(share).toHaveBeenCalledExactlyOnceWith({ url: pageUrl, title: "Loaded article title" });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the URL when native sharing is unavailable and reports the copy fallback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(shareBrowserLink(pageUrl)).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledExactlyOnceWith(pageUrl);
  });

  it("preserves native share cancellation without copying anything", async () => {
    const cancellation = new DOMException("User cancelled", "AbortError");
    const share = vi.fn().mockRejectedValue(cancellation);
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });
    await expect(shareBrowserLink(pageUrl)).rejects.toBe(cancellation);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("rejects invalid URLs before invoking a browser API", async () => {
    const share = vi.fn();
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });
    await expect(copyBrowserLink("data:text/html,private")).rejects.toThrow();
    await expect(shareBrowserLink("javascript:alert(1)")).rejects.toThrow();
    expect(share).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("propagates unavailable clipboard and failed copy instead of reporting success", async () => {
    vi.stubGlobal("navigator", {});
    await expect(copyBrowserLink(pageUrl)).rejects.toThrow("Clipboard unavailable");
    await expect(shareBrowserLink(pageUrl)).rejects.toThrow("Clipboard unavailable");
    const failure = new Error("Permission denied");
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(failure) } });
    await expect(copyBrowserLink(pageUrl)).rejects.toBe(failure);
  });
});
