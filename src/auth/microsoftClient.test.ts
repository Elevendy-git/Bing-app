import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountInfo } from "@azure/msal-browser";
import { fetchMicrosoftProfile, microsoftSignInError } from "./microsoftClient";
import { canonicalMicrosoftOrigin, microsoftConfig } from "./microsoftConfig";

const identity = { username: "person@outlook.com", name: "Person" } as AccountInfo;
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("Microsoft SPA configuration and optional Graph profile", () => {
  it("uses the dedicated Pages callback and does not route sign-in through the data backend", () => {
    vi.spyOn(document, "baseURI", "get").mockReturnValue("https://elevendy-git.github.io/Bing-app/?view=prototype");
    vi.stubEnv("VITE_API_BASE_URL", "https://bing-backend.onrender.com");
    const config = microsoftConfig();
    expect(config.auth.redirectUri).toBe("https://elevendy-git.github.io/Bing-app/redirect.html");
    expect(config.auth.authority).toBe("https://login.microsoftonline.com/consumers");
    expect(canonicalMicrosoftOrigin("https://elevendy-git.github.io/Bing-app/")).toBeNull();
  });

  it("uses personal accounts, the dedicated same-origin bridge and session-scoped MSAL cache", () => {
    const config = microsoftConfig();
    expect(config.auth.clientId).toBe("ec6fea2d-15f4-44ec-8954-5b49d94a2e2e");
    expect(config.auth.authority).toBe("https://login.microsoftonline.com/consumers");
    expect(new URL(String(config.auth.redirectUri)).origin).toBe(window.location.origin);
    expect(config.auth.redirectUri).toMatch(/\/redirect.html$/);
    expect(config.cache?.cacheLocation).toBe("sessionStorage");
    expect(canonicalMicrosoftOrigin("http://127.0.0.1:5174/?view=prototype")).toBe("http://localhost:5174/?view=prototype");
    expect(canonicalMicrosoftOrigin("http://localhost:5174/")).toBeNull();
    expect(canonicalMicrosoftOrigin("https://preview.example.com/app/")).toBeNull();
  });

  it("uses real Graph name/email and photo, sending the token only to Microsoft Graph", async () => {
    const fetcher = vi.fn(async (url: string) => url.endsWith("/$value")
      ? new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/jpeg" } })
      : new Response(JSON.stringify({ displayName: "Real Name", mail: "real@outlook.com" })));
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal;
    const result = await fetchMicrosoftProfile("test-token", identity, signal);
    expect(result.account).toEqual({ name: "Real Name", email: "real@outlook.com" });
    expect(result.photo?.type).toBe("image/jpeg");
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [url, options] of fetcher.mock.calls as unknown as [string, RequestInit][]) {
      expect(new URL(url).origin).toBe("https://graph.microsoft.com");
      expect(url).not.toContain("test-token");
      expect(options).toEqual({ headers: { Authorization: "Bearer test-token" }, signal });
    }
  });

  it("falls back to verified identity and initials when Graph fails or photo is missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/$value")
      ? new Response(null, { status: 404 }) : Promise.reject(new Error("Offline"))));
    expect(await fetchMicrosoftProfile("test-token", identity, new AbortController().signal))
      .toEqual({ account: { name: "Person", email: "person@outlook.com" }, photo: null });
  });

  it("does not render a non-image Graph response as an avatar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { headers: { "Content-Type": "application/json" } })));
    expect((await fetchMicrosoftProfile("test-token", identity, new AbortController().signal)).photo).toBeNull();
  });

  it("maps registration failures without exposing raw provider errors or auth payloads", () => {
    const error = new Error("AADSTS50011: private auth request details");
    expect(microsoftSignInError(error)).toContain("/redirect.html");
    expect(microsoftSignInError(error)).not.toContain("private auth request details");
    expect(microsoftSignInError({ errorCode: "user_cancelled" })).toBeNull();
  });
});
