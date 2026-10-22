# Header

Reusable navigation header from C3 Bing App, node `4058:12091`.

- Default 393 × 56; padding 10 px horizontal and 8 px vertical.
- Transparent background, as in Figma; the embedding screen owns the surface.
- Title: “Title”, 18 px / 26 px, weight 650, optical size 10.5, centered at x=197.5.
- Controls: 44 × 40, with 24 × 24 icon slots. The source's two visible placeholders
  reuse the connected Fluent Circle icon's explicit `Circle24Regular` variant. The
  package's unsized `CircleRegular` uses a 20 px drawing; the 24 px variant matches
  the source's 20 px visible circle and 1.5 px ring within a 24 px slot.
- `leftAction` and `rightActions` accept icons, labels, click handlers, disabled state,
  and native button attributes. Set `leftAction={null}` or `rightActions={[]}` to hide.
- An optional bottom divider corresponds to the source's hidden Border layer.
- Unequal action counts keep the title centered; long titles truncate before the controls.
- The screen can override the default mobile width through `className` or `style`.

Library → Navigation → Header shows one Default preview. No navigation destination is invented for the placeholder controls;
screens provide the callbacks. Light and Dark reuse the Consumer foreground tokens.

The exact Segoe Sans variable font remains unavailable; this uses the shared Segoe UI
fallback, with the same typography limitation documented for other Bing components.

Validation: production build passes. Header action and workbench tests
pass (10 tests). Browser checks confirm 393 × 56 default geometry, 393 px Light/Dark
embedding without overflow, centered titles with three trailing controls, 320 px
long-title truncation without overlap, and visible keyboard focus.
