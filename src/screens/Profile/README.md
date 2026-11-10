# Profile

Figma C3 `jSAgWuDdxjDuK404ZVNDbb`: initials `3467:9216`, photo `3587:13894`, signed out `3825:20937`.

- `Profile` composes the shared Avatar, AppHeader, AppList, AppListCard, and IOSStatusBar components.
- Pass `account={null}` for signed out. With an account, use its photo when available, otherwise the first Unicode character of its trimmed name, then email. A failed photo falls back to that initial.
- Prototype connects Microsoft personal-account sign-in through the workbench's account hook. Key screens retain the design's sample account and Rewards numbers; real accounts show only a matching [local Rewards capture](../../../docs/rewards.md), never sample values. Without a capture they keep the summary card with em dashes and a View points action. Only signed-out accounts show the introduction.
- Homepage's avatar opens Profile with the existing navigation motion. Returning preserves Homepage and its scroll position. Key screens includes all three presets.
- History and Bookmarks open the existing screens, sharing their data and supported actions with Recent. Back returns to the original Profile entry and scroll position, including after a bookmark folder or Search from empty History.
- Settings opens the supplied [Settings screen](../Settings/README.md), sharing the current account and preserving Profile beneath it. Back restores the Settings row and Profile scroll position. Notification and News preferences remain visual only until their flows are provided. No app footer or home indicator is added to this screen.
- In the Prototype, **Explore now**, **View points** and **Microsoft Rewards** open `https://rewards.bing.com/` in a new browser tab with `noopener,noreferrer`, retaining Profile and its scroll position. A matching local capture fills the existing stat card with available points, ready-to-claim points and daily streaks. Missing optional metrics in a capture are omitted. The capture timestamp remains data metadata and is not shown in Profile. The official site handles its own login. No app tokens, identity parameters or session cookies are passed to it or the IAB preview proxy. Key screens omit the callback and remain passive; account summaries there are still design fixtures.
- The 393 × 852 design adapts to the workbench's 402 × 874 device with 20 px content insets and fill-width cards. Screens have no intrinsic corner clipping. Appearance follows the workbench.
- Rewards summary follows C3 `3825:18885`: 106 px minimum height, 20 px radius, 0.5 px inset stroke, 12 px vertical padding and three equal columns separated by 6 px. The original 24 × 24 SVG exports retain their intrinsic size. Values use 16/22 at 650 with contextual alternates disabled; labels use 12/16 at 450. Each text block fills its column, centers its text and wraps when needed. The current font assets are static Segoe UI regular/semibold aliased as Segoe Sans; the original Segoe Sans variable font is unavailable, so its exact 450/650 glyph shapes and optical sizing remain a known fidelity gap. No artificial stroke or scaling is applied.

## Demo account

The optional `BingAppPrototype demoSignIn account={null}` harness is retained for
offline fixture/regression checks. The main Prototype uses real Microsoft login
instead; see [setup and account lifecycle](../../../docs/microsoft-sign-in.md).
Tap to sign in opens **Demo sign-in**, naming the existing Eleven account and
explicitly explaining that it does not connect to Microsoft. Continue signs in;
Cancel or Escape leaves the current identity unchanged. No password, token,
Microsoft API request, application registration or new dependency is involved.

The signed-in email opens **Demo account**. Done keeps the account; Sign out
returns to the existing signed-out state. `Profile` accepts controlled
`authentication` actions/status, while the Prototype owns the demo account separately from
tabs, search/browsing history and bookmarks. Login/logout never mutates those
collections or the selected privacy mode. Homepage and Profile share the same
account; private Homepage still shows its private avatar. Navigation and
switching workbench views retain the account. Reset and reload start signed out.

Both account dialogs reuse `ConfirmationDialog`, extracted from Search's
existing clear-history alert without changing that alert's content or motion.
Profile locks its scroll content through dismissal, traps keyboard focus in the
dialog, supports Escape, and restores focus to the current identity action after
the background unlocks. Passive standalone/Profile Key screens omit the
callbacks and retain their original presentation. Rewards values remain fixtures.
The oversized background clips at the Profile root without creating a scroll
container; focusing identity controls during navigation cannot pan the entire
page or its modal sideways. Only the existing content region scrolls.

## Verification — 28 October 2026

- 30 tests passed across Profile demo flow, existing Profile navigation, Search
  history confirmation and Private mode. Build, TypeScript/token checks and
  `git diff --check` passed.
- Chrome pointer checks at 402 × 874 covered cancellation, sign-in, account
  dismissal, explicit sign-out, retained activity, switching workbench views and
  Reset. Light used normal motion; the smaller dark preview used reduced motion.
  Both had no page errors or Microsoft authentication requests.
- Both appearances keep the confirmation surface 354 px wide with 24 px side
  insets. Browser fixtures isolate navigation checks from changing news/results.
  Temporary scripts and screenshots remain under `/tmp`, outside the repository.

## Assets

`assets/` contains the original Figma photo, background ellipse, and three Rewards SVGs. The gift-card illustration is a 2× PNG export of the complete artwork subtree `3825:21332`, including its original image fills, highlights, shadows, and glow. It renders at its original 130 × 122 logical size. The full-screen reference captures are QA references only.
