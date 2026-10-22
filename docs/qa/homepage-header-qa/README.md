# Homepage pinned-header verification

Source: Figma `x2wnQRhqdGBZcsouyMMQUV`, node `6233:28203`, refreshed 2026-10-13.
The latest design changed the mask group and exported mask width from 390 to 393.
The original SVG is copied unchanged into the screen's local assets.

At the 393 × 852 viewport, the feed fixture starts at scrollTop 555:

| Element | Measured geometry |
| --- | --- |
| Search | x=17.5, y=62, width=358, height=56 |
| Mask | x=0, y=0, width=393, height=138 |
| Lead card | x=20, y=67, width=353, height=315.37 |

Figma's header uses an alpha mask, opaque through 94% and transparent at 100%;
the final 8.28 px gives the soft fade over passing content. It has no additional
background-blur effect. The existing search component retains its own backdrop blur.

Interaction checks:

- Native scrolling sampled intermediate search heights including 62.55, 60.26,
  58.46, and 56.79 before reaching 56. Computed transition: 200 ms cubic-bezier(.22,1,.36,1).
- At scrollTop 1485.5, continued native scrolling produced 32 samples with search
  y=62 and height=56 throughout. Search is outside the scrolling element.
- Returning to the top restored y=394 and height=64, retaining "weekend ideas".
- The enlarged Homepage · Scrolled preview correctly initialized at scrollTop 384.
- Light/Dark masking and the phone prototype were visually checked.
- `npm run build` passed, including the token contract and TypeScript checks.
- 17 targeted tests passed across Homepage, BingSearchBox, and PreviewWorkbench.

Evidence: `figma-reference.png`, `implementation.jpg`, `dark.jpg`, `bottom.jpg`, `prototype-bottom.jpg`,
and `interaction-metrics.json`. The mask uses semantic background colors in Dark.
The missing exact Segoe Sans variable font remains a known pre-existing difference;
this update does not claim full pixel equality for typography.
