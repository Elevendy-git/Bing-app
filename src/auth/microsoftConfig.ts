import type { Configuration } from "@azure/msal-browser";

/** Public SPA identifier, never a client secret. This registration accepts personal accounts. */
export const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID?.trim()
  || "ec6fea2d-15f4-44ec-8954-5b49d94a2e2e";
export const MICROSOFT_AUTHORITY = "https://login.microsoftonline.com/consumers";
export const MICROSOFT_SCOPES = ["User.Read"];

/** The portal's HTTP development redirect uses localhost; the bridge must share its origin. */
export function canonicalMicrosoftOrigin(href: string): string | null {
  const url = new URL(href);
  if (url.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(url.hostname)) return null;
  url.hostname = "localhost";
  return url.href;
}

export function microsoftConfig(): Configuration {
  const redirectUri = new URL("redirect.html", document.baseURI).href;
  return {
    auth: { clientId: MICROSOFT_CLIENT_ID, authority: MICROSOFT_AUTHORITY, redirectUri },
    cache: { cacheLocation: "sessionStorage" },
    // App timeout (not a system constant): leave time for passwordless sign-in and MFA.
    system: { popupBridgeTimeout: 5 * 60 * 1000 },
  };
}
