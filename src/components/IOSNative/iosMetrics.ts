/** Apple iOS 27 portrait references, adapted horizontally to the containing mobile canvas. */
export const IOS_METRICS = {
  statusBarHeight: 62,
  bottomSafeArea: 34,
  keyboardHeight: 332,
  keyboardSuggestionsHeight: 25,
} as const;

export type IOSAppearance = "auto" | "light" | "dark";

export function getIOSKeyboardHeight(showSuggestions = true) {
  return IOS_METRICS.keyboardHeight - (showSuggestions ? 0 : IOS_METRICS.keyboardSuggestionsHeight);
}
