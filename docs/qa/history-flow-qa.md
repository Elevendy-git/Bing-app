# History flow verification — 2026-10-16

Sources: Bing App Shareout `1:20658` (Recent entry), `1:20758` (single-item menu),
`1:20763` (page menu), `1:20768` (empty state).

## Implementation

- Recent → History → View opens the date-grouped History screen. Visits have separate
  identities, including repeated sites on different dates. Single deletion and Clear
  all history update both this screen and Recent's three-visit summary.
- History's Delete and Feedback / Clear all history menus reuse `MenuList` and its
  original icon masks, material, typography and shadows. Menu presets are available
  in Library → Navigation → Menu through one passive preview and side controls.
- AppHeader, AppList, AppListCard, status bar and ScreenFooter are reused. Device
  clipping remains owned by the existing iPhone 18 Pro shell.
- Empty-state Search now opens the existing Search page and keyboard. Returning
  retains the empty state and restores focus. Search query history, Copilot history,
  bookmarks and open tabs keep their separate state.
- Feedback stays passive pending its destination design. The history entries are
  supplied design fixtures held in prototype state, not imported browser history.
- Key screens adds History, History · Delete, History · Menu and History · Empty.

## Design and browser checks

Verified at 402 × 874 with global light/dark appearance:

| Element | Measured geometry |
| --- | --- |
| Header | status62 + header56 |
| Date cards | x20; y162, 418, 674; width362 / height198; radius20 |
| Header menu | top112, right12; 241 × 96 |
| Today Spotify menu | top347, right32; 241 × 56 |
| Empty illustration | x137 / y256.5; 128 × 128 |
| Empty title / body | x40; width322; 20/26 at650, 16/22 at450 |
| Search now | 119 × 48; radius20; 16/26 at450 |
| Footer | action row52 + existing34 safe area |

- Lower-row menus flip above their trigger to avoid the footer. With scroll104,
  the last row's popup ended at y715, above the footer at788.
- All visible image slots loaded from local assets; Medium and Robinhood occupy32px,
  Spotify retains its original33px SVG centered in32px. The new128px illustration
  uses its unmodified original PNG. Menu icons retain24px SVG dimensions.
- Downloaded History delete/feedback SVGs were byte-identical to existing MenuList
  assets, so no duplicate assets were added.
- Full empty-frame/button design-context requests timed out. Illustration and text
  were recovered through child design-context requests and the complete frame
  screenshot. Exact button and empty-container parameters were read directly through
  the read-only Figma Plugin API, including selected fill #0c59f2, radius20,
  0/1/3px shadow at15%, text16/26/450, gap24 and bottom padding32.
- Global font loading/fallback remains unchanged; text wraps within the adapted
  402px canvas. No unrelated font or screen styling was changed.
- Escape/outside dismissal, menu focus, single deletion, clear all, Search entry
  and return, dark appearance, Library controls and Key screens enlargement checked.
- No browser console errors during the flow. Temporary QA tab closed; global
  appearance returned to System.

## Automated checks

56 targeted tests passed across History, Recent, Tabs, SERP, prototype navigation,
AppList and workbench suites. Tests cover duplicate visit identities, single/last/all
deletion, Recent synchronization, retained scroll, untouched other sections, menu
dismissal/focus, Search cancellation and SERP-origin Recent footer restoration.

Production build, token contract, TypeScript and `git diff --check` passed.
The existing bundle-size advisory remains.
