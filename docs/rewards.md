# Prototype Microsoft Rewards data

Signed-in Profile uses the existing three-column Rewards card. By user choice,
accounts without a matching local capture display the design's demo values:
2,456 total points, 30/270 daily points and a 3-day streak. These values are not
returned by Microsoft and do not imply account synchronization. Signing out
shows the Rewards introduction. A matching local capture takes priority over
the demo values.

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
   Switching identities immediately falls back to demo values; signing out hides
   the card. Stale requests cannot restore the old account's data. Key screens
   remain design fixtures.

The file's schema is `accountEmail`, nonnegative integer `availablePoints`,
nullable nonnegative `readyToClaim` and `dailyStreakDays`, ISO `observedAt`, and
`source: "microsoft-rewards-dashboard"`. No private example account/balance is
checked in. Missing, invalid or mismatched captures use demo values while signed in.

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
propagation through the prototype and the zero-day streak. Browser checks use
the real local endpoint with a test-only identity adapter, separate from live
Microsoft login. No reward claiming, redemption or search activity is automated.
