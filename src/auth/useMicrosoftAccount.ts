import { useCallback, useEffect, useRef, useState } from "react";
import type { AccountInfo, AuthenticationResult, IPublicClientApplication } from "@azure/msal-browser";
import type { ProfileAccount } from "../screens/Profile/Profile.data";
import type { ProfileAuthentication } from "../screens/Profile/Profile";
import { fetchMicrosoftProfile, getMicrosoftClient, microsoftIdentity, microsoftSignInError } from "./microsoftClient";
import { MICROSOFT_SCOPES } from "./microsoftConfig";

/** Identity belongs to the workbench session, independently of prototype activity/reset. */
export function useMicrosoftAccount() {
  const [account, setAccount] = useState<ProfileAccount | null>(null);
  const [pending, setPending] = useState<ProfileAuthentication["pending"]>("initializing");
  const [error, setError] = useState<string | null>(null);
  const [initialization, setInitialization] = useState(0);
  const client = useRef<IPublicClientApplication | null>(null);
  const identity = useRef<AccountInfo | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  const revision = useRef(0);
  const request = useRef<AbortController | null>(null);
  const silentTokenRequest = useRef<Promise<AuthenticationResult> | null>(null);
  const photoUrl = useRef<string | null>(null);

  const releasePhoto = useCallback(() => {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = null;
  }, []);
  const isCurrent = useCallback((ticket: number) => mounted.current && revision.current === ticket, []);
  const enrich = useCallback(async (msal: IPublicClientApplication, user: AccountInfo, ticket: number, token?: string) => {
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    try {
      let accessToken = token;
      if (!accessToken) {
        const renewal = msal.acquireTokenSilent({ account: user, scopes: MICROSOFT_SCOPES });
        silentTokenRequest.current = renewal;
        try { accessToken = (await renewal).accessToken; }
        finally { if (silentTokenRequest.current === renewal) silentTokenRequest.current = null; }
      }
      if (!isCurrent(ticket) || controller.signal.aborted) return;
      const profile = await fetchMicrosoftProfile(accessToken, user, controller.signal);
      if (!isCurrent(ticket) || controller.signal.aborted) return;
      releasePhoto();
      photoUrl.current = profile.photo ? URL.createObjectURL(profile.photo) : null;
      setAccount({ ...profile.account, imageSrc: photoUrl.current || undefined });
    } catch {
      // Token renewal may require consent, or Graph may be unavailable. Keep verified ID-token identity.
      // Never open a popup without a user gesture or turn a missing photo into a failed sign-in.
    }
  }, [isCurrent, releasePhoto]);

  useEffect(() => {
    mounted.current = true;
    const ticket = ++revision.current;
    setPending("initializing");
    setError(null);
    void getMicrosoftClient().then(msal => {
      if (!isCurrent(ticket)) return;
      client.current = msal;
      // Do not silently choose another cached identity after an explicit sign-out.
      const user = msal.getActiveAccount();
      msal.setActiveAccount(user);
      identity.current = user;
      setAccount(user ? microsoftIdentity(user) : null);
      setPending(null);
      if (user) void enrich(msal, user, ticket);
    }).catch(() => {
      if (!isCurrent(ticket)) return;
      setPending(null);
      setError("Microsoft sign-in couldn't start. Try again.");
    });
    return () => {
      mounted.current = false;
      ++revision.current;
      request.current?.abort();
      releasePhoto();
    };
  }, [initialization, enrich, isCurrent, releasePhoto]);

  const startSignIn = useCallback((retry = false) => {
    if (busy.current && !retry) return;
    const msal = client.current;
    if (!msal) { setInitialization(value => value + 1); return; }
    busy.current = true;
    const ticket = ++revision.current;
    request.current?.abort();
    setPending("sign-in");
    setError(null);
    // Call directly from the click, after initialization: browsers can block an asynchronously opened popup.
    void msal.loginPopup({ scopes: MICROSOFT_SCOPES, prompt: "select_account",
      ...(retry ? { overrideInteractionInProgress: true } : {}),
    }).then(result => {
      if (!isCurrent(ticket)) return;
      msal.setActiveAccount(result.account);
      identity.current = result.account;
      releasePhoto();
      setAccount(microsoftIdentity(result.account));
      void enrich(msal, result.account, ticket, result.accessToken);
    }).catch(reason => {
      if (isCurrent(ticket)) setError(microsoftSignInError(reason));
    }).finally(() => {
      if (isCurrent(ticket)) { busy.current = false; setPending(null); }
    });
  }, [enrich, isCurrent, releasePhoto]);

  const onSignOut = useCallback(() => {
    const msal = client.current;
    const user = identity.current;
    if (!msal || !user || busy.current) return;
    busy.current = true;
    const ticket = ++revision.current;
    request.current?.abort();
    setPending("sign-out");
    setError(null);
    // Explicit app-only sign-out: remove MSAL's account/tokens without signing out other Microsoft sites.
    // Let an existing silent renewal finish before clearing, so it cannot repopulate the cache afterward.
    void Promise.resolve(silentTokenRequest.current).catch(() => undefined)
      .then(() => msal.clearCache({ account: user })).then(() => {
        if (!isCurrent(ticket)) return;
        msal.setActiveAccount(null);
        identity.current = null;
        releasePhoto();
        setAccount(null);
      }).catch(() => {
        if (isCurrent(ticket)) setError("Couldn't sign out of this prototype. Try again.");
      }).finally(() => {
        if (isCurrent(ticket)) { busy.current = false; setPending(null); }
      });
  }, [isCurrent, releasePhoto]);

  const authentication: ProfileAuthentication = { provider: "microsoft", pending, error,
    onSignIn: () => startSignIn(), onRetrySignIn: () => startSignIn(true), onSignOut };
  return { account, authentication };
}
