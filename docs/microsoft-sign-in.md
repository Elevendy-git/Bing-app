# Microsoft personal-account sign-in

The main Prototype uses MSAL Browser 5.27.0, authorization code + PKCE, and the
Microsoft Graph delegated `User.Read` permission. Passwords are entered only in
Microsoft's popup. No client secret is needed or accepted by this SPA.

## Registration

The supplied registration is **Bing app prototype**, client ID
`ec6fea2d-15f4-44ec-8954-5b49d94a2e2e`. This is a public application identifier.
Supported accounts are **personal Microsoft accounts only**. The authority is
`https://login.microsoftonline.com/consumers`; company/school-only accounts are
not supported by this registration.

Under Authentication → Single-page application, register exactly:

```text
http://localhost:5174/redirect.html
```

The user's Overview screenshot shows one SPA URI, but not its value. Confirm the
exact URI in the portal if Microsoft reports a redirect mismatch. Do not select
Web instead of SPA, enable an implicit grant, or create a secret for this code.
The development app canonicalizes 127.0.0.1 to localhost before mounting. Both the
workbench and callback must use the same origin for the MSAL bridge to work.

Optional `.env.local` can override `VITE_MICROSOFT_CLIENT_ID`; see `.env.example`.
Every Vite environment variable exposed to this frontend is public. Production
and preview use their own origin and need the corresponding `/redirect.html`
SPA URI registered before login, e.g. `http://localhost:4174/redirect.html` for
build preview. No online deployment or portal settings are changed by this code.

## Flow and boundaries

1. Homepage avatar → Profile → **Tap to sign in** opens Microsoft's popup.
2. Select a personal account and authorize the basic profile permission.
3. Profile/Homepage show the verified account name/email. Graph can enrich the
   display name/email and photo; unavailable photos use the existing Avatar
   initial fallback. Graph failure does not substitute an example user.
4. The email opens **Microsoft account**. **Done** keeps the account; **Sign out**
   clears this app's MSAL account/tokens. This is explicitly app-only sign-out;
   Microsoft sessions on other sites stay signed in. Next sign-in uses an
   explicit account picker. No global Microsoft logout is promised.

MSAL owns the token cache in `sessionStorage`. App code does not copy tokens to
its own storage, backend, IAB proxy, URLs, analytics or logs. Graph access tokens
are sent only as bearer headers to `https://graph.microsoft.com`. Photo object
URLs are revoked on replacement, sign-out and unmount. Aborted/stale profile
responses cannot restore identity after sign-out.

The account hook lives above workbench Reset. Switching views, resetting activity
and reloading within this browser session retain the active identity; activity
and identity do not overwrite each other. Only the cached active account is
restored, not an arbitrary other cached account. Private-mode browsing remains
separate. Microsoft login does not itself sync Bing history, bookmarks, tabs or Rewards.
The real signed-in account shows the Rewards introduction unless a matching
[local Rewards capture](rewards.md) exists. A capture replaces it with real
available/claimable points and streaks. The capture time is retained in metadata.
Profile's **Explore now** and **Microsoft Rewards** entries open the official
`https://rewards.bing.com/` site in a new tab (`noopener,noreferrer`). Its own
browser session handles login and real points; it may require sign-in again.
This link opens the website; it does not refresh the separate local capture.
No app access token, account parameter or cookie is sent through the IAB proxy.
Key screens remain passive fixtures. An opt-in `demoSignIn` harness remains for
offline fixture/regression checks; the main Prototype no longer uses it.

## Popup recovery

Initialization completes before enabling login, and the popup API is called
directly from the user's click. Automatic mount/refresh never opens a login
window. Repeated ordinary clicks do not start concurrent requests.

MSAL v5's BroadcastChannel bridge survives COOP separation, but cannot immediately
detect a manually closed Microsoft window. While waiting, Profile provides
**Closed the window? Try again**. Only this explicit action sets MSAL's documented
`overrideInteractionInProgress` flag; the old request's rejection/results cannot
overwrite the new request. Close the previous popup before retrying. The five
minute timeout is an app setting to allow MFA/passwordless sign-in, not a
Microsoft default. A timeout or blocked popup leaves a recoverable signed-out UI.

Root `redirect.html` runs only the bundled bridge entry, never the React app or
another MSAL instance. Vite builds both HTML entries. Do not add a
`Cross-Origin-Opener-Policy` header to the callback. Opening that page without an
auth response simply tells the user to return to the app.

## References

- [MSAL initialization](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/initialization)
- [Login, redirect bridge and explicit popup retry](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/login-user)
- [Vite redirect bridge setup](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/redirect-bridge)
- [MSAL cache](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching)
- [Logout and app-only logout](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/logout)
- [Graph user](https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0)
- [Graph profile photo](https://learn.microsoft.com/en-us/graph/api/profilephoto-get?view=graph-rest-1.0)

## Verification

Unit/integration checks cover explicit popup login, cached identity, permission or
network failure, missing photos, cancellation, blocked popups, app-only sign-out,
photo cleanup, stale Graph responses, token renewal completing before cache
clearing, and explicit retry superseding an old login.
Profile checks cover real identity propagation, private artwork, pending/error
feedback, sign-out confirmation and omission of fixture Rewards points. Existing
demo, Search history and Private-mode regression checks remain in place.

Chrome checks open the real Microsoft personal-account login page and inspect the
public authorization request for this client ID, the localhost callback, code
response type and PKCE S256. No account credentials are entered by automation;
complete real login/consent with your own account to verify tenant configuration
and actual Graph data. Test fixtures never establish a live identity.

Rewards entry checks cover signed-in and signed-out Profile opening the same
official URL without triggering app sign-in, changing navigation or showing
fixture points. Light/dark Chrome checks intercept only the destination page to
verify a real new tab, a null opener, an empty referrer and retained Profile.
They do not read a live Rewards account or verify its points.

Light/normal-motion and dark/reduced-motion phone checks with a test-only identity
adapter cover shared identity, retained activity, switching workbench views,
Reset clearing activity without sign-out, reload restoration and local sign-out.
The account dialog retains 24 px insets and 354 px width on the 402 px canvas;
neither appearance reports runtime errors. These fixture checks are separate
from the real Microsoft login-page check and do not claim a completed live login.
