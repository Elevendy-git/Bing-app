# InPrivate Search QA — 2026-10-14

Historical Bing Figma check. OS chrome is now standardized on iOS 27;
see [the current OS QA](ios-native-qa.md) for keyboard and safe-area dimensions.

Source: Bing App Shareout `yClrtwNrFJhE7W5waPRmkv`, nodes
[`1:20449`](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20449),
[`1:20428`](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20428),
[`1:20441`](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20441).

Read all three design contexts and screenshots. Visually compared the working
Prototype in the in-app browser and the enlarged passive Keyboard key screen.
DOM measurements below normalize the workbench's device scale to 393 × 852.

| Element | Figma | Measured |
| --- | --- | --- |
| Empty, keyboard-hidden composer | x16, y62, 361 × 56 | matched |
| Empty, keyboard-visible composer | x14, y62, 361 × 56 | normalized to x16 per mode-switch feedback |
| Typed composer | x16, y62, 361 × 56 | matched |
| Empty intro, keyboard hidden | x0, y285, 393 × 282 | matched |
| Empty intro, keyboard visible | x−1, y166, 393 × 282 | matched |
| Explanation paragraphs | 345 wide, 80 + 8 + 40 high | matched |
| Suggestion card | x20, y130, 353 × 280 | matched |
| Keyboard | x0, y516, 393 × 336 | matched |
| InPrivate background / composer | #151a28 / #282d3e | matched in Light and Dark workbench themes |

The existing Search Box, AppList/Card, Switcher and IOSKeyboard compose the flow.
The original 64 × 64 Incognito SVG was exported from `1:20435` because its Code
Connect name is missing from the installed Fluent package. White status icons
are original Figma assets. Existing keyboard and favicon assets are reused;
all newly added assets resolve locally in development and production builds.

Browser checks passed: toggle On and Off with the keyboard open without blur;
preserve Weather when toggling; restore regular theme/content when Off; Escape
dismisses the keyboard and moves the intro; typing restores the keyboard and
shows the supplied suggestions; return to Home; reopen Search with fresh local
state. All six Search key screens appear; enlarged private artwork is passive.
No new browser errors appeared after resolving the unavailable icon import.

Automated checks: 91 tests across 17 files passed, including private toggling,
focus/query/keyboard retention, clear/dismissal, three passive presets and
Prototype return/reset. `npm run build` passed TypeScript, token contract and
Vite production bundling. `git diff --check` passed.

Known inherited differences: the original Segoe Sans variable font is unavailable;
the shared Segoe UI fallback affects intermediate weights and label width. The
status bar retains the previously selected One Copilot geometry. Prototype uses
system time, while Key screens use 9:41. This flow implements the supplied UI;
it does not submit queries or provide backend private-browsing guarantees.

## Homepage integration follow-up

C2 `1070:59188` now connects the existing private Avatar to the shared prototype
mode. The earlier local-mode reset is superseded: Search's query resets on Back,
but Private Mode persists across Home/Search/Recent until the user switches it off.
The new Home key screen uses the same composition.

Browser measurements: avatar x24/y70, 40 × 40, #282d3e; icon x32/y78,
24 × 24, #e5ebfa. Weather and composer bounds/colors matched the normal Homepage
baseline. Reused the mapped `Incognito24Filled` through Avatar, with no new assets.
The existing weather artwork and other Homepage assets remain as before.
All 92 tests and the production build pass, including mode persistence, restoring
the profile avatar after switching Off, and preserving Homepage scroll/focus.

## Search Box alignment correction

The supplied private keyboard-empty frame contains a 2 px horizontal offset.
After feedback that the field should stay still when toggling modes, every
Search state now uses x16/y62, 361 × 56. The previous x14 transform is removed.
The measured width and height were already identical in both modes; the bug was
the whole field (including text and icons) shifting horizontally. Header height,
internal control spacing and HP/SP navigation motion remain shared.
