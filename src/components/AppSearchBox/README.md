# App Search Box

Figma C2 sources: [Search page · 402:18101](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=402-18101)
and [Recent page · 1117:73172](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=1117-73172).

`AppSearchBox` has `variant="search" | "recent" | "serp"` and three controlled visual
states: `zero-input`, `focus`, `input`. Supply `value` for the input state.
By default it renders passive artwork with a static Figma cursor. Library and
Recent retain this behavior. The supplied Shareout Query flow opts into a native
input through `inputProps` / `inputRef`, plus `onBack` and `onClear` callbacks.
Camera and voice actions remain passive pending their interaction designs.

| Variant | Default size | Text | Layout |
| --- | --- | --- | --- |
| Search | 358 × 56 | 16 / 24, weight 400, opsz 5 | 12 px inset; 36 px back slot; 44 px camera/voice slots |
| Recent | 358 × 48 | 14 / 20, weight 450, opsz 10.5 | 10 px side inset; 36 px icon/clear slots |
| SERP | 358 × 48 before screen sizing | 16 / 24, weight 400, opsz 5 | 12/8 px inset; original 28 px Bing icon in 32 px slot; 44 px voice slot |

SERP follows [Shareout 1:20518](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20518).
It has no clear icon or static caret. The screen supplies its actual fluid width
and may use a readonly input to reopen query editing.

For IAB loading, `loadState` accepts `loading`, `rendering` or `complete`.
The 2 px blue line clips to the bottom of the search capsule and adds no layout
height. Set `loadKey` for a new request/retry and opt into live motion with
`animateLoading`; omit `loadState` when idle or failed. The Library Search results
example selects Loaded / Loading from its right-side State control and keeps the
loading line static. Progress behavior and Apple references are in
[motion.md](../../../docs/motion.md#iab-search-loading).

Input replaces the Search camera/voice group with a 36 px clear slot; Recent
only shows that slot in Input. Both use a 24 px Fluent icon, a 1 × 21 px cursor,
and a 5% black background in Light. The microphone and cursor are unchanged
Figma SVGs; both cursor exports are byte-identical and share one asset. SVG masks
retain intrinsic sizes while following theme colors. Fluent icons reuse the
design's Code Connect mappings.

Library → Inputs → Bing Search Box shows one preview per page with a right-side
State selector. The existing Homepage component remains `BingSearchBox`.
Recent now composes `AppSearchBox` at fluid width (361 px on the 393 px device);
the screen owns its 16 px side insets and persistent 8 px bottom header gap.

Both source component sets specify Light. Dark follows the existing Consumer
theme. Segoe Sans falls back to the project's system font stack when unavailable.
