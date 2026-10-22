# Figma iPhone 18 Pro frame — 2026-10-14

Source: [iOS and iPadOS 27, 12887:20848](https://www.figma.com/design/MxaoGSDUvLJ58OvsXmRTLY/?node-id=12887-20848).
Used the high-fidelity design context, its reference screenshot, and the original
PNG asset. Read-only Figma inspection confirmed that the component has zero
corner radius, zero smoothing and `clipsContent=false`; the physical outline
is encoded in its image child `12887:20871`.

## Asset and layout checks

- Original PNG: 1350 × 2760, 447742 bytes; rendered at 450 × 920 before scaling.
- SHA-256: `cb7b20a551c4fd63e794e1dd08ab0096816a12e72d38503f36a242550f07264c`.
- Content bounds: 402 × 874 at x24/y23 within the outer artwork, matching Figma.
- Derived device mask: 1206 × 2622, 22439 bytes, matching the source aperture.
  The mask leaves camera rendering to the unchanged original frame asset.
- Prototype uses the original local image; it loads at its expected natural
  size. No temporary Figma URLs remain in runtime code.
- Browser inspection confirms border-radius=0 on Homepage, Search and Recent.
  Device clipping is applied only by preview wrappers using the shared mask.
- All ten Key screen thumbnails use the same mask and measure 201 × 437.
  Enlarged InPrivate Search with keyboard follows the same outer contour.
- Inspected Homepage, Search and the enlarged keyboard view against the original
  frame contour: no corner gaps, rectangular spill or altered asset proportions.
- Search remains x16 with width370; keyboard is 402 × 332, with one indicator.
  Existing 16/20/24 px layout values were not changed in this update.
- Homepage → Search → Homepage navigation remains available. No console errors.

The former illustrative SVG was removed. Standalone Library keyboard examples
no longer inherit a phone bottom radius; the keyboard component retains its
own designed top corners.

## Validation

- `npm run build`: passed (token contract, TypeScript, Vite).
- `npm test`: 18 files, 94 tests passed.
- `git diff --check`: passed.
