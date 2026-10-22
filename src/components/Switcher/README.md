# Switcher

Source: [C2 Switch, 3326:52693](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=3326-52693).

Six variants combine `selected` (Off / On) with `state` (`rest`, `pressed`,
`disabled`). The track is 40 × 24 with a 2 px inset. The thumb is 20 × 20,
or 24 × 20 in Pressed. Selected variants align the thumb to the right.
Disabled variants use the gray track, translucent thumb, and no thumb shadow.
The transparent Figma stroke consumes no layout space; the inset remains 2 px.

All artwork is CSS geometry; the source contains no image or SVG assets.
`--gnrc-color-switcher-*` and `--gnrc-shadow-switcher-thumb` preserve the
supplied source colors and shadow across themes and can be overridden by a host.
No separate dark-mode values were supplied by this node.

Library shows one directly interactive Overview, followed by all six static
variants. Click or use Space / Enter to toggle the Overview; holding the control
shows the Pressed thumb. There is no side control panel.

Provide `selected` and `onSelectedChange` for a controlled button with switch
semantics. `state="disabled"` disables activation. Without the callback, the
component stays passive artwork with an accessible image label. Interactive
thumb movement uses the shared 200 ms iOS-inspired control preset and respects
reduced motion. Static variants preserve their exact supplied geometry.
