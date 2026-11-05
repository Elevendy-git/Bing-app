# Recent

Source: [C2 641:10440](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=641-10440), named Activity in Figma.
Header update: [Bing App Shareout 1:20621](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20621), a 393 × 852 canvas.
Search component: [C2 1117:73172](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=1117-73172), reused through `AppSearchBox variant="recent"`.
SERP entry footer: [Shareout 1:20634](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20634).
Empty state: [C2 970:13652](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=970-13652).

`footerVariant="app"` is the Homepage entry with the three-item `ScreenFooter`.
`footerVariant="browser"` reuses `IABFooter`: Back, unavailable Forward,
Home, Copilot, and a blue filled Recent icon. Back returns to the originating
SERP query. `BingAppPrototype` records the entry source so revisiting Recent from
Homepage restores its three-item footer. Both variants use the same 52 px row
and 34 px device safe area. Key screens includes **Recent · From SERP**.

Secondary pages (Tabs, History, Bookmark and bookmark folders) omit the App
Footer and its 52 px space. They keep only the shared system home indicator and
34 px safe area, with navigation back through the header. The same rule applies
to Prototype and Key screens. Tabs keeps New tab 20 px above the safe area;
Recent retains its existing position above its footer.

The 390 × 844 design adapts to the workbench's 402 × 874 device. The status safe
area is 62 px; the fixed header contains the 48 px search box with 16 px side
insets and 8 px bottom padding. The scroll surface starts at y=118 so this gap
remains while scrolling. The first section's top padding is 12 px, keeping tabs
at y=168. The footer plus shared iOS safe area is 86 px (52 + 34). Open tabs use native 140 × 160 cards with 12 px gaps and 20 px
side insets. The remaining groups use shared 198 px List cards with 70 px headers.
Search fills to 370 px; List cards fill to 362 px with 20 px side insets. Section
titles retain their existing 24 px start position (20 px container + 4 px title).

`Recent.data.ts` contains the design's sample entries and local assets. The first
tab preview and favicon are byte-identical to the existing TabsCard assets and
are reused. Gallery and chat artwork preserve their image-fill transforms.
Spotify is exported intact from the original Figma favicon instance; its 33 px
SVG retains intrinsic dimensions, centered on the 32 px icon slot. Robinhood is
the original 512 px image. Medium, Copilot and status icons reuse shared assets.

`BingAppPrototype` connects the third footer entry to this screen and Home back
to Homepage. Vertical content scrolling and horizontal tab-strip scrolling remain
available. New tab (`+`) opens a fresh Search page with the keyboard and the
current mode. Back returns to Recent, preserving its scroll position and
entry-specific footer. Standalone previews keep the action passive without `onNewTab`.
The prototype supplies the existing Tabs, History and Bookmark flows through
callbacks. Copilot history and unspecified row actions remain passive; do not
invent interactions from the appearance of a control.
Tapping an Open tabs card in Recent or the full Tabs grid opens that tab's
existing result page. Each open tab retains its own mounted document, scroll
position and pending request. Switching tabs does not submit another query or
append history. Editing the reopened page replaces only that tab; closing a
card releases its document and cancels any pending request without navigating.
The close button remains separate from the card's open action. Library specimens
retain their existing passive state controls.
Recorded Bing History rows open their saved query directly in SERP from both
Recent and the complete History screen. Opening a visit creates a fresh tab and
uses the shared normal/private activity rules; it does not overwrite a previously
edited tab. The query is decoded from the recorded URL, not guessed from its title.
The section View still opens History, and the row's overflow action remains
separate from opening the result. Library and standalone fixtures stay passive.
The Prototype supplies `onDeleteHistory` to make each History row's overflow
button open the shared `HistoryMenu` item variant. Delete removes that visit
from the same collection used by the full History page; tabs and other activity
remain intact. When its last case-insensitive query visit is removed, the same
query is removed from Search history; another visit to that query keeps its
deduplicated Search entry. Deleting a regular webpage does not remove a query.
This also works for filtered visits beyond the three-row preview.
The menu is anchored in phone coordinates, dismisses on outside click or Escape,
and restores focus to its trigger (or the content when that row was deleted).
It releases keyboard focus without clearing the Recent search draft. Background
controls stay inert through menu dismissal. Without the callback, specimens
retain passive controls.
Dark uses the existing Consumer theme because the supplied node specifies Light.

Sections with no entries are omitted, including their headers and spacing. The
first populated section always uses 12 px top padding. Open tabs previews up to
three cards; its trailing View all appears only when the full collection has
more than three tabs. The section-header View still opens Tabs whenever tabs exist.
The empty state appears only when `tabs`, `historyEntries`, `conversationEntries`
and `bookmarkEntries` are all empty.
The original `empty-recent.png` illustration occupies a 128 × 128 slot, followed
by a 24 px gap and the design's title/body (20/26 px, weight 650; 16/22 px, regular).
The group stays centered on the full device canvas. It introduces no extra action
or scroll overflow; search, footer, home indicator and New tab reuse their shared
components. Key screens → Recent → **Recent · Empty** uses
`BingAppPrototype initialPage="recent" initialRecentState="empty"`, so New tab,
Search return and Home/Recent navigation remain available in the enlarged preview.

Prototype tab previews reuse the exact sanitized Bing HTML returned for that
tab's last loaded query. `TabsCard` scales an inert, script-free iframe from the
actual result viewport width to the card width, sharing it with the Tabs grid.
This is a preview of the loaded page from its top, not a screenshot of the last
scroll position. Opening Recent does not issue another Bing search request;
the snapshot's stylesheet and image resources may load from browser cache or
their original hosts. Snapshots stay in the prototype session and are released
when their tab is closed, edited, or the prototype is reset.

