# Tabs card verification — 2026-10-14

Source: C2 `878:30997`, Rest `644:25672`, Selected `878:30996`.
`figma-reference.png` is a reference only and is never imported by the application.

Verified against Figma context and the browser rendering:

| Property | Both states |
| --- | --- |
| Card | 140 × 160 px, radius 16 px |
| Header | 34 px high |
| Favicon | 16 × 16 px, x=12, y=10 |
| Close target / Fluent icon | 40 × 34 / 16 × 16 px |
| Text | 12 px / 16 px, requested weight 550 |
| Preview image | 159.25 × 393.87 px, x=-9.62, y=-84.92 |
| Rest stroke | 0.5 px, black at 8% |
| Selected stroke | 3 px, #0c4df2 |

Selection uses an inset overlay; both states retain identical artwork geometry.
Both raster assets load from local files. The close icon uses the Figma-referenced
`Dismiss16Regular`, retaining its intrinsic 16 px dimensions.

- Overview switches selection through pointer and Space input. Closing the
  inactive card preserves selection; Enter closes the last card. Restore returns
  to the original Rest / Selected pair.
- Search `tabs` finds one component with three previews. At an 850 px workbench
  viewport the compact navigation works, the cards retain their native dimensions,
  and the page has no horizontal overflow. The temporary viewport was reset.
- Dark uses the existing Consumer palette: #282d3e header, #e5ebfa text,
  #82aefa selection. The original favicon has a white tile for contrast; the
  page capture is unchanged. The supplied Figma node specifies Light only.
- Browser console: no errors. 69 tests across 11 files pass. Production build,
  TypeScript, token contract (112 tokens / 23 CSS files), and diff checks pass.

Artifacts: `implementation-light.png` is cropped from `library-light.png`;
`library-dark.png` and `library-narrow.png` record theme and layout checks.
The shared Segoe UI fallback cannot exactly reproduce Segoe Sans weight 550;
the component retains the project's existing font strategy.

## Overview layout update — 2026-10-14

The earlier screenshots above record the original paired Overview. The current
Overview displays one card and shares its configuration layout with List Card.

- Rest / Selected controls update the preview. Selecting the preview updates the
  controls; closing and restoring preserves selection. Choosing a state reopens it.
- At a 1600 px viewport, controls occupy a 244 px column on the right. At 500 px,
  controls sit above the preview. The card remains 140 × 160 px with no page overflow.
- Light and Dark were checked in the browser. List Card still switches its layout
  and type; Trending multi-list renders five entries. Browser console has no errors.
- All 25 scoped Tabs, List example, and workbench tests pass. Production build,
  TypeScript, token contract (112 tokens / 24 CSS files), and diff checks pass.
