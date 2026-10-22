# iOS 27 native components — 2026-10-14

Reference: [Apple UI Kit and source nodes](../ios-native.md).
Checks run against the Vite workbench at http://127.0.0.1:5174/.

These measurements record the earlier 393 × 852 baseline. Current device layout
is covered by [iPhone 18 Pro adaptation QA](iphone18-layout-qa.md).

## Library

- OS Native contains Status Bar, Keyboard and Home Indicator; each has one Overview.
- At 1440 px viewport width the state controls sit to the right. At the default
  narrow viewport they wrap above the artwork without clipping the 393 px preview.
- Light keyboard visually compared with the 393 px Figma instance screenshot.
  Dark/lowercase artwork inspected in the browser; all keyboard image assets load.
- Keyboard artwork has no buttons in Library. Side controls switch case/numeric
  layout, appearance, return label, suggestions and home indicator visibility.
- Keyboard height is 332 px with suggestions and 307 px without.
- Status Bar is 393 × 62. Existing Compact/Expanded Live Activity previews render.
- Home Indicator safe area remains 34 px when its bar is hidden. Its visible bar
  is 144 × 5 with an 8 px bottom inset.

## Screen integration

Measured in local 393 × 852 phone coordinates:

| Element | Normal Search | InPrivate Search |
| --- | --- | --- |
| Composer | x16, y62, 361 × 56 | same |
| Keyboard | x0, y520, 393 × 332 | same |
| Indicator | x124.5, y839, 144 × 5 | same |
| Indicator instances in Search | 1 | 1 |
| Keyboard surface | #bfc2c6 | #262626 |

Keyboard taps produced `We`; Delete returned `W`, preserving input focus.
Switching InPrivate keeps the field and keyboard mounted. Back returns to
Homepage with the private avatar; the third footer entry opens Recent.
Recent footer is x0/y766, 393 × 86; New tab retains its 20 px gap above the footer.

Navigation timing was not changed by this update: field, keyboard and reserved
space still share the existing navigation preset. No claim of measured native
UIKit animation timing is made.

## Automated validation

- `npm run build`: passed (token check, TypeScript and Vite).
- `npm test`: 18 files, 94 tests passed.
- Added regression coverage for passive Library keyboard previews and changing
  variants through controls; Search retains one stationary indicator through
  keyboard dismissal/refocus and mode changes.
- `git diff --check`: passed.

The keyboard material uses the documented opaque web approximation. Return-key
text variants and existing Live Activity slots are not pixel-diff certified.
