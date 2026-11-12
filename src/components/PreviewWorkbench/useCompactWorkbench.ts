import { useNativeKeyboardMode } from "../IOSNative/KeyboardEnvironment";

/** Keep this breakpoint in sync with the workbench's compact CSS layout. */
export function useCompactWorkbench() {
  return useNativeKeyboardMode();
}
