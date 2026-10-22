# Homepage verification

Checked on 2026-10-13 against Figma file `x2wnQRhqdGBZcsouyMMQUV`, node
`5826:54329`, at 393 × 852.

The screen composes IOSStatusBar, BingSearchBox, GlanceCardGroup, FeedCard, and
AppFooter. It is available in the workbench's Key screens → Homepage and Prototype,
and in Storybook under Key Screens/Homepage.

## Visual and layout checks

| Element | Figma target (x, y, width, height) | Browser measurement |
| --- | --- | --- |
| Status area | 0, 0, 393, 62 | 0, 0, 393, 62 |
| Title bar | 0, 62, 393, 56 | 0, 62, 393, 56 |
| Search box | 16, 394, 361, 64 | 16, 394, 361, 64 |
| First glance card | 20, 522, 140, 84 | 20, 522, 140, 84 |
| Lead feed card | 20, 622, 353, 315.372 | 20, 622, 353, 315.367 |
| Footer and home indicator | 0, 774, 393, 78 | 0, 774, 393, 78 |

The subpixel feed-height difference comes from browser layout rounding. Original
wallpaper, avatar, weather illustration, and article assets are bundled locally;
all visible images loaded. Wallpaper uses the Figma crop and gradients with a
visually fitted CSS translation of Figma's image adjustments.

- [Figma reference](figma-reference.png)
- [Implementation, initial light screen](implementation.png)
- [Workbench phone preview](workbench-preview.png)
- [Recorded browser geometry](geometry.json)

## Behavior and integration

- Search accepted text input.
- Glance cards scrolled horizontally; End moved focus to Money. Initial
  `scrollLeft` is 0 and scroll padding preserves the first card's 20 px inset.
- At vertical `scrollTop` 183.5, the complete lead article was visible while the
  status area remained at y=0 and the footer at y=774.
- The initial Key screens check displayed Homepage inside the iPhone 16 shell.
  Subsequent gallery refinements use screen-only thumbnails and in-place enlargement;
  see `../workbench-handoff.md` for current behavior. The saved workbench screenshot
  records the initial Homepage assembly.
- Light and Dark settings rendered the screen with the existing component
  themes. Only the supplied light design is a Figma fidelity target.
- No browser warnings or errors were captured in the isolated Homepage preview.

## Automated checks

- 43 existing tests passed across 7 files.
- Production build passed.
- Storybook build passed (existing upstream eval/chunk-size warnings only).
- TypeScript and the token contract passed: 85 tokens across 19 CSS files.

## Scope and known differences

This implements the requested first screen and its complete lead article. The
below-fold event section, further feed cards, and destination pages are not part
of this assembly. Existing component interactions are reused.

The project still lacks the original Segoe Sans variable font. Its Segoe UI
fallback does not reproduce the design's 450/550/650 weights exactly. Wallpaper
filter translation is an approximation, so this is not a claim of pixel-perfect
100% equivalence. Screenshot capture also uses a different color pipeline from
Figma; raw RGB differences are not an exact fidelity metric.
