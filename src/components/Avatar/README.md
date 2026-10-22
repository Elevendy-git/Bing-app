# Avatar

Source: [C2 Bing App, node 3312:51594](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/C2-Bing-App-%E2%80%94-MAI-Style-Alignment?node-id=3312-51594).

Seven Figma variants are available in Library → Basics → Avatar:

| Size | Variants | Person icon | Initials |
| --- | --- | --- | --- |
| Default, 40 × 40 | Not signed in, Initials, Image, Private mode | 24 × 24 | 20 / 26 px, weight 650, opsz 36 |
| Large, 64 × 64 | Not signed in, Initials, Image | 28 × 28 | 24 / 28 px, weight 600, opsz 10.5 |

The source has no large Private mode variant. Private mode uses `Incognito24Filled`,
centered in a 40 px circle, with a fixed #282d3e surface and #e5ebfa icon.
Other variants follow the existing Consumer Light/Dark palette. Light initials use
#272320 at 40 px and the source's 219/255 black opacity at 64 px.
All variants have circular clipping and no visible border or shadow.

```tsx
<Avatar />
<Avatar variant="initials" initials="D" size="large" label="Ding" />
<Avatar variant="image" imageSrc={profileImage} label="Ding" />
<Avatar variant="private" />
```

`Avatar` is a visual identity with an accessible image label. A screen supplies any
button or navigation wrapper and its behavior. Standard span attributes, `className`,
and inline `style` are forwarded. The default image and letter match the source.

`assets/avatar.jpeg` is the original 480 × 480 image fill, SHA-1
`9bdea023affb649ac582430c0ba3545a78e65f5d`. The same image was previously owned by
Homepage; it now lives here, and Homepage reuses `<Avatar variant="image" />`.
InPrivate Homepage reuses `<Avatar variant="private" />` from title-bar reference
C2 `1070:59188`, with the same 40 px slot and surrounding Homepage layout.
No screenshot or temporary Figma asset URL is used by the component.

The exact Segoe Sans variable font is still unavailable. Initials use the existing
shared Segoe UI fallback, so their glyph shape and intermediate weight may differ.
Library groups by size and wraps the variant comparisons at narrow widths.

Validation: production build, token validation, and 15 existing
Homepage/workbench tests pass. Browser checks confirm all seven native dimensions,
24/28 px centered icon slots, Light/Dark colors, loaded original image, and 393 px
Library wrapping without horizontal overflow. Homepage keeps its 40 px avatar at
x=24/y=70 inside the 393 × 852 screen.
