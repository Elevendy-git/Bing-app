# Recent verification — 2026-10-14

Reference: C2 `641:10440` (Activity). Implemented as Recent, accessed through the
third footer item and through the Recent key screen. The source is 390 × 844;
the existing workbench device is 393 × 852, with fluid screen-owned widths.
The header now follows the 393 × 852 Shareout `1:20621` and search wrapper
`81:19455` in file `yClrtwNrFJhE7W5waPRmkv`.

Browser checks at native 393 × 852:

| Element | Rendered geometry |
| --- | --- |
| Fixed header | y=0, height 118; includes 8 px below search |
| Search | x=16, y=62, 361 × 48 |
| Open tabs section | y=118, height 210 |
| Tab cards | y=168, 140 × 160, 12 px gaps, 20 px side inset |
| History | header y=328, card y=398, card height 198 |
| Copilot history | header y=596, card y=666 |
| Bookmark | header y=864, card y=934 |
| Footer with safe area | y=774, height 78 |
| New tab | x=317, y=698, 56 × 56 |

All local images loaded with nonzero natural dimensions. The Spring preview and
OpenAI favicon match the existing asset hashes exactly. Gallery and Chat preserve
their original crop geometry: 149.24 × 223.62 at (-7.49,-29.62) and 140 × 837.17 at
(0,-17.30), relative to their cards. Favicons occupy 16 × 16 slots. Medium uses
its shared 32 px SVG; Robinhood uses its 512 px original raster in a 32 px slot;
Spotify retains its native 33 × 33 SVG around the 32 px slot, including the
exported stroke. Copilot and the status symbols reuse the existing components.
No temporary Figma asset URLs are used at runtime.

Interaction correction requested by the user: removed the added search focus
ring/filtering, group detail pages, tab selection/removal, row menus, external
navigation and New tab routing/press effect. Search, View, rows and the plus
artwork are passive until the user supplies their interactions and L2 designs.
Browser clicks on Search, View and New tab leave all four sections intact;
clicking a tab and its close icon leaves all three tabs in Rest. Vertical scrolling
still reaches 454 px and the tab strip scrolls horizontally. Home/Recent footer
navigation remains available and shows one footer at a time. Key screens still
open by click-to-enlarge. Search and footer stay fixed.

Light and Consumer Dark were visually checked; the supplied Figma node specifies
Light only. Existing Segoe UI fallback fonts cannot reproduce Segoe Sans weight
550 exactly. All 77 tests across 14 files passed after this interaction correction. Production build,
TypeScript, token contract (115 tokens / 27 CSS files), and diff checks passed.

Header update verification: the search remains at y=62–110 and the scroll
surface starts at y=118 at scroll offsets 0, 309 and 454 (the end). The 8 px gap
is outside the scroller and remains visible throughout. Tabs still begin at
y=168 and History at y=398. Section headers opt into content-driven height in
Recent; the shared AppList default stays 58 px. The 19 tests covering Recent,
BingAppPrototype and AppList passed, as did the production build, TypeScript,
token contract (116 tokens / 27 CSS files) and diff checks.
