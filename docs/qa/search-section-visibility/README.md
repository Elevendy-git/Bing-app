# Search section visibility

Reference: Figma `vA59dRO3b38EcRK1JY8N6w`, node `392:16085`.

- Prototype eye buttons independently collapse You might like and What’s trending. The title stays visible and the icon changes to EyeOff; another click restores the content.
- Reuses AppList section headers and Fluent icons, with reduced-motion support. The original 200 ms control transition has been replaced by the [disclosure motion refinement](../search-disclosure-motion/README.md).
- Visibility persists through typing, Private mode changes and Search navigation during the prototype session. Reset restores both sections. Passive previews remain passive.
- Toggling keeps loaded content mounted, does not refetch it, and preserves the search input focus and keyboard. Collapsed content is inert and excluded from the accessibility tree.

Validation on 2026-10-22:

- `npm test -- src/screens/Search/Search.discovery.test.tsx src/screens/Search/Search.test.tsx src/screens/BingAppPrototype.activity.test.tsx`: 27 tests passed.
- `npm run build`: passed (existing chunk-size warning).
- Browser at `http://127.0.0.1:5174/`, current 402 × 874 mobile canvas: independently hid both sections and restored Trending, confirmed input focus stayed on Search query, then dismissed the keyboard and checked light/dark layouts. Collapsed body measured 0 px tall.
- Screenshots: [Light](./hidden-recommendations-light.png), [Dark](./hidden-recommendations-dark.png).
