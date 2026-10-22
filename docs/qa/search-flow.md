# Search Query flow verification

Historical Bing Figma check. OS chrome is now standardized on iOS 27;
see [the current OS QA](ios-native-qa.md) for keyboard and safe-area dimensions.

Date: 2026-10-14. Reference: Shareout 1:20487, 1:20495, 1:20502.

Compared all three enlarged Key screens with Figma at native 393 × 852.
Observed geometry in the browser:

| Element | x | y | Width | Height |
| --- | ---: | ---: | ---: | ---: |
| Search box | 16 | 62 | 361 | 56 |
| You might like card | 20 | 378 | 353 | 168 |
| Trending card | 20 | 604 | 353 | 432 |
| Suggestions card | 20 | 130 | 353 | 280 |
| Keyboard | 0 | 516 | 393 | 336 |

Thumbnails load locally at 24 × 24 (recommendations) / 84 × 48 (trending).
Suggestion favicons preserve the outside half-pixel stroke in centered 24 px
slots; keyboard assets retain their original sizes and positions. No temporary
Figma URLs are used at runtime.

Verified in Prototype: Homepage search entry, physical input, Weather suggestions,
clear, onscreen letter/delete keys, Escape dismissal and back navigation.
Automated coverage includes scroll retention, unrelated input, passive Key screen
presets and unchanged Library state controls. Full suite: 85 tests in 16 files.
Production build and token/type checks pass. The original Segoe Sans variable
font is unavailable; shared fallback typography has the pre-existing weight
difference. No result page or unspecified action has been added.
