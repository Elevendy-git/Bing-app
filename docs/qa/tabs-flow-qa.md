# Tabs flow verification — 2026-10-16

Sources: Bing App Shareout `1:20756` (menu), `1:20652` (Recent),
`1:20742` (Tabs), `1:20752` (open menu), `1:20747` (empty).

## Implementation

- `MenuList` is the reusable anchored-menu surface, with a `TabsMenu` preset.
  Library → Navigation → Menu shows one passive Overview and follows global appearance.
- Recent's Open tabs View and View all open Tabs. Selection and deletion share
  state across both screens; clearing all or removing the last card shows the empty state.
- Tabs reuses AppHeader, TabsCard, ScreenFooter, iOS status/home indicator and
  the same NewTabButton as Recent. The screen has no own corner radius.
- Tab settings and Feedback are passive until their destination designs are supplied.
  Tab previews are the supplied design fixtures, not captured live browser sessions.
- Tabs navigation and menu motion reuse iOS motion defaults and honor reduced motion.

## Browser checks

Verified in the workbench at the current iPhone 18 Pro 402 × 874 canvas:

| Element | Measured geometry |
| --- | --- |
| Header | y62, height56 |
| Grid | first card x20/y128, 175 × 200, gap12 |
| Menu | x152/y112, 238 × 136; three 40 px rows |
| New tab | x326/y712, 56 × 56 |
| Footer action row | y788, 402 × 52, followed by 34 px safe area |

- Compared the grid, original image crops, menu and empty illustration/text against
  Figma screenshots. Menu has no dimmed backdrop. Downloaded assets are local;
  the 128 px illustration is stored at 512 px to avoid shipping its 2048 px original.
- Escape closes the menu and restores focus. Single deletion updates Recent and
  selects a surviving tab. Clear all renders the empty state.
- Tabs scroller reached 272 px; New tab opened Search with an empty query and keyboard,
  and returning preserved 272 px scroll. Automated coverage also checks private mode.
- Key screens includes Tabs, Tabs · Menu and Tabs · Empty, with click-to-enlarge.
- Library menu measured 238 × 136 in dark appearance with readable foreground and
  destructive colors; it remains inert. System appearance was restored after QA.
- No browser console errors during this flow.

## Automated checks

Targeted navigation, Recent, SERP, Tabs and workbench suites passed (34 tests across
six files). Coverage includes cross-screen deletion, last-tab removal, clear all,
outside/Escape dismissal, keyboard menu selection, Search cancellation, retained
scroll/private mode, and restoring the SERP-origin Recent browser footer.

Production build and token contract passed. The existing bundle-size advisory
remains; it does not fail the build. `git diff --check` passed.
