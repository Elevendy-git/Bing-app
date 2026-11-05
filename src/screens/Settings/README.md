# Settings

Figma C3 `jSAgWuDdxjDuK404ZVNDbb`, node `3569:18888` (393 × 974).

The screen composes the existing `IOSStatusBar`, `AppHeader`, `AppList` and
`AppListCard`. All eleven leading icons plus the back chevron use the exact named
24 px Regular icons in the installed Fluent library, matching the design's
Fluent components. No new icon artwork or temporary Figma URLs are needed.

The header stays 118 px tall (62 px status area + 56 px app header). Content uses
20 px side insets and fills the available width: 362 px cards on the 402 × 874
iPhone 18 Pro canvas. The first section title has 8 px above it; later titles
retain 24 px. Rows are 48 px, with an 8 px divider slot between rows, 16 px inner
insets and a 54 px divider inset. Final rows omit the divider. Card heights are
56 / 224 / 224 / 112 px. The original 24 px bottom spacing is preserved.

The supplied taller composition scrolls inside the current phone. Status/header
stay pinned; the screen adds neither an app footer nor a home indicator. Corner
clipping belongs to the device shell. Appearance follows the workbench.

Prototype entry is Homepage → Profile → Settings. Back pops to the retained
Profile, restores its exact scroll position and focuses the Settings row.
Homepage and account/activity state remain intact. Navigation reuses the shared
motion preset and fixed system-chrome layer; reduced motion uses `instant`.

Account uses the current Prototype identity, preferring email then name; signed
out displays “Tap to sign in” without a fictitious account. The standalone Key
screen in its own Settings group retains the supplied Kate account as a design
fixture. Other setting rows are passive until their destination designs and
interactions are supplied, consistent with the user's existing instruction.
