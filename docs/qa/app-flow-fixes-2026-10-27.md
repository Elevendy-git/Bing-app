# Reported app-flow fixes — 27 October 2026

- Result sessions own their privacy mode. Cancelling an opposite-mode Search
  edit restores the existing result's mode; private visits do not enter normal
  tabs or History. Recent's return to results restores the same session mode.
- Removing Search history removes matching Bing search visits from Recent.
  Clearing the list also removes searches reached inside the IAB. Ordinary
  webpage visits and open tabs remain. History's Clear all also clears Search.
- Profile, Tabs, History and Bookmark share fixed status artwork during pushes,
  pops and nested navigation. Screen-local artwork stays hidden until the detail
  exit finishes. Existing standalone screens and Homepage scroll styling remain.
- IAB location editing uses the current webpage URL in both the editable input
  and transition artwork, rather than the result session's original query.
- Search and Recent simulated keyboards delete a whole grapheme, including
  compound emoji and combining accents, and restore the caret with the committed
  value. Selection replacement and start-of-text deletion are covered too.

No animation parameters changed. Native analogies, Apple source links and the
distinction between documented behavior and web tuning are in `docs/motion.md`.

## Verification

- Full suite: 52 files, 358 tests passed with `npm test -- --maxWorkers=4`.
- Strengthened and reran the four app-flow regression tests for searches reached
  within an IAB document; all passed. Build, TypeScript/token checks and
  `git diff --check` passed.
- Chrome phone prototype at 402 × 874: sampled every rendered frame through
  Profile push/pop, nested History/Bookmark navigation and rapid Profile reversal.
  Also checked Tabs push/pop and Search above Tabs, including cancellation.
  Every sample contained exactly one status bar at device coordinates (0, 0).
- Real pointer checks covered compound-emoji deletion/caret placement, privacy
  cancellation, clicking a result link, current-URL transition artwork and Search
  clear → Recent, preserving the article visit and its open tab. No page errors.
- Repeated the five core flows in dark appearance with reduced motion enabled;
  all passed without browser page errors.
- Browser response fixtures isolate app navigation from changing network data.
  These checks do not claim to validate third-party live HTML or an actual
  device's system keyboard.

Temporary browser scripts, traces and screenshots remain outside the repository
under `/tmp`; no generated media or new dependencies were added.
