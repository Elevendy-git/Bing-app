# Search / Query entry

Figma: Bing App Shareout, [Zero input](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20487),
[Keyboard](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20495),
[Input](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20502).

InPrivate: [Zero input](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20449),
[Keyboard](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20428),
[Input](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20441).

`Search` composes `AppSearchBox`, `AppList`, `AppListCard`, `IOSStatusBar`,
`IOSKeyboard`, `IOSHomeIndicator` and `Switcher`. Its three `initialState` presets and their
`initialPrivateMode` counterparts are passive in Key screens.
`interactive` enables Query text entry and the InPrivate switch in Prototype, with `onBack` returning
to the preserved Homepage. It also enables the history controls described below.
Library previews and Recent search remain passive.

Prototype can supply `discovery` resources prefetched by `useSearchDiscovery`.
You might like displays three real MSN TopStories suggestions, while What's
trending displays six Google Trends US topics in source order, using readable
English article headlines and matching photos from those topics. The original
queries remain in the data and provide a fallback when no headline is supplied.
Both sections reuse List components; their rows remain passive. See
[Search discovery data](../../../docs/search-discovery.md).

## Search history

The delete states follow C2 [collapsed](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=392-16459),
[expanded](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=526-24486), and
[confirmation](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=437-37180).
`SearchHistory` reuses the shared `AppList` section header and Search pill styling.
It measures the actual pills with `ResizeObserver`, showing at most two rows and
reserving the trailing arrow only when more rows exist. Expanding reveals every
item; collapsing restores two rows. Resizing, font loading and deletion recompute
the fit. The eight fixtures include repeated visits with distinct IDs so deleting
one never deletes another matching query. Pill text remains passive.

The trash control enters editing. Individual 20 px Fluent dismiss icons sit at
top/right -6 px. Clear all / Done remain available in either expanded or collapsed
editing states. Clear all opens the supplied confirmation; Keep or Escape preserves
history, while the destructive action removes the history section. Focus stays
inside the dialog and returns to its trigger or the Search content after clearing.
History actions dismiss the keyboard; the modal makes the underlying phone controls inert.

The 390 × 844 reference adapts to 402 × 874 without scaling its typography or
spacing. History retains 20 px insets, while the dialog retains its original 24 px
outer and inner insets: 354 × 194 at x=24/y=323, centered above the 34 px bottom safe
area. The original 20 × 20 action-divider SVG is used as an unchanged mask. The
external Code Connect button from `src/serp.ts` has no local equivalent; the dialog
uses a scoped neutral button matching its 40 px height, 12 px corner and 14 px label.
History controls crossfade over 200 ms; dismiss badges fade and scale in with editing.
Deleted pills fade to 96% scale over 160 ms while remaining pills reflow over 200 ms.
Layout measurements compensate for the workbench's phone scale to avoid a jump at
the start of reflow. The final history section fades and collapses when emptied.
History expansion and the dialog use the same shared motion presets. All these
transitions respect reduced motion, and departing controls immediately become inert.

Prototype starts with empty history and owns records created by submitted normal-mode
queries. Typing, cancellation and private queries do not add records. Repeated
queries move to the front without duplicate chips. Records and edits survive
navigation for that prototype session. The workbench's Reset button clears activity
and returns Home; reloading also starts empty. Key screens keep the original fixtures.
These controls do not read or delete actual account history or browser history.

At 402 × 874 the header is 118 px (62 + 56), with 16 px search insets. Content
uses 20 px insets and fills to 362 px; section titles retain their 24 px start.
The InPrivate introduction retains its original 24 px padding. The InPrivate strip is 48 px high; below it sits either a
34 px safe area or the 332 px iOS keyboard. Only the content scrolls.
An 8 px page-colored cover extends below the search field, like Recent's fixed
header gap. It sits outside layout flow, preserving the original 20 px discovery
gap and 12 px suggestion gap, and fades with the header during navigation.

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

`Search.suggestions.ts` supplies fixed Key screen fixtures. Prototype uses
`useSearchSuggestions` and the public Bing autocomplete endpoint through the
same-origin `/api/search-suggestions` middleware in `server/searchSuggestions.ts`.
The middleware runs in both `npm run dev` and `npm run preview`; it is needed
because the upstream does not allow cross-origin browser fetches. Chinese input
uses the `zh-CN` market; other input uses `en-US`, matching the English prototype.
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
The response contains no history or logos, so live
rows use the prediction icon and omit logos. `SearchSuggestions` still delegates
row presentation to the shared AS `AppList`; matching-text weights stay unchanged.
The wrapper's `data-suggestions-source` reports `preview`, `loading`, `live` or
`fallback` for verification without adding workbench controls or product UI.

A static GitHub Pages deployment cannot run this middleware. Hosting live
suggestions there requires a same-origin backend route; without it no live AS
card appears. No third-party proxy, API key or credential is used.

Prototype uses the shared [iOS-inspired motion defaults](../../../docs/motion.md).
The composer, keyboard and reserved keyboard space share the same 420 ms
transition in both navigation directions. Independent keyboard focus/dismissal
uses 350 ms. Pressing Back keeps input focus until activation, then navigation
owns the dismissal, including any blur caused by the outgoing screen becoming
inert. Back reverses the entry while preserving Homepage scroll. The keyboard stays mounted for smooth
interruptions, but is inert and hidden from accessibility when dismissed.
Reduced-motion preferences disable these transitions. Key screens stay static.
Both search-field appearances crossfade during travel, with shared icon/text
spacing, so returning does not swap icons after landing. Content retains its
12 px upward entrance, starting 100 ms later and settling with the field.

Quick-feature masks and content thumbnails are original Figma assets. Voting
and hockey reuse byte-identical `AppList` assets. Trending thumbnails preserve
the source horizontal reflection. The Airbnb and NBC SVGs were exported from
their original Figma instance nodes because Code Connect refers to an external
Figma UI kit with no local component. Each is centered at intrinsic 25 × 25
(including its outer stroke) in the design's 24 × 24 slot.

The Incognito Code Connect name (`Incognito48Filled`) is absent from the installed
Fluent package. `assets/incognito.svg` is the original 64 × 64 export of node
`1:20435`, used unchanged. Status artwork is shared through `IOSStatusBar`.

The regular supplied states are Light; InPrivate is always Dark. Existing Consumer
tokens provide regular Search's Dark appearance. The shared iOS 27 keyboard follows Light/Dark appearance, including InPrivate.
See [OS reference and adaptations](../../../docs/ios-native.md).
Segoe Sans intermediate font weights remain limited by the shared Segoe UI
fallback, as documented in the root README.
