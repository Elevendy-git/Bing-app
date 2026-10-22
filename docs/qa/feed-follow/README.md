# Feed follow QA — 2026-10-22

Implemented the four C3 Figma screens: 3587:10791, 3577:21385, 3577:21801,
3587:11176. Reuses MenuList material/icons and adds FeedMenu and Toast to Library.

## Validation

- 66 tests passed across Homepage, live feed, FeedCard, Toast, Recent,
  BingAppPrototype, PreviewWorkbench and PreviewLibraryGroup.
- Production TypeScript/Vite build passed. Existing Vite deprecation and bundle
  size notices remain.
- Browser at localhost:5174: a live MSN card opens the menu for its actual
  publisher; Follow shows the matching toast; reopening shows Unfollow.
- Unfollow shows its matching toast; Undo restores the previous follow state.
  Shared publisher identity, independent topic identity and the active carousel
  slide target are covered by tests.
- Reset clears follow state. Follow is in-memory prototype state and does not
  change an MSN account or live feed recommendations.
- Background remains inert through the full sheet exit; attempted wheel scrolling
  left scrollTop unchanged at 389.5. Escape and scrim close the sheet; keyboard focus
  returns to its opener without moving the feed.
- Current 402 × 874 device: sheet width 390/height 394 with 6 px outside insets;
  top/bottom corners 34/58; rows 48; original icons 24. Toast width 370 with 16 px
  side insets and 16 px separation above the footer.
- Light/dark appearance and Library Type/State controls checked visually.
  The four static Key screens open through the existing enlarged preview.
- Library artwork remains passive; inactive carousel slides cannot receive focus.

## Screenshots

- `menu-light.png`: live publisher menu.
- `menu-dark.png`: followed publisher menu in dark mode.
- `followed.png`, `unfollowed.png`: prototype confirmations.
- `toast-library.png`, `menu-library.png`: component previews.
- `key-screen.png`: enlarged static menu design.
- `toast-width-16px.png`: updated responsive toast, measured at 370 px on the
  402 px device with 16 px on each side. Library measured at the same width;
  production build passed after the width correction. Earlier screenshots above
  retain the original spacing for the initial follow-flow review.

The original 393 px Figma background is adapted to the current device and existing
Homepage composition, including Sports. Text uses the existing project font stack;
the exact Segoe Sans variable font availability remains the existing limitation.
