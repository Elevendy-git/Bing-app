import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { getIOSKeyboardHeight } from "./iosMetrics";

/** A compact live preview uses the browser/device input system. Passive canvases do not. */
export const COMPACT_INPUT_QUERY = "(max-width: 900px)";
const NativeKeyboardContext = createContext(false);

function subscribe(callback: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(COMPACT_INPUT_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const clientSnapshot = () => typeof window.matchMedia === "function" && window.matchMedia(COMPACT_INPUT_QUERY).matches;
const serverSnapshot = () => false;

export function useNativeKeyboardMode(enabled = true) {
  const compact = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return enabled && compact;
}

export function NativeKeyboardProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const nativeKeyboard = useNativeKeyboardMode(enabled);
  return <NativeKeyboardContext.Provider value={nativeKeyboard}>{children}</NativeKeyboardContext.Provider>;
}

/** Native keyboards resize/cover the browser viewport; never reserve a simulated keyboard too. */
export function usePrototypeKeyboard(showSuggestions = true) {
  const nativeKeyboard = useContext(NativeKeyboardContext);
  return { nativeKeyboard, keyboardHeight: nativeKeyboard ? 0 : getIOSKeyboardHeight(showSuggestions) };
}
