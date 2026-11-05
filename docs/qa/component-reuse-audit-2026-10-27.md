# App component reuse and prototype audit

Date: 2026-10-27

## Scope

Inspected the phone Prototype, its screen composition, shared Library components, and their data sources. Library specimens and Key screens intentionally expose fixed design states; they are not counted as unfinished Prototype flows. This audit makes no application-code changes.

The main screens already reuse shared components. The remaining issues are duplicated surrounding behavior, one divergent bookmark projection, and controls whose destinations or input behavior have not been implemented.

## Follow-up: repeated maintenance resolved

The four repeated-maintenance items below have subsequently been addressed:

- [`ActivityEmptyState`](../../src/screens/ActivityEmptyState.tsx) owns all four empty layouts, preserving their illustrations, copy, typography, and optical offsets.
- [`AnchoredMenu` / `useAnchoredMenu`](../../src/components/MenuList/AnchoredMenu.tsx) own menu anchoring, overlays, dismissal, motion, and focus restoration. Item height, overlap, and keyboard/footer bounds remain explicit per screen.
- [`useSearchInput`](../../src/screens/Search/useSearchInput.ts) owns insertion/deletion, caret restoration, physical input, composition guards, and keyboard-dismiss gestures for Search and Recent. Both enforce the service's 256 UTF-16-unit limit without splitting a grapheme on paste.
- [`recentBookmarkPreview`](../../src/screens/Bookmark/Bookmark.data.ts) now selects the first three actual root sites in collection order, using the same metadata as detail/search. It no longer joins fixtures by ID. Search still includes all supplied folder contents.

The findings below describe the initial audit. The separately listed unfinished product flows are outside this consolidation and remain pending.

Consolidation verification:

- 167 targeted tests passed. After the final shared-focus correction, all 36 affected menu/navigation tests passed, including two new focus-ownership regressions.
- Browser QA verified all four empty states in both themes at 402 × 874: original 128 px artwork, 24/8 px gaps, typography, optical alignment, and stationary Recent artwork during keyboard presentation.
- Browser QA also exercised normal motion/light and reduced motion/dark at different preview scales: Search/Recent length limits and selection replacement, real Prototype Escape dismissal, menu anchoring/outside dismissal, History/Bookmark deletion, and focus restoration across all four menu hosts.
- Confirmed existing and new bookmark IDs preserve the supplied title, URL, and logo in the summary. No uncaught browser errors in the exercised flows.
- Production build and `git diff --check` passed. The build retains its existing large-chunk advisory.

Focus restoration is deferred until the background unlock has committed and cancels on reopening or leaving the screen. The outside-dismiss surface prevents the browser's default focus transfer. This also covers instant reduced-motion exits.

## Follow-up: Feed article opening

Feed images and headlines now open their supplied article URLs through the existing IAB.
The live Homepage passes article destinations through `FeedCard`; each carousel
slide keeps its own URL. Swiping/cancelling a carousel gesture suppresses navigation,
while More and pagination remain independent. Passive Library/Key-screen fixtures
without an open callback remain unchanged. Normal visits create a tab and browsing
history entry, URLs do not enter query history, and private visits remain unrecorded.
The IAB continues to use the existing server HTML preview and its loading/error handling.
MSN's script-only shells use the public article-body adapter described in
[`iab-preview.md`](../iab-preview.md); this is a reading layout with real content.
Browser QA checked image/headline opening, carousel swipe/More separation, restored
Homepage scroll, light/dark and reduced motion. Three live MSN articles returned
their matching title, URL and body; one was also exercised end-to-end in the phone.

## Follow-up: simulated keyboard controls

Search and Recent now share working number/symbol pages, one-shot Shift, double-tap
Caps Lock, a Unicode emoji palette and browser speech recognition. The shared input
hook preserves the keyboard's exact case, caret/selection and grapheme deletion.
Keyboard predictions use the current live autocomplete response and can fill the
field without submitting. No fixed `Design` examples appear in the interactive
Prototype; passive Library examples remain fixtures. Unsupported or denied speech
recognition reports its actual status. Leaving/dismissing the keyboard aborts speech
and rejects stale results. See [`ios-native.md`](../ios-native.md) for platform limits.

