# Tabs card

Browser tab thumbnail from [C2 Bing App, node 878:30997](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=878-30997).
The source contains Rest (`644:25672`) and Selected (`878:30996`).

- Native size: 140 × 160, 16 px corner radius, 34 px header.
- Header: 12 px leading inset, 16 × 16 favicon, 4 px title gap, 40 × 34 close
  target with the design's `Dismiss16Regular` Fluent icon.
- Title: 12 px / 16 px, weight 550, optical size 10.5, with ellipsis.
- Rest stroke: 0.5 px black at 8%; Selected: 3 px `#0c4df2`. Strokes overlay
  the content without changing its size or cropping. Shadow: 0 / 1 / 2 px at 5%.
- Both original raster assets are local. The default artwork preserves the
  design's image-fill transform; custom previews cover the area below the header.
  `previewStyle` preserves a host screen's original Figma crop when one is supplied.
- The supplied Figma node specifies Light. Dark adapts the existing Consumer
  surface, foreground and accent palette; the captured page image stays unchanged.

```tsx
<TabsCard
  title={tab.title}
  previewSrc={tab.screenshot}
  faviconSrc={tab.favicon}
  selected={activeTabId === tab.id}
  onSelect={() => setActiveTabId(tab.id)}
  onClose={() => closeTab(tab.id)}
/>
```

The host owns selection and removal. `previewSrc` and `faviconSrc` default to
the design artwork; pass `null` when absent. `selectLabel` / `closeLabel` allow
distinct accessible names for duplicate titles. Selecting and closing are sibling
native buttons, so close cannot trigger selection and both support the keyboard.

Library → Navigation → Tabs contains a single-card Overview and individual
Rest / Selected examples. The Overview shares List Card's right-side controls;
on narrow canvases these move above the preview. Only the State control changes
selection. Library artwork is inert: clicking the card or its close icon does
nothing. Screen hosts may connect selection and close callbacks once their
interactions are specified; Recent currently keeps its tab cards passive.

The shared Segoe UI fallback does not reproduce the unavailable Segoe Sans
variable font's intermediate 550 weight exactly. This component uses the same
font strategy as the existing library.
