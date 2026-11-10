# Local Microsoft Rewards data

Prototype Profile can display a read-only capture of the user's real Rewards
dashboard. Microsoft Graph `User.Read` still supplies only identity; it is not a
Rewards permission or points API. The user signs in themselves on the official
Rewards website. Only visible numeric data is captured, with their confirmed
account email and the time it was read. Credentials, browser storage, cookies,
tokens and full page HTML/text are not copied into the project.

The current capture was read directly from the authenticated official dashboard.
It is a snapshot, not continuous website polling. The owner was linked using the
user's explicit confirmation of which account they signed in to; the email is
not inferred from a display name.

## Data path

1. Sanitized capture lives in `.local/rewards.json`, ignored by Git and denied
   by Vite's static file server. It is not imported into frontend source or dist.
2. `POST /api/rewards` reads that local file only. It accepts a matching account
   email in a JSON body, returns whitelisted fields, uses `private, no-store`,
   and rejects non-loopback clients and foreign Origin/Host headers. This is a
   single-user local prototype bridge, not an authenticated public service.
3. `useRewardsSnapshot` lives above workbench Reset alongside the account hook.
   It refreshes the saved capture on focus/visibility and every 30 seconds while
   visible. This checks for a new local capture; it does not scrape Microsoft.
4. Only the matching signed-in Microsoft identity receives captured values.
   Switching identities hides the old account's values immediately; stale
   requests cannot restore them. Signing out returns to the introduction.
   Key screens remain design fixtures.

The file's schema is `accountEmail`, nonnegative integer `availablePoints`,
nullable nonnegative `readyToClaim` and `dailyStreakDays`, ISO `observedAt`, and
`source: "microsoft-rewards-dashboard"`. No private example account/balance is
checked in. This local-only data path is unchanged by the online presentation.

## Profile presentation

The Rewards introduction is reserved for signed-out Profile. Signed-in Microsoft
accounts always receive the Rewards summary card. Without a matching capture,
its existing three artwork columns show **Available points**, **Ready to claim**
and **Daily streaks** with em dashes, followed by **Points are unavailable here.**
and a **View points** button. That button opens the official Rewards website;
it does not claim that this prototype has read the account's points. Missing
data is never represented by zero or the Figma sample values.

The public workbench does not request the private local capture, and the public
backend has no Rewards route. Signing in supplies identity, not a Rewards data
permission. The signed-in summary therefore uses the unavailable state online.

The existing three-stat layout and artwork are reused. The actual dashboard
currently provides available points, ready-to-claim points and daily streaks;
claimable points are labeled **Ready to claim**, not **Daily points**. Missing
metrics are omitted, never replaced with the Figma sample. Zero is a valid count.
The capture timestamp remains metadata and is not displayed in Profile. It
describes the original read, including after reload or a network failure.
Opening Rewards externally does not update that timestamp.

## Verification

Endpoint tests cover account isolation, field whitelisting, missing/corrupt data,
cache headers and rejected origins/methods. Client tests cover account changes,
late responses, sign-out and temporary outages. Profile checks cover real-value
propagation through the prototype, the zero-day streak, signed-in unavailable
values, account changes, capture arrival/removal and signed-out promotion.
Browser checks use
the real local endpoint with a test-only identity adapter, separate from live
Microsoft login. No reward claiming, redemption or search activity is automated.
