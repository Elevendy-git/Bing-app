# Homepage scrolled state QA

Design: `x2wnQRhqdGBZcsouyMMQUV`, node `6233:27220`. Checked 2026-10-13.

## Evidence

- `figma-reference.png`: original Figma frame, 393 × 852.
- `implementation.jpg`: Storybook Scrolled story at 393 × 852, Light.
- `dark.jpg`: same story using existing Bing dark tokens.
- `workbench.jpg`: Home group with both states and in-place enlargement.
- `geometry.json`: browser measurements and successful image loading.

| Element | Figma | Browser |
| --- | --- | --- |
| Search | x16, y62, 361 × 56 | x16, y62, 361 × 56 |
| Rewards | x20, y138, 140 × 84 | x20, y138, 140 × 84 |
| Lead article | x20, y238, 353 × 315.37 | x20, y238, 353 × 315.37 |
| Carousel article | x20, y565.37, 353 × 347.37 | x20, y565.37, 353 × 347.37 |
| Event cards | 160 × 276 | 160 × 276 |
| Background | #f1f4f8 | rgb(241, 244, 248) |

The original first screen was rechecked after scrolling back: search x16/y394/361 × 64,
Rewards x20/y522. Scrolling down retains the same search value and pins search at y62.
Native horizontal scrolling moved the event row from scrollLeft 0 to 323. No page-level
horizontal overflow at 393 px. Shared status and footer components remain in use.

Opening the scrolled screen in a closed native dialog initially clamped its scrollTop to
zero. A one-time ResizeObserver now waits for scrollable layout before restoring 384.
Reopening the modal in the browser confirmed scrollTop 384 and “Bing Search”; Escape
returns to the gallery. A regression test reproduces the hidden-layout clamping case.

## Checks and limits

- Production build / TypeScript / token contract passed.
- Four Homepage regression tests passed, covering input/footer persistence, initial
  scrolled state, sticky threshold, nested scroll isolation, and hidden-dialog restoration.
- Existing search, feed, and workbench tests: 18 passed.
- Original Figma media is local. Beach bytes match the first-screen asset exactly.
- Exact Segoe Sans variable font remains unavailable. Current fallback yields visible
  differences in text metrics/weight; this is not a pixel-identical font reproduction.
- Dark mode uses existing theme values; only the Light scrolled frame was supplied.
- Five carousel positions repeat the single supplied article fixture. Figma's repeated
  headline and `3herror` text are retained. Navigation destinations remain prototypes.
