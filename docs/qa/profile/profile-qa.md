# Profile QA

Implemented from C3 nodes 3467:9216 (initials), 3587:13894 (photo), and 3825:20937 (signed out).

## Validation

- Production build, TypeScript, and token validation passed.
- 39 tests passed across Profile, BingAppPrototype, Homepage, AppHeader, and AppList. Coverage includes name/email initials, Unicode names, image failure/replacement, signed-out content, and entry/back focus and scroll preservation.
- Browser: Homepage avatar opens Profile and Back returns. Three Key screens presets open successfully. Light and global dark appearances inspected; browser error log was empty.
- Measured at 402 × 874: content x=20, width=362; avatar y=92, size=64; signed-in dashboard y=240/h=106; signed-out promo y=218/h=128; General card y=404/h=224; Preferences card y=686/h=112; all card radii=20.
- Original assets loaded successfully: photo 64 × 64, three Rewards SVGs 24 × 24, background SVG 743 × 616 at y=-168, gift-card artwork 130 × 122 at x=252/y=221. Artwork stays at original logical size while the card fills the device width.
- No intrinsic screen border radius, extra footer, duplicate home indicator, or local appearance controls.

The supplied references are light-mode designs. Dark mode uses the existing shared palette and a subdued version of the original backdrop. Account and Rewards values remain design fixtures; sign-in and the remaining menu destinations await their specified flows.

## History and Bookmarks entry follow-up

- Profile now opens the shared History and Bookmark screens. Profile remains mounted and inert underneath; Back restores the matching entry and original scroll position.
- Nested bookmark folders and Search from empty History retain the correct return path. Deletions share the same data as Recent, and reopening from Recent resets the return destination to Recent.
- Build and 26 relevant tests passed across Profile, History, Bookmark, and prototype navigation. Both entry/back round trips were also verified in the browser.
