# IAB Footer

Source: [Bing App Shareout, 1:20637](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20637).

`IABFooter` composes the existing five-slot `AppBrowserToolbar` with a toolbar
surface and a 0.5 px top divider. It fills its host's width and is 52 px high
(402 × 52 in Library). Per the user's direction, the component excludes the
source frame's iOS home indicator and bottom safe area. Screens compose those
separately; the phone shell owns clipping.

Back, Forward and Home reuse Fluent 24 px icons. Recent reuses
`CollectionsEmptyIcon`; Copilot reuses the original 22 × 22 Figma SVG in
`AppBrowserToolbar/assets/copilot-outline.svg`. Appearance inherits the workbench
theme, including the blue selected Recent icon.

Library → Navigation → Footer groups App Footer and the directly interactive IAB Footer preview. IAB Footer
starts with Recent selected, matching the supplied node. Back and Home clear
that selection; Recent selects it again. Forward and Copilot remain passive
until their flows are specified. There is no separate state or appearance panel.

SERP and Recent's browser footer variant use this same component, followed by
the screen-owned `IOSHomeIndicator` and its 34 px bottom safe area.
Navigation callbacks and accessible labels pass through to `AppBrowserToolbar`.
