# List refresh — 2026-10-14

Source: [C2 Bing App — MAI Style Alignment, List 375:9897](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/C2-Bing-App-MAI-Style-Alignment?node-id=375-9897).

The existing `AppList` component retains its seven variants and public props.
The update uses CSS Modules, shared theme tokens, the mapped Fluent icons, and
original local Figma image assets. The Figma-linked Divider source path and
Favicon implementation are not present in this workspace; the local divider
and original favicon SVGs supply those visuals.

## Updated details

- History overflow controls use 20 px icons centered inside 24 px slots.
- Search and history leading icons use the secondary foreground color.
- The section action uses a 16 px chevron, a 2 px bottom inset, and #0c4df2 in
  Light. Its dedicated token leaves the workbench accent unchanged.
- Medium assets render at their intrinsic 24 / 32 px sizes, clipped by 6 / 12 px
  corners with a 0.5 px outside stroke. The SVG source geometry is unmodified.
- Trending uses the original two image layers, their horizontal reflection,
  84 × 48 slot and 8 px corners. Supplied thumbnails retain their own orientation.
- Trending ranks use the primary foreground and a 24 × 24 slot. Titles can use
  two lines in a narrower card. AS text preserves the word space and ellipsis.
- Light dividers use 10% black. Text alignment starts at 46 px for YML, Trending,
  and AS; 54 px for AS Hub and both history variants.
- Text retains the design's 16/22 and 12/16 sizes and appropriate optical-size
  settings. The project still uses its existing Segoe UI fallback: the original
  Segoe Sans variable font is not available, so font weight/glyph rendering is
  not claimed to be pixel-identical.

## Verification

Measured in the browser using the `Consumer/List → All Variants` story:

| Variant | Width | Height including divider |
| --- | ---: | ---: |
| YML | 390 | 56 |
| Trending | 390 | 72 |
| AS | 390 | 56 |
| AS Hub page | 390 | 56 |
| Bing search history | 390 | 66 |
| Copilot history | 390 | 66 |
| Section header | 390 | 58 |

All local static images loaded in Light and Dark, including both Trending
layers. Browser console contained no errors. Favicon geometry, icon slots,
thumbnail crop, divider bounds and theme colors were inspected. Divider widths
follow the current Figma node geometry (344 / 336 px), confirmed with a read-only
Plugin API query, rather than the shorter lines visible in parts of the composite
Figma screenshot.

The existing single/multiple card configurator still switches correctly. The
350 px card shell constrains rows to 349 px after its two 0.5 px borders;
multi-line Trending titles retain their 84 px thumbnails. The last row hides
its divider. The app's Library → Content → List displays all seven variants.

The story's comparison surface uses the existing themed list surface. Figma's
warm page canvas and purple component-set outline are not component styling.
The pre-existing dark Storybook outer canvas is outside this component update.

Evidence: `figma-reference.png`, `light.png`, and `dark.png`.
Validation: 27 AppList/workbench tests, production build (including TypeScript
and token checks), and Storybook build passed.

## Library Overview follow-up

List now exposes the composed List Card above its seven individual variants,
using the same Overview wrapper and subtitle as Glance Card. The former
Storybook-only configurator and mock data are shared through `AppList.examples.tsx`.
Both modes expose all six List types. Single shows one original row; Multi shows
five sample rows with a section header and four dividers. Changing mode preserves
the selected type. Search for `list card`, `single list`, or `multi list` finds
the Overview.

Browser checks at the existing 708 px workbench viewport confirmed the 350 px card
shell, five Trending rows, loaded thumbnails, and Copilot history retention when
returning to Single. Light and Dark screenshots are `overview-light.png` and
`overview-dark.png`. Library label CSS now targets direct heading children so
it cannot override the component's own 16 px / 550-weight section title.

Validation: 36 List/configurator/workbench tests, production build (including
TypeScript and token checks), Storybook build, and `git diff --check` passed.

## Controls placement follow-up

The Overview now uses its available width, with the card centered in the preview
area and controls in a 244 px right-hand area. A subtle vertical divider separates
them. The controls use compact Layout / List type labels without the previous
nested card-shaped field. Below 680 px of available container width, the controls
move to a top toolbar with a horizontal divider; below 440 px the fields stack.
Only the native-size preview scrolls horizontally on very narrow screens.

Browser verification covered desktop (1440 px, right-hand controls), the normal
708 px workbench panel (top toolbar), and a 393 px panel (stacked fields, no page
or controls overflow). The card remains 350 px wide and Single / Multi switching
retains the selected type. Light/Dark were visually checked. Temporary viewport
and theme overrides were restored.

Evidence: `controls-side.png`, `controls-side-dark.png`, `controls-toolbar.png`.
Validation: 21 existing configurator/workbench tests, production and Storybook
builds (including token and TypeScript checks), and `git diff --check` passed.

## Section header font fallback correction

Rechecked Figma `780:20666`: both Open tabs and View use Segoe Sans Text Semibold,
weight 550, 16/22 px, optical size 10.5. The shared webfont face assigned Regular
to the entire 400–599 range, so these labels rendered too light despite the
correct CSS weight. A section-only font face now maps 550 to the existing
Segoe UI Semibold fallback. Size, line height, spacing and other typography stay
unchanged. This improves the fallback weight; it does not reproduce the missing
Segoe Sans variable font or its optical-size axis exactly.