112 affected component, Search and Recent tests passed. Browser QA covered both
screens in light/normal-motion and dark/reduced-motion, including input focus,
Shift/Caps Lock, number/symbol/emoji insertion, whole-emoji deletion, prediction
replacement, fixed 402 × 332 geometry and speech callback/cleanup integration.
Speech callbacks were controlled for QA; no real microphone transcription was
claimed. The live autocomplete endpoint also returned actual `weather` suggestions.

## Initial repeated implementations and divergent data

| Area | Evidence | Consequence / proposed boundary |
| --- | --- | --- |
| Bookmark summary data | [`recentBookmarkPreview`](../../src/screens/Bookmark/Bookmark.data.ts#L45) filters `RECENT_BOOKMARKS` fixture objects by saved IDs. [Recent's summary and search](../../src/screens/BingAppPrototype.tsx#L291) receive different projections. | A saved entry's updated title, URL, and logo are lost in the summary, and new IDs are omitted. Derive the summary from the actual bookmark records; keep sample ordering/artwork in the fixture layer. |
| Four empty-state layouts | [Recent](../../src/screens/Recent/Recent.tsx#L223), [Tabs](../../src/screens/Tabs/Tabs.tsx#L81), [History](../../src/screens/History/History.tsx#L78), [Bookmark](../../src/screens/Bookmark/Bookmark.tsx#L80), plus their CSS modules. | Each repeats an illustration, title/body, spacing, and canvas placement. A shared empty-state component can preserve different artwork, copy, and optical offsets as parameters. This is a maintenance issue, not evidence that the present visuals are incorrect. |
| Four menu hosts | [Recent](../../src/screens/Recent/Recent.tsx#L308), [Tabs](../../src/screens/Tabs/Tabs.tsx#L94), [History](../../src/screens/History/History.tsx#L108), [Bookmark](../../src/screens/Bookmark/Bookmark.tsx#L105). | Menu contents already share `MenuList`, but the overlay, outside dismissal, anchor, animation, and focus plumbing are repeated. Item menus also repeat position calculations with page-specific menu heights and viewport bounds. Share the host/positioning behavior while preserving those differences explicitly. |
| Search and Recent input behavior | [Search editing](../../src/screens/Search/Search.tsx#L139), [Search input/scroll handlers](../../src/screens/Search/Search.tsx#L190), [Recent editing](../../src/screens/Recent/Recent.tsx#L158), [Recent input](../../src/screens/Recent/Recent.tsx#L194). | Both use the same keyboard and grapheme-aware deletion helper, but insertion, caret restoration, focus, and scroll dismissal are still separately implemented. Recent limits input to 256 characters; Search can reach 257 although the suggestion service rejects queries beyond 256. Search also lacks Recent's one-finger guard for touch dismissal. |

Bookmark reproduction: passing a saved site with ID `medium`, title `Updated title`, URL `https://example.com/updated`, and a custom logo produces the fixture's `Medium`, `https://medium.com/`, and sample Medium logo in the summary. Search uses the supplied record instead.

There is a related reuse gap: Recent renders Bookmark summaries through [`HistoryListRow`](../../src/screens/Recent/Recent.tsx#L265), while the detail page uses [`BookmarkListRow`](../../src/screens/Bookmark/Bookmark.tsx#L91). Both use `AppList`, but their favicon/fallback policies can differ.

## Partially implemented Prototype features

These are specific missing behaviors, not claims that the whole screen is static. Several destinations are explicitly awaiting design flows and should not receive invented interactions.

| Area | What works | Missing behavior / evidence |
| --- | --- | --- |
| Homepage Feed | Live data loading, pagination, carousel, More menu, follow/unfollow, and Toast. | Articles contain a URL in [`MsnArticle`](../../src/services/msnFeed.ts#L6), but [`LiveHomepageFeed`](../../src/screens/Homepage/LiveHomepageFeed.tsx#L75) does not wire article opening, and [`FeedCard`](../../src/components/FeedCard/FeedCard.tsx#L37) has no URL/open callback. Clicking the image/headline does not enter IAB. |
| Bookmark | Supplied folder navigation, item menus, deletion, and empty states. | [Website rows](../../src/screens/Bookmark/Bookmark.tsx#L94) lack an open callback; [Recent summaries](../../src/screens/Recent/Recent.tsx#L267) also omit it. Prototype [bookmark mutation](../../src/screens/BingAppPrototype.tsx#L330) only deletes; there is no save/add action. With the actual app starting empty, users cannot build a bookmark collection. Some fixture folders deliberately have no supplied children. |
| Simulated keyboard | Letters, space, delete, and Return/Search. | [`123`, Shift, emoji, and dictation](../../src/components/IOSKeyboard/IOSKeyboard.tsx#L60) are artwork rather than working controls. [Search](../../src/screens/Search/Search.tsx#L246) omits keyboard predictions and therefore always displays the component's `Design / Designs / Designed` defaults; [Recent](../../src/screens/Recent/Recent.tsx#L303) supplies query-related text. |
| Visual/voice search and IAB More | Search input, result navigation, and result-page loading. | Homepage camera/microphone have no action callbacks. [AppSearchBox](../../src/components/AppSearchBox/AppSearchBox.tsx#L65) renders those affordances as spans; [IAB More](../../src/screens/SERP/SERP.tsx#L35) is also a span without a menu. |
| Profile, Copilot, Glance destinations | Avatar opens Profile; Profile History/Bookmarks navigate; Glance cards render through shared components. | [Profile](../../src/screens/Profile/Profile.tsx#L83) only wires History/Bookmarks. Its [README](../../src/screens/Profile/README.md) explicitly leaves account, notifications, Rewards, Downloads, and Preferences pending. Copilot navigation/history and Glance detail destinations are also unconnected. Profile/Glance values include sample account, rewards, weather, and sports data. These require the corresponding product flows before implementation. |

Additional AS limitation: the live autocomplete parser marks remote results as predictions and does not merge local search-history matches. The history icon/logo examples in the AS fixtures therefore do not imply that these states are produced by live autocomplete. Remote logo availability is a separate data-source capability.

## Confirmed reuse and intentional references

- All status bars use `IOSStatusBar`; live instances share one local-system clock. Multiple rendered instances do not mean multiple implementations.
- Search and Recent share `SearchSuggestions`, `useSearchSuggestions`, and the AS `AppList` variant.
- Recent/full Tabs share `TabsCard` and the same tab records; Recent/History share `HistoryListRow`.
- `ScreenFooter` shares `AppFooter`; IAB/SERP/Recent browser chrome reuse `AppBrowserToolbar`.
- Menu contents already share `MenuList`; the duplication is in the host behavior.
- Static and live Homepage feeds share `FeedCard`; their different data sources are intentional.
- The SERP screenshot belongs to the design-reference preview. The actual Prototype mounts [`LiveSERP`](../../src/screens/BingAppPrototype.tsx#L343), not a screenshot presented as live results.

## Verification

Read screen/component/service implementations and exercised the app in Chrome with Playwright, controlled MSN/autocomplete responses, and reduced motion. Confirmed:

- Feed headline and visual-search clicks do not open a destination or popup.
- Search keyboard predictions remain `Design` while typing another query, and `123` has no button behavior.
- Search accepts 257 characters; Recent enforces 256.
- Bookmark site rows have no open action in the seeded preview.
- The bookmark projection substitutes fixture metadata for supplied metadata.
- The exercised paths produced no uncaught browser errors.

This verifies UI wiring with controlled data, not external provider availability or animation quality. No new build or unit-test run was needed for this read-only audit.

## Suggested order

1. Correct bookmark projections and unify the explicit Search/Recent input policy.
2. Consolidate empty-state and anchored-menu hosts without changing their design differences.
3. Connect existing URL-bearing Feed/Bookmark records to the existing IAB where that is the intended flow.
4. Complete pending keyboard capabilities and product destinations from their supplied designs.
