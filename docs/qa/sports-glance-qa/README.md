# Sports Glance Card verification

Figma file `x2wnQRhqdGBZcsouyMMQUV`, component set `5912:35288`, read 2026-10-13.

2026-10-14 update: re-read the same Figma set and removed the shared Sports shadow
from all four states, including Homepage and Library instances. The 0.5 px themed
border and existing scroll insets remain. Browser checks in Light/Dark confirmed
`box-shadow: none`, 141/160 × 84 sizes, and loaded original assets. Homepage Sports
remains x=168/y=522/w=160/h=84. Production build, TypeScript, and token checks passed.
The screenshots below document the earlier implementation before shadow removal.

| State | Node | Size | Content |
| --- | --- | --- | --- |
| Cold start | 6055:21344 | 141 × 84 | Sports; Follow your favorite team; original sports illustration |
| Upcoming | 5912:35587 | 160 × 84 | NEP vs NYJ; Next; Sat, 16 Jul; 1:00 PM |
| Live | 5912:35605 | 160 × 84 | NEP vs NYJ; red dot and Live; 28 - 24; Q4 03:24 |
| Final | 5912:35593 | 160 × 84 | NEP vs NYJ; neutral Final badge; 28 - 24 |

One reusable `GlanceCard` implementation exposes `sportsState` and game data.
The default remains Upcoming. Team logos and the background image are byte-identical
to the existing assets; the sports illustration and Live dot were downloaded from Figma.
The Live dot uses the original SVG as a mask so the status color can follow the theme.
All states retain native button props, keyboard activation, and click callbacks.

Library preserves the existing Overview with one Upcoming card. The other four card
types precede one full-width Sports area. Related Sports states are labeled together
in lifecycle order: Cold start → Upcoming → Live → Final. Container queries change
four columns to two below 712 px and to one below 344 px without scaling the cards.

Checks:

- Production build, token contract, and TypeScript passed.
- 20 tests passed across GlanceCard, Homepage, and PreviewWorkbench, including
  changing lifecycle states, replacing scores/periods, removing stale content,
  click callbacks, group keyboard navigation, and unchanged homepage behavior.
- Browser measurements confirmed 141/160 px widths and 84 px heights in all states.
- Wide and narrow Library layouts and Light/Dark appearance were visually checked.
- Native card sizing was corrected to avoid inheriting the parent's flex direction.

Evidence: `figma-reference.png`, `states-light.jpg`, `states-dark.jpg`,
`library-wide.jpg`, `library-narrow.jpg`, and `geometry.json`.

The original Segoe Sans variable font remains unavailable; the existing Segoe UI
fallback is used consistently with the rest of the library. Dark uses Consumer
theme values; the supplied Figma reference is Light.
