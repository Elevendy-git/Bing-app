import type { Transition } from "motion/react";
import "./iosMotion.css";

/** iOS-inspired defaults, not fixed UIKit timing constants. Explicit design values win. */
const settle = [0.32, 0.72, 0, 1] as const;

// Apple WWDC23 “Animate with springs”: smooth = bounce 0 (critical damping).
// 320 ms is our tuned perceptual duration, not an iOS DisclosureGroup constant.
// Keep physical parameters so interrupted Motion springs preserve velocity.
const disclosureFrequency = 2 * Math.PI / 0.32;
// Voice Memos-style live feedback; 200 ms response is web tuning, not an Apple constant.
const waveformFrequency = 2 * Math.PI / 0.2;

export const iosMotion = {
  navigation: { type: "tween", duration: 0.42, ease: settle },
  // A scroll gesture has already settled before snapping; start from rest
  // instead of reusing navigation's high initial velocity.
  scrollSnap: { type: "tween", duration: 0.32, ease: [0.22, 0, 0.2, 1] },
  // Follow the field, then settle at the same 420 ms endpoint as navigation.
  navigationContent: { type: "tween", duration: 0.32, delay: 0.1, ease: settle },
  keyboard: { type: "tween", duration: 0.35, ease: settle },
  sheet: { type: "tween", duration: 0.42, ease: settle },
  fade: { type: "tween", duration: 0.2, ease: "easeOut" },
  control: { type: "tween", duration: 0.2, ease: settle },
  // HIG Motion + UIKit batch updates: short feedback, coordinated layout, no bounce.
  pageFade: { type: "tween", duration: 0.16, ease: "easeOut" },
  listCollapse: { type: "tween", duration: 0.24, ease: settle },
  itemExit: { type: "tween", duration: 0.14, ease: "easeOut" },
  carousel: { type: "spring", mass: 1, stiffness: 460, damping: 43 },
  scene: { type: "tween", duration: 0.28, ease: settle },
  toast: { type: "tween", duration: 0.22, ease: settle },
  disclosure: { type: "spring", mass: 1, stiffness: disclosureFrequency ** 2, damping: 2 * disclosureFrequency },
  voiceWaveform: { type: "spring", mass: 1, stiffness: waveformFrequency ** 2, damping: 2 * waveformFrequency },
  // WebView-style estimated loading: only a real document load completes the bar.
  // These timings are prototype tuning; UIProgressView does not publish a fixed curve.
  webProgressPending: { type: "tween", duration: 8, ease: [0.16, 1, 0.3, 1] },
  webProgressAdvance: { type: "tween", duration: 0.22, ease: "easeOut" },
  webProgressFade: { type: "tween", duration: 0.18, delay: 0.22, ease: "easeOut" },
  instant: { duration: 0 },
} satisfies Record<string, Transition>;

/** Existing contextual-menu geometry, shared by every anchored menu host. */
export const iosMenuMotion = {
  expanded: { scale: 1, y: 0 },
  collapsed: { scale: 0.96, y: -4 },
};

/** Device-pixel gesture tuning; not a published UIScrollView threshold. */
export const iosFeedGesture = { tapSlop: 6 };

/** Web gesture tuning for double-tapping Shift; Apple documents behavior, not this interval. */
export const iosKeyboardInteraction = { doubleTapWindowMs: 300 };

/** Preserve the Figma dots at rest; sound extends them inside the existing 40 px slot. */
export const iosVoiceWaveform = { barCount: 12, restHeight: 8, maxHeight: 24 } as const;

/** CSS color-only transitions follow the same presets as the composed motion. */
export const iosMotionCss = {
  "--gnrc-motion-fade": `${iosMotion.fade.duration}s ease-out`,
  "--gnrc-motion-scene": `${iosMotion.scene.duration}s cubic-bezier(${settle.join(",")})`,
};
