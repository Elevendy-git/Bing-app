// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { isPublicAddress, publicWebUrl, resolvePublicAddress } from "./webPageFetch";
import type { lookup } from "node:dns/promises";

describe("Public website fetch boundary", () => {
  it.each(["127.0.0.1", "10.0.0.1", "169.254.169.254", "172.16.2.3", "192.168.1.1", "100.64.0.1", "0.0.0.0", "198.18.0.1", "224.0.0.1", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1", "2001:db8::1", "2002:7f00:1::1"])("rejects nonpublic addresses: %s", address => {
    expect(isPublicAddress(address)).toBe(false);
  });
  it.each(["https://localhost/", "https://127.1/", "http://2130706433/", "http://[::1]/", "http://[::ffff:127.0.0.1]/", "file:///etc/passwd", "javascript:alert(1)", "https://user:pass@example.com/", "https://example.com:8080/", "https://metadata.internal/"])("rejects unsupported destinations: %s", url => {
    expect(() => publicWebUrl(url)).toThrow();
  });
  it("allows only public DNS answers and returns a validated address to pin the connection", async () => {
    const resolver = vi.fn().mockResolvedValueOnce([{ address: "2606:4700::1111", family: 6 }, { address: "1.1.1.1", family: 4 }])
      .mockResolvedValueOnce([{ address: "1.1.1.1", family: 4 }, { address: "10.0.0.1", family: 4 }]).mockResolvedValueOnce([]);
    const url = publicWebUrl("https://example.com/page");
    expect(await resolvePublicAddress(url, resolver as unknown as typeof lookup)).toEqual({ address: "1.1.1.1", family: 4 });
    await expect(resolvePublicAddress(url, resolver as unknown as typeof lookup)).rejects.toThrow();
    await expect(resolvePublicAddress(url, resolver as unknown as typeof lookup)).rejects.toThrow();
    expect(resolver).toHaveBeenCalledWith("example.com", { all: true, verbatim: true });
  });
});
