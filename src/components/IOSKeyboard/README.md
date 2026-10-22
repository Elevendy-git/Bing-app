# iOS Keyboard

Shared mobile keyboard based on the [official iOS 27 UI Kit](https://www.figma.com/community/file/1651309003795292092/ios-and-ipados-27).
Source geometry, assets and web-material limitations are documented in
[the native component guide](../../../docs/ios-native.md).

The keyboard fills the device width (currently 402 px) and is 332 px high with
suggestions and 307 px without.
Keys are 43 px high with 11 px row gaps. Original exported glyphs retain their
intrinsic dimensions. Letter keys use scoped SF Compact; other native labels
use SF Pro.

The host controls `appearance`, `layout` (uppercase/lowercase/numeric),
`returnKey` (return/search/done), `showSuggestions`, and `showHomeIndicator`.
`onType`, `onDelete`, and `onReturn` are optional. Without callbacks, keys render
as passive artwork. Shift, numeric switch, emoji, dictation and suggestions do
not introduce independent interactions. Library uses the side controls for keyboard
states; appearance follows the workbench setting.

Search supplies the existing character/delete handlers and renders its own
stationary `IOSHomeIndicator`, setting `showHomeIndicator={false}` here to avoid
a duplicate or moving indicator during keyboard presentation.
