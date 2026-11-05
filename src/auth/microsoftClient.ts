import type { AccountInfo, IPublicClientApplication } from "@azure/msal-browser";
import type { ProfileAccount } from "../screens/Profile/Profile.data";
import { microsoftConfig } from "./microsoftConfig";

let clientPromise: Promise<IPublicClientApplication> | undefined;

/** Share one initialized MSAL instance, including React StrictMode's effect replay. */
export function getMicrosoftClient(): Promise<IPublicClientApplication> {
  return clientPromise ??= import("@azure/msal-browser").then(async ({ PublicClientApplication }) => {
    const client = new PublicClientApplication(microsoftConfig());
    await client.initialize();
    return client;
  }).catch(error => { clientPromise = undefined; throw error; });
}

export function microsoftIdentity(account: AccountInfo): ProfileAccount {
  return { name: account.name?.trim() || account.username, email: account.username };
}

function profileText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Graph is optional enrichment. A missing photo/profile never substitutes a demo identity. */
export async function fetchMicrosoftProfile(accessToken: string, identity: AccountInfo, signal: AbortSignal) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [user, photo] = await Promise.allSettled([
    fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName", { headers, signal })
      .then(async response => response.ok ? response.json() as Promise<Record<string, unknown>> : null),
    fetch("https://graph.microsoft.com/v1.0/me/photo/$value", { headers, signal })
      .then(async response => {
        if (!response.ok || !/^image\/(jpeg|png|webp|gif)(;|$)/i.test(response.headers.get("Content-Type") || "")) return null;
        const blob = await response.blob();
        return blob.size > 0 && blob.size <= 2 * 1024 * 1024 ? blob : null;
      }),
  ]);
  const info = user.status === "fulfilled" ? user.value : null;
  const account: ProfileAccount = {
    ...microsoftIdentity(identity),
    name: profileText(info?.displayName) || identity.name || identity.username,
    email: profileText(info?.mail) || identity.username || profileText(info?.userPrincipalName),
  };
  return { account, photo: photo.status === "fulfilled" ? photo.value : null };
}

/** Show useful recovery instructions without logging tokens, URLs or raw identity payloads. */
export function microsoftSignInError(error: unknown): string | null {
  const code = error && typeof error === "object" && "errorCode" in error ? String(error.errorCode) : "";
  if (code === "user_cancelled") return null;
  if (["popup_window_error", "empty_window_error"].includes(code)) return "Allow pop-ups for this site, then try signing in again.";
  if (code === "interaction_in_progress") return "A Microsoft sign-in window is already open. Complete or close it first.";
  if (code === "access_denied") return "Sign-in was not authorized. You can try again when ready.";
  if (["redirect_uri_mismatch", "invalid_client", "unauthorized_client"].includes(code)
    || (error instanceof Error && /AADSTS50011/.test(error.message))) {
    return "Check the app registration: use a personal Microsoft account and register this site's /redirect.html as a SPA redirect URI.";
  }
  return "Microsoft sign-in couldn't complete. Check your connection and try again.";
}
