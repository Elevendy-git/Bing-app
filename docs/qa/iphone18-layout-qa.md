# iPhone 18 Pro layout — 2026-10-14

Checked in the workbench at http://127.0.0.1:5174/ using the in-app browser.
Screen size follows [Apple's specifications](https://www.apple.com/iphone-18-pro/specs/):
1206 × 2622 pixels at @3x, represented by 402 × 874 CSS pixels.

The first adaptation used an illustrative SVG frame. It has since been replaced
by the supplied Figma library's original 450 × 920 artwork; see
[Figma frame and clipping QA](iphone18-figma-frame-qa.md). Screen layout
measurements below remain applicable because the content bounds stay 402 × 874.

## Measured layout

Measurements below are in screen coordinates, normalized for workbench scaling.

| Element | Position | Size |
| --- | --- | --- |
| Homepage search, top | x16 / y394 | 370 × 64 |
| Homepage search, pinned at bottom scroll | x16 / y62 | 370 × 56 |
| Search composer, regular and InPrivate | x16 / y62 | 370 × 56 |
| Recent search | x16 / y62 | 370 × 48 |
| Homepage lead feed | x20 / y622 | 362 × 320.33 |
| Recent History card | x20 / y398 | 362 × 198 |
| Search You might like card | x20 / y378 | 362 × 168 |
| Search keyboard | x0 / y542 | 402 × 332 |
| Home / Recent footer with safe area | x0 / y788 | 402 × 86 |
| Recent New tab | x326 / y712 | 56 × 56 |
| Home indicator | x129 / y861 | 144 × 5 |

Existing 24 px spacing is preserved. Homepage Avatar starts at x24; Recent and
Search section titles start at x24 (20 px container plus 4 px title offset).
InPrivate introduction has 24 px horizontal padding. Card internals and OS
keyboard spacing retain their original values. Glance, Tab and Event carousels
keep intrinsic card widths rather than stretching individual cards.

## Browser checks

- Normal and InPrivate Search have identical composer and keyboard geometry.
  Each Search has one home indicator. Keyboard taps produce `We`; Delete leaves `W`.
- Back returns to Homepage; the third footer destination opens Recent.
  Existing navigation and keyboard animation presets were not changed.
- Homepage search remains at y62 with a 370 px width after scrolling to the end.
  Feed cards, wallpaper crop, Light and Dark previews inspected in the new frame.
- All ten Key screens render a 402 × 874 logical screen. Thumbnails are 201 × 437;
  Search Keyboard opens at 402 × 874 in the enlarged desktop view.
- OS Native Library previews: Status Bar 402 × 62, Keyboard 402 × 332,
  Home Indicator safe area 402 × 34. Existing side controls remain available.
- Checked default narrow workbench and 1440 × 1040 desktop viewport. The device
  fits the available stage without exceeding 100% scale. Temporary viewport
  override was reset after checking.

## Validation

- `npm run build`: passed, including TypeScript and token checks.
- `npm test`: 18 files, 94 tests passed.
- `git diff --check`: passed.

Earlier 393 px Figma references and QA captures remain historical evidence;
they are not the current preview-device configuration.
