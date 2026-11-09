# Search / Query entry

Figma: C2 [Empty](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=3347-45837),
[Zero input](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=1039-29433),
[Keyboard](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=395-14844),
[Input](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=400-15387).

History deletion: [Edit](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=475-25871),
[Clear confirmation](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=400-18480).
`initialHistoryState` exposes both as passive Key screen specimens.

InPrivate: [Zero input](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20449),
[Keyboard](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20428),
[Input](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20441).

`Search` composes `AppSearchBox`, `AppList`, `AppListCard`, `IOSStatusBar`,
`IOSKeyboard`, `IOSHomeIndicator` and `Switcher`. Its three `initialState` presets, the empty-history preset and the
`initialPrivateMode` counterparts are passive in Key screens.
`interactive` enables Query text entry, the InPrivate switch and the history
controls in Prototype. The owning flow supplies `onBack`: Homepage entry returns
to the preserved Homepage, result editing restores SERP, and New tab returns to
its Recent, Tabs or History origin. Library and Key screen specimens remain passive.
[Recent search](../Recent/README.md#search-within-recent) reuses the live input,
keyboard and suggestion logic while filtering local activity.

The empty Search field's microphone opens the shared
[Voice Search modal](../VoiceSearch/README.md) when `onVoiceSearch` is supplied.
Browser recognition and keyboard dictation require browser support and microphone
permission; errors do not fabricate a transcript. Cancel preserves the Search
draft and its return destination. Camera artwork remains passive.

## Search history

Zero-input Search contains only Recent searches. Quick features, You might like,
What's trending and their discovery requests have been removed. Empty history
renders no section, title, card or placeholder. The five design fixtures are
Weather, Weather forecast, Weather today, Weather hk and Weather Nanning.

`SearchHistory` composes the existing `AppList` section header and `AppListCard`.
Rows reuse the AS layout with a History icon, regular query text and no trailing
completion arrow or logo. All records are shown in one scrollable content area;
there is no chip wrapping, two-line clipping or expand control. Only rows with a
following record display a divider.

The header begins directly below the search field at y=118, with 20 px top and
12 px bottom padding. Titles retain their 24 px x-position. The card starts at
y=172 and fills the 20 px content insets: width 362 on the 402 px phone. It has
4 px vertical padding, a 16 px corner and a 0.5 px inset stroke. Each AS row has
12 px inner padding, a 24 px icon slot containing History20Regular, a 10 px text
gap and a regular 16/22 label. The five-row specimen is 280 px tall.

Existing history interactions remain: selecting a row submits its query through
the same flow as the keyboard and AS; pointer-down preserves input focus until
navigation. Trash enters editing while retaining input focus and the current
keyboard state. Clear all / Done crossfade in the section header; each row has
an independent `Dismiss20Regular` control while query selection is disabled.
Individual removal and Done also retain input focus and the keyboard. Clear all
dismisses the keyboard and hides the InPrivate strip as the confirmation appears.
Keep or Escape preserves history and returns to editing with the keyboard hidden.
Confirmation empties the content area and restores focus there. The dialog has
24 px outer/inner insets, a 20/26 title and a 16/26 body. On the 402 × 874 phone,
it is 354 × 202 and centers above the 34 px bottom safe area. The single shared
home indicator remains above the scrim. Passive dialog previews never take focus.
The outlined Clear all action uses the shared danger token (#ac1922 in Light,
#ffb5ae in Dark), matching the design's status color and retaining dark-mode contrast.

Deletion fades the departing row and collapses its height in flow using the
shared item-exit and list-collapse presets. This moves following rows and the
card edge together without scaling text or needing workbench zoom compensation.
Reduced motion makes changes immediate; outgoing rows become inert. See
[Motion references](../../../docs/motion.md#search-history-list).

Prototype starts with empty history and owns records created by submitted normal-mode
queries. Typing, cancellation and private queries do not add records. Repeated
queries move to the front without duplicate rows. Records and edits survive
navigation for that prototype session. The workbench's Reset button clears activity
and returns Home; reloading also starts empty. Key screens keep the five design fixtures.
These controls do not read or delete actual account history or browser history.

At 402 × 874 the header is 118 px (62 + 56), with 16 px search insets. Content
uses 20 px insets and fills to 362 px; section titles retain their 24 px start.
The InPrivate introduction retains its original 24 px padding. The InPrivate strip is 48 px high; below it sits either a
34 px safe area or the 332 px iOS keyboard. Only the content scrolls.
The top 8 px of the scrolling content is clipped, like Recent's fixed header
gap. This preserves the 20 px history-header gap and 12 px suggestion gap
without adding layout space. It exposes the single page background instead of
painting a second fading cover, which would create a lighter stripe during entry.
The InPrivate strip also uses that same background; only its controls fade.

InPrivate uses a fixed dark palette (#151a28 page, #282d3e composer and card),
white status artwork and home indicator, and the shared green On switch.
The private intro adjusts within the available content area when the shared
iOS 27 keyboard and safe area reserve space.
All composer states use equal 16 px side insets (370 × 56 at x=16/y=62).
The source's private keyboard-empty x=14 offset is intentionally normalized so
mode, query and keyboard changes cannot shift the field or its internal controls.
The same keyboard motion moves the intro as space is reserved.
Switch activation preserves query and current keyboard visibility; pressing
the switch does not blur the input. Clearing input returns to the private intro.
Switching off restores the surrounding appearance and regular Search content.
Prototype supplies `privateMode` and `onPrivateModeChange` so the switch also
controls Homepage's Avatar and persists through screen navigation. Leaving Search
discards the query; the app-level mode stays selected until switched off or the
prototype is remounted. Isolated presets retain their own mode state.
Interactive suggestions send the current query to Bing in both regular and
InPrivate modes. Private submissions do not enter normal-mode history or tabs.
The prototype does not forward browser cookies or persist suggestions; the supplied
privacy copy is visual content. Suggestions submit a query; the privacy statement
remains passive until its destination is supplied.

Suggestions render five shared `AppList` AS rows inside `AppListCard`, using the
query, source (`history` / `prediction`) and optional `logoUrl` supplied by data.
`autocompleteQuery` keeps case-insensitive input matches at Regular 450 and renders
the remaining text at Strong 650, including partial words without inserting spaces.
AS owns the source icon, optional logo and trailing arrow; missing/failed logos
leave no placeholder. The original Airbnb/NBC exports keep their 25 px geometry
inside 24 px slots. The card stays 280 px high with four dividers and 12 px top gap.

`Search.suggestions.ts` supplies fixed Key screen fixtures. Prototype's Search
and Recent screens share `useSearchSuggestions` and the public Bing autocomplete
adapter at `/api/search-suggestions` in `server/searchSuggestions.ts`.
Both `npm run dev` and `npm run preview` include this route locally; the standalone
Node backend exposes the same adapter for a deployed workbench. `publicApiUrl`
selects the local route or the HTTPS backend configured by `VITE_API_BASE_URL`.
The adapter is needed because the upstream does not allow cross-origin browser
fetches. Chinese input uses the `zh-CN` market; other input uses `en-US`, matching
the English prototype.
This public endpoint has no availability guarantee and is not a production API contract.

Requests debounce by 80 ms, cancel on new/cleared input and screen exit, and time
out after 4 s upstream / 5 s client-side. Stale responses cannot replace a newer
query. Results are normalized, deduplicated and capped at five without padding.
During prefix edits/backspacing, the complete last returned list stays visible
until the new response arrives, rather than collapsing to a subset on every key.
Successful responses are reused for 60 seconds in a bounded, 20-query memory cache
owned by the mounted Search session; nothing is written to browser storage.
A new uncached query has no AS card until its real results arrive. Failure also
leaves the card absent; the input can still be submitted using the keyboard.
There is no single-row entered-query placeholder or fabricated completion.
The response contains no personal history or logos. In normal Prototype mode,
received suggestions that exactly match local submitted query history use the
history icon (ignoring case and normalized whitespace); other rows use the
prediction icon. InPrivate never uses normal-mode history for this annotation.
This changes only the source icon: backend order, query text and the five-item
limit remain intact, and no query or logo is invented. Removing local history
updates the icon immediately, including cached AS. `SearchSuggestions` still delegates
row presentation to the shared AS `AppList`; matching-text weights stay unchanged.
The wrapper's `data-suggestions-source` reports `preview`, `loading`, `live` or
`fallback` for verification without adding workbench controls or product UI.

A static GitHub Pages deployment serves the workbench while a separate backend
serves the live adapters. Set `VITE_API_BASE_URL` before building the frontend and
allow the Pages origin in the backend's CORS configuration; see
[backend deployment](../../../docs/backend-deployment.md). Without a reachable
adapter, no live AS card appears. Requests omit cookies and authorization;
the autocomplete adapter uses no API key or third-party proxy.

Prototype uses the shared [iOS-inspired motion defaults](../../../docs/motion.md).
Homepage and SERP entry move the shared composer, keyboard and reserved keyboard
space together over 420 ms; cancelling reverses toward the measured origin.
These are tuned web timings, not published iOS constants. Independent keyboard
focus/dismissal uses 350 ms. Pressing Back keeps input focus until activation,
then navigation owns dismissal, including blur caused by the outgoing screen
becoming inert. Cancelling preserves Homepage scroll or the retained result
document. SERP's own Back-to-Homepage action slides the whole result
screen to the right; see [SERP Back motion](../../../docs/motion.md#serp--homepage-back).
The keyboard stays mounted for smooth interruptions, but is inert and hidden
from accessibility when dismissed.
Reduced-motion preferences disable these transitions. Key screens stay static.
Both search-field appearances crossfade during travel, with shared icon/text
spacing, so returning does not swap icons after landing. Content retains its
12 px upward entrance, starting 100 ms later and settling with the field.

The Airbnb and NBC SVGs are original exports from the Figma AS instances,
centered at intrinsic 25 × 25 (including stroke) in the 24 × 24 logo slot.
History and Delete reuse the installed Fluent components from Code Connect.

The Incognito Code Connect name (`Incognito48Filled`) is absent from the installed
Fluent package. `assets/incognito.svg` is the original 64 × 64 export of node
`1:20435`, used unchanged. Status artwork is shared through `IOSStatusBar`.

The regular supplied states are Light; InPrivate is always Dark. Existing Consumer
tokens provide regular Search's Dark appearance. The shared iOS 27 keyboard follows Light/Dark appearance, including InPrivate.
See [OS reference and adaptations](../../../docs/ios-native.md).
Segoe Sans intermediate font weights remain limited by the shared Segoe UI
fallback; the original variable font is unavailable.
