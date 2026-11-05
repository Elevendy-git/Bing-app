# iOS native components

The mobile workbench uses Apple's **iOS and iPadOS 27** Figma UI Kit as the
reference for OS chrome. This first set contains phone Status Bar, Keyboard and
Home Indicator; it does not add iPad layouts or other system interactions.

- [Apple Design Resources](https://developer.apple.com/design/resources/)
- [Official Community UI Kit](https://www.figma.com/community/file/1651309003795292092/ios-and-ipados-27)
- [Reference copy](https://www.figma.com/design/lWfbayiZ9wCVNNQpxCFALX/)

Inspected on 2026-10-14. Original nodes: Status Bar `5465:16807`, dark status
`5466:17558`, uppercase keyboard `10462:23337`, lowercase `106:59544`, numeric
`10462:23835`, portrait Home Indicator `106:60032`. The keyboard's 393 px
reference instances are `12405:1718` (Light) and `12405:1802` (Dark).

## Shared sizing and appearance

The workbench uses a 402 × 874 iPhone 18 Pro screen with the original Black/Portrait
frame from the [supplied library](https://www.figma.com/design/MxaoGSDUvLJ58OvsXmRTLY/?node-id=12887-20848).
The kit's 402 px components keep their fixed margins, key gaps and
flexible slots; OS Native Library previews follow the same device width.
`IOSNative/iosMetrics.ts` supplies geometry used by motion;
`styles/ios.css` supplies matching CSS sizes and a separate OS palette.

| Component | Mobile geometry |
| --- | --- |
| Status Bar | 62 px height, 125 × 37 camera reservation |
| Keyboard | 332 px with suggestions, 307 px without |
| Keyboard keys | 43 px height, 8.5 px radius, 11 px row gaps |
| Home Indicator | 144 × 5, centered, 8 px above the bottom |
| Bottom safe area | 34 px |

`appearance="auto"` follows the closest workbench/screen theme. Library previews
follow the workbench's System / Light / Dark setting without a separate Appearance
control. Screens can still override appearance. InPrivate therefore gets Dark OS
controls without resizing the keyboard or composer. ScreenFooter combines the
52 px Bing footer with the 34 px safe area. Search renders one stationary
indicator outside the moving keyboard. Existing 420 ms navigation and 350 ms
independent keyboard timings remain in place; see [motion](motion.md).

## Library and reuse

Library → OS Native contains one Overview per component. State changes use the
right control panel, which moves above the artwork at narrow workbench widths.
The artwork stays passive. Keyboard previews cover uppercase, lowercase,
numbers, symbols, emoji, return labels, suggestions and indicator visibility.
Screens reuse the same exported components; callback-free previews stay passive.

In the Prototype, the shared keyboard switches alphabetic, numeric, symbol
and emoji layouts. Shift capitalizes one letter; double-tap locks uppercase;
another Shift tap unlocks it. The input layer preserves exact case, selection
replacement and whole-grapheme deletion. An empty field starts uppercase and
typing returns to lowercase unless Caps Lock is on. The local emoji palette
inserts real Unicode characters and supports the existing deletion policy.

Search and Recent share predictions from their current live Bing autocomplete
response. The first slot preserves the typed text; the next two use distinct
provider suggestions. Stale/loading/error results are not presented as current
predictions. Picking a slot fills the field and retains focus without submitting.
This is query completion, not access to Apple's native QuickType engine; the web
prototype cannot call that engine. Library example words remain static fixtures.

The microphone uses the browser's `SpeechRecognition` / `webkitSpeechRecognition`
when available, starting only on a user press. Final transcripts insert at the
caret with appropriate word spacing; interim text stays in the status strip.
Stop, errors, leaving the field/page and unmounting release recognition and
ignore late callbacks. Unsupported browsers and denied microphone access show
an explicit status. This relies on browser permissions and the browser's speech
service (which may process audio remotely), not Apple's dictation engine.
No audio is sent to or retained by this project's server.

Behavior references checked on 2026-10-27:

- [Apple: Type with the onscreen keyboard](https://support.apple.com/guide/iphone/type-with-the-onscreen-keyboard-iph3c50f96e/ios)
  documents Shift, double-tap Caps Lock and number/symbol switching.
- [UITextInputTraits.autocapitalizationType](https://developer.apple.com/documentation/uikit/uitextinputtraits/autocapitalizationtype)
  describes automatic Shift behavior; search fields here use initial-letter
  capitalization as prototype policy.
- [MDN: SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
  documents limited browser availability and server-based recognition in Chrome.

The existing Compact/Expanded Live Activity slots remain available in Status
Bar. Those variants and their Wi-Fi/battery glyphs originated in One Copilot;
this update does not claim that they have been rebuilt from the iOS 27 kit.

## Assets and web adaptations

Status indicators and keyboard Shift/Delete/Return/Emoji/Dictation are original
Figma SVG exports. A single status SVG is used as a mask so its tint can follow
the containing screen. SF Pro remains scoped to native controls; keyboard key
letters use the bundled Latin subset of SF Compact. Bing typography is unchanged.

The kit's layered luminosity/dodge/burn keyboard material is represented by an
opaque web fallback: Light #bfc2c6, Dark #262626, with translucent keys. This is
an HTML/CSS prototype, not UIKit rendering. Search/Done labels are configurable
web variants. Phone-shaped clipping belongs to the device preview container;
standalone keyboard artwork does not set device corner radii.
These adaptations should not be described as pixel-exact native material
or system behavior.