History URLs use the actual result request URL. The endpoint extracts the page's
own favicon link, which supplies both the tab header and the shared History row.
Searching for a site name still visits Bing's result page, so its identity is
Bing. Missing or failed icons show a neutral globe in History rather than the
Library's Medium artwork. Private queries do not publish normal-mode snapshots
or history metadata; delayed responses cannot recreate closed tabs.
Related Bing searches opened inside a result document enter both browsing and
query history when their first page snapshot arrives. Each navigation entry is
recorded once: Back/Forward can restore its document and tab preview, but cannot
reinsert history the user deleted. Restoring a tab also records no new visit.

## Search within Recent

Sources: C2 [850:24466](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=850-24466)
(rest), [851:24797](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=851-24797)
(focus), [851:25144](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=851-25144)
(matches plus suggestions), and [970:31102](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=970-31102)
(suggestions only). Keep the current 402 × 874 adaptation, 16 px search insets,
20 px card insets, fixed 8 px header gap and 24 px title start. These supplied
passive states keep the footer and New tab visible. In Prototype, focusing the
input presents the shared `IOSKeyboard`, just like Search page. Content reserves
the same 332 px keyboard height for search results. The empty illustration and
its text stay centered on the full canvas, at the same position during keyboard
presentation and dismissal. Keyboard keys type, replace selections, delete and
submit; physical keyboard input remains supported. `inputMode="none"` avoids
opening a second OS keyboard on top of the simulated phone keyboard. Clear
keeps focus, while blur, Escape and predominantly vertical scrolling dismiss
the keyboard without clearing the query. Horizontal tab swipes and zoom do not
dismiss it. Footer and New tab stay behind the keyboard and become inert while
covered. One home indicator remains stationary above both keyboard and footer.
Inactive Recent releases focus. Back from a child page preserves the draft
without reopening the keyboard. Opening Recent through the Home or SERP footer
starts with an empty input, the default activity sections, and scroll at the top.
Existing tabs, history and bookmarks remain intact. The original passive Key
screen states do not acquire focus.

The Prototype opts into an actual `AppSearchBox` input with `onSearchSubmit`.
Typing filters all tabs, history and supplied conversations by title/query/URL;
bookmark search includes actual saved sites in supplied folders, beyond the
three-item preview. Matching is case-insensitive, normalizes whitespace and
Unicode width, and requires all query words. URL escapes are decoded for matching.
Empty groups disappear. All matches are displayed during a search rather than
truncating to the normal preview count; the group View still opens its full page.
Filtering does not mutate or save activity. Clear restores the default preview
and keeps focus; Escape dismisses the keyboard and preserves the draft. Each edit resets the result
scroll offset so its first match remains visible.

`SearchSuggestions` and `useSearchSuggestions` are shared with Search page.
The last group is **Search on Bing**, with up to five live AS rows and no View
control. Per the user's follow-up, AS rows retain the same trailing arrows as
Search page. It becomes the first/only group if there are no local matches, replacing
the empty-activity illustration while typing. Suggested text, icons, emphasis,
optional logos, request cancellation and provider failures follow the existing
AS rules. Suggestions are never fabricated to fill a failed/empty response.
Live AS in Recent marks exact matches against queries decoded from actual Bing
history URLs with the history icon. A similarly named ordinary webpage is not
treated as a searched query. Order and optional source artwork remain unchanged.
Enter or choosing an AS opens SERP in a new tab under the existing normal/private
activity rules. Matching tab/history rows retain their existing navigation.
Drafts survive child-page navigation; a new footer entry advances `searchResetKey`
and clears only transient search/focus/scroll state before the screen paints.
Inactive Recent stops network requests and never reacquires input focus.
The workbench's full Reset separately remounts Recent with empty activity and input.

Key screens adds **Recent · Search focus**, **Recent · Search matches** and
**Recent · Search suggestions**. They use passive shared components and isolated
fixtures; no requests or activity writes occur. The supplied all-groups mock uses
unrelated example copy under “Open a”; the working preview filters its fixtures
truthfully rather than pretending unrelated records match that query.

## Private mode

[C2 Private mode, 970:14091](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=970-14091)
defines a separate Recent gate, shared by Home and SERP entries. While
`privateMode` is enabled, omit the search field, New tab, normal empty-state
illustration and all normal collections. Show the existing 64 px Incognito
asset, explanatory copy and Turn off action on the fixed private navy surface.
Keep the frame's 24 px content inset; center the group above the screen-owned
52 px footer and device bottom safe area. The 390 × 844 reference becomes
402 × 874 without scaling its artwork or assigning a screen corner radius.

The entry source still chooses App Footer or IAB Footer. Both remain interactive
in Prototype and keep the workbench appearance. Turn off calls
`onPrivateModeChange(false)`, restores the untouched normal records, clears the
old Recent filter and focuses the content without presenting the keyboard.
An empty normal collection restores the existing Recent empty state. A private
search does not create normal tabs, query history, browsing visits or snapshots.
Back from the IAB-footer gate resumes its retained result document and privacy
mode. Returning from Search after enabling private mode in Tabs or History
lands at this gate rather than exposing the normal child list.

The supplied Learn more text has no destination screen or connector; it retains
the design's underlined appearance without adding a new L2 flow. Key screens
includes passive **Recent · InPrivate** and **Recent · InPrivate · From SERP**
specimens; the live flow is in Prototype.
