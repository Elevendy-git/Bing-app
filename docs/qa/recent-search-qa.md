# Recent search — 26 October 2026

Implemented C2 states `850:24466`, `851:24797`, `851:25144`, `970:31102` using
the existing Recent search capsule, tab cards, list cards and shared AS renderer.

- Checked Light and Dark at 402 × 874. Search is x=16, y=62, 370 × 48;
  scroll content begins at y=118; AS cards have x=20 and width=362.
- Compared focus, local matches and suggestions-only Key screens with the
  supplied Figma screenshots. Recent AS omits sample source logos. The user's
  follow-up restores the same trailing arrows as Search page. The header, footer
  and New tab remain fixed; no screen overflow.
- Browser test used the actual `/api/search-suggestions` endpoint. `Weather`
  returned `weather`, `weather channel`, `weather underground`, `weather radar`,
  `weatherbug`. Suggestions were marked `live` and all five rows rendered.
- SERP response HTML was mocked only for deterministic navigation/thumbnail QA.
  This test is not evidence of live SERP content. Selecting an AS opened the
  matching query; returning to Recent retained its filter. A history entry older
  than the three-item preview remained searchable. Tab selection restored its
  original query; clearing restored the normal preview and input focus.
- Automated coverage includes full-collection matching, nested bookmarks,
  punctuation/Unicode/URL queries, five AS rows, empty results, IME submission,
  Clear/Escape, passive specimens, hidden-screen request cancellation and new-tab
  activity recording. Six relevant suites passed (55 tests). After the final
  trailing-arrow adjustment, the affected Recent/AS suites passed again (17 tests).
- Production build and `git diff --check` passed. Browser reported no page errors.

## Keyboard follow-up

- Prototype focus now presents the same iOS 27 keyboard as Search page. At
  402 × 874, its top is y=542 and height is 332; the content viewport ends at
  y=542 while the search field stays at y=62, 370 × 48. Empty-state text remains
  fully above the keyboard. Footer actions are inert while covered, with one
  stationary home indicator for either entry footer.
- Browser checks passed for keyboard typing, selection replacement, deletion,
  Clear, Escape, vertical scroll dismissal, horizontal gesture retention, Search
  submission and returning to Recent without reopening the keyboard. Light and
  Dark screenshots were inspected. Physical input cannot be overwritten by a
  delayed caret-restoration callback.
- Interruption sampling: keyboard displacement was 259.553 px immediately before
  and after refocus, then returned continuously to 0. Under reduced motion,
  keyboard translation is immediately 0 and content reserves 332 px.
- Five related suites passed (50 tests). After the caret fix, both Recent search
  and keyboard suites passed again (16 tests); production build passed. Real AS
  was used in the browser check; SERP HTML remained a navigation fixture. No
  browser page errors were reported.

## Stationary empty state correction

Per the user's follow-up, the empty illustration and text no longer move for
the keyboard. Browser sampling across 60 frames of presentation and dismissal
kept the artwork at y=333 (128 px high) and text at y=485 (56 px high), before,
during and after the keyboard. Clearing a typed query with the keyboard still
open restores the same positions. Keyboard motion still runs from y=874 to
y=542. The seven keyboard regression tests, production build and diff check
passed; the browser reported no page errors.
