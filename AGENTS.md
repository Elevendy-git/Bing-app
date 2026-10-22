# Bing App Workbench

## Motion

Before adding or changing any motion, read `docs/motion.md`.
Use an analogous iOS 27 interaction where documented, or an established iOS
interaction when no version-specific reference exists. Check Apple HIG,
UIKit/SwiftUI documentation or WWDC material before choosing parameters.
Record the source, the native interaction being referenced, and which values
are published by Apple versus tuned for this web prototype. Never label
approximate web timings as exact iOS system constants.

Keep reusable parameters in `src/motion/iosMotion.ts`. Preserve continuity when
an animation reverses, respect reduced motion, and check the result in the phone
prototype. Explicit user/Figma motion specifications take precedence.
