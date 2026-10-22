import type { Transition } from "motion/react";

/** iOS-inspired defaults, not fixed UIKit timing constants. Explicit design values win. */
const settle = [0.32, 0.72, 0, 1] as const;

// Apple WWDC23 “Animate with springs”: smooth = bounce 0 (critical damping).
// 320 ms is our tuned perceptual duration, not an iOS DisclosureGroup constant.
// Keep physical parameters so interrupted Motion springs preserve velocity.
const disclosureFrequency = 2 * Math.PI / 0.32;

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
  disclosure: { type: "spring", mass: 1, stiffness: disclosureFrequency ** 2, damping: 2 * disclosureFrequency },
  disclosureReveal: { type: "tween", duration: 0.22, ease: "easeOut" },
  disclosureHide: { type: "tween", duration: 0.14, ease: "easeOut" },
  disclosureSymbol: { type: "tween", duration: 0.12, ease: "easeOut" },
  // WebView-style estimated loading: only a real document load completes the bar.
  // These timings are prototype tuning; UIProgressView does not publish a fixed curve.
  webProgressPending: { type: "tween", duration: 8, ease: [0.16, 1, 0.3, 1] },
  webProgressAdvance: { type: "tween", duration: 0.22, ease: "easeOut" },
  webProgressFade: { type: "tween", duration: 0.18, delay: 0.22, ease: "easeOut" },
  instant: { duration: 0 },
} satisfies Record<string, Transition>;
