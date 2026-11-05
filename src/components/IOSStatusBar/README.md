# iOS Status Bar

The default phone chrome follows Apple's [iOS 27 UI Kit](https://www.figma.com/community/file/1651309003795292092/ios-and-ipados-27),
node `5465:16807`. See [the native component guide](../../../docs/ios-native.md)
for reference provenance and adaptations.

Height is 62 px, camera reservation 125 × 37, time 17/22 px SF Pro weight 590.
The original combined indicators SVG is rendered at 85.329 × 13 and masked with
`currentColor`. `appearance` follows the containing theme by default;
`tone="light"` retains compatibility for screens explicitly requiring white.
`showDynamicIsland` is enabled only in standalone Library previews, since
PhonePreview already supplies the physical camera cutout.

`time` defaults to 9:41 for fixed design specimens. `timeSource="system"` reads
the computer's local clock and the browser locale's 12/24-hour convention, without
a day-period label. All live instances share one clock and one minute-boundary
timer. Focus, page restoration, visibility and language changes resynchronize it;
the last live instance releases the timer and listeners. The browser locale is
used because a webpage cannot read a separate OS 12/24-hour preference directly.
Each PhonePreview supplies an independent overlay context. Status typography
resets inherited font features so Search and Homepage use the same SF Pro glyphs.
Signal, Wi-Fi and battery artwork remain simulated; this web preview does not
access native iPhone system chrome or its device telemetry.

Compact/Expanded/Minimal Live Activity support is retained from
[One Copilot](https://github.com/gim-home/one-copilot-mobile-template), using the
existing region slots, Wi-Fi/battery vectors and scoped SF Pro asset. Provide
`dynamicIsland` or `dynamicIslandFeatureHost`, not both. Activities start at y=11;
compact/minimal reserve 230 px and expanded owns the status row. This preserved
activity implementation is separate from the updated iOS 27 default chrome.

Library → OS Native → iOS Status Bar has one Overview with a State control;
appearance follows the workbench setting. The actual Prototype uses the plain
status bar with system time.
