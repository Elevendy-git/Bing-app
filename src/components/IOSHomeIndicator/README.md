# iOS Home Indicator

Shared portrait safe area from Apple's iOS 27 UI Kit, node `106:60032`.
The component reserves 34 px and centers a 144 × 5 bar 8 px from the bottom.
`appearance` follows the containing theme unless overridden. `visible={false}`
hides the bar while preserving its safe area. `placement="overlay"` anchors it
to the bottom of a positioned parent without adding layout height.

ScreenFooter uses inline placement; Search uses one stationary overlay outside
its sliding keyboard. Library exposes an Indicator control; appearance follows
the workbench setting.
See [the native component guide](../../../docs/ios-native.md).
