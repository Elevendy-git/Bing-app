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
current private mode. Back returns to Recent, preserving its scroll position and
entry-specific footer. Standalone previews keep the action passive without `onNewTab`.
The prototype supplies the existing Tabs, History and Bookmark flows through
callbacks. The Recent search field, Copilot history and unspecified row actions
remain passive; do not invent interactions from the appearance of a control.
Dark uses the existing Consumer theme because the supplied node specifies Light.

The empty state appears only when `tabs`, `historyEntries`, `conversationEntries`
and `bookmarkEntries` are all empty. Partial activity retains the existing overview.
The original `empty-recent.png` illustration occupies a 128 × 128 slot, followed
by a 24 px gap and the design's title/body (20/26 px, weight 650; 16/22 px, regular).
The group stays centered on the full device canvas. It introduces no extra action
or scroll overflow; search, footer, home indicator and New tab reuse their shared
components. Key screens → Recent → **Recent · Empty** uses
`BingAppPrototype initialPage="recent" initialRecentState="empty"`, so New tab,
Search return and Home/Recent navigation remain available in the enlarged preview.
