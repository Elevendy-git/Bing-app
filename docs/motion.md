# Motion defaults

For every new or modified motion, first find an analogous iOS 27 interaction
with documented behavior. When version-specific guidance is unavailable, use
an established iOS interaction. Consult Apple HIG, UIKit/SwiftUI documentation
or WWDC material before choosing the curve and parameters. Record the native
analogy, the source link, and which values are published versus tuned for this
web prototype. Do not present inferred timings as exact iOS system constants.

User/Figma specifications take precedence. Keep shared presets in
`src/motion/iosMotion.ts` instead of adding one-off durations to each screen.
The earlier presets below remain prototype approximations; this policy does
not retroactively make them Apple-specified parameters or require unrelated
animations to be rewritten.

| Motion | Default duration | Easing |
| --- | --- | --- |
| Navigation / shared element | 420 ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Homepage scroll settling | 320 ms | cubic-bezier(0.22, 0, 0.2, 1) |
| Navigation content entrance | 320 ms after 100 ms delay | cubic-bezier(0.32, 0.72, 0, 1) |
| Keyboard during navigation | 420 ms, synchronized with the shared field | cubic-bezier(0.32, 0.72, 0, 1) |
| Independent keyboard presentation / dismissal | 350 ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Future bottom-sheet presentation / dismissal | 420 ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Supporting fades | 200 ms | ease-out |
| Direct control feedback / switch thumb | 200 ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Discovery section expand / collapse | 320 ms perceptual response, plus settling tail | Critically damped spring, bounce 0 |
| Discovery content reveal / hide | 220 ms / 140 ms | ease-out |
| Discovery eye symbol crossfade | 120 ms | ease-out |
| IAB estimated request progress | Up to 8 s toward the pending cap | cubic-bezier(0.16, 1, 0.3, 1) |
| IAB progress advance / completion | 220 ms | ease-out |
| IAB completed progress fade | 180 ms after the 220 ms fill | ease-out |

These are iOS-inspired web timings, not UIKit constants. Navigation and control
transitions settle without elastic overshoot. Homepage and Search content retain
the platform's native vertical edge bounce with `overscroll-behavior-y: contain`;
scrolling stops at the phone container instead of chaining to the workbench.
Keep pinned search fields, headers, footers and keyboards outside that scrolling
surface so they do not bounce with the content. Keep related content and safe-area changes synchronized,
and allow reversals to continue from the current animated value. A future
bottom sheet should slide from the bottom with its backdrop fading in; its
actual gestures and states still require a supplied interaction design.

Respect `prefers-reduced-motion`: skip translation and use the instant preset.
Key screens and passive Library variants remain static. Explicitly interactive
Library previews, including the Switcher overview, use the shared presets.
Existing explicitly specified motion is preserved until the user asks to change it.

## IAB search loading

The supplied Bing iOS screenshot places a thin blue line inside the bottom of
the search capsule. Use a 2 px line, clipped by the existing capsule radius,
without changing field width, height or surrounding spacing.

The native analogy is a WebView navigation progress bar, using
[WKWebView.estimatedProgress](https://developer.apple.com/documentation/webkit/wkwebview/estimatedprogress)
and animated [UIProgressView updates](https://developer.apple.com/documentation/uikit/uiprogressview/setprogress(_:animated:)).
[Apple HIG: Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)
describes feedback as transient and distinguishes determinate from indeterminate
work. Apple documents normalized progress and completion behavior, but does not
publish a fixed Safari/Bing easing curve or duration for this interaction.

This HTML-snapshot prototype has request and iframe lifecycle events, not
WebKit's byte/subresource progress. The line therefore indicates estimated
stages, with no percentage exposed to assistive technology: start at 12%, ease
toward a 70% cap while awaiting the response, then advance toward 86% when valid
HTML is mounted. Only the current iframe's load event targets 100%. Completion
fills over 220 ms and fades over the next 180 ms. Pending easing, stage values
and durations are prototype tuning, not iOS 27 constants or measured bytes.

The line never repeats or automatically reports completion while still waiting.
Failure removes it; Retry starts a new instance. A new query cancels the old
request and resets the line. Retarget fills from their current position without
bounce. Reduced motion changes values instantly and hides completed progress
without delay. Library's Loading state is a static 36% specimen.

## Search discovery disclosure

The You might like and What’s trending eye controls reference the native
disclosure pattern: keep the section header present, reveal or hide its body,
and let following content move with the changing layout. The eye control itself
and the final states come from the supplied Figma design.

Sources:

- [Apple HIG: Disclosure controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls)
- [SwiftUI Animation.smooth](https://developer.apple.com/documentation/swiftui/animation/smooth)
- [WWDC23: Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/), especially non-bouncy springs, interrupted animations, and the physical-parameter discussion around 19:26.
- [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)

Apple defines smooth as a spring without bounce and describes preserving
position and velocity when an animation is interrupted. Apple does not publish
a DisclosureGroup-specific 320 ms timing in these references. Our 320 ms response
and the 220/140/120 ms fades are prototype tuning, not iOS 27 constants.

For Motion's physical spring, use mass 1, angular frequency `2π / 0.32`,
stiffness approximately 385.53, and damping approximately 39.27. This gives
critical damping and a short settling tail rather than a hard 320 ms cutoff.
Keep the physical form so retargeting can carry the current velocity. Fade
content out faster than the layout settles; reveal it as the body opens.
Crossfade the two eye symbols without rotating or scaling them.

Measure the full inner body with `ResizeObserver`, using unscaled layout
dimensions. Animate only the outer viewport height and inner opacity. Keep
text and images at their original size, retain mounted content and loaded
resources, and avoid `auto` height remeasurement during rapid reversals. Hidden
content becomes inert immediately. Reduced motion and passive previews use
instant transitions. Verify both short and tall lists, an interrupted reversal,
and the surrounding layout on the current phone canvas.

## Homepage scroll settling

The downward hero gesture settles into Shareout `1:20253` once the search field
has travelled at least 30% of its 332 px path (scrollTop ≥ 99.6). Once touch is
released and vertical scrolling has been idle for 60 ms, animate the native scroll
position to 384 over 320 ms. This aligns search at y=62, Glance cards at y=138, and feed
at y=238. Search and cards read the same animated scroll position each frame.
Settling starts from rest with a gentler acceleration than the navigation curve.
Update the composited search transform directly, without reconciling the feed
on every frame. Disable native scroll anchoring so changing the Glance variants
cannot correct the scroll position while it is being animated.

The composer shrinks from 64 to 56 px over the final 96 px of its travel
(scrollTop 236–332), using smoothstep progress with flat endpoints. Its height
and position read the same scroll sample; there is no separate height transition
after docking. Reverse input retraces those sizes immediately. Only crossing
the dock boundary updates React's compact/card state.

Profile and weather remain sticky inside the 332 px hero, with 16 px bottom
padding. Search starts pushing their 56 px row out when its remaining travel is
72 px (scrollTop 260). The row's 8 px bottom inset plus the hero padding keeps
a 24 px visible gap between the controls and search as they move upward together.
This is native sticky positioning, so manual scrolling, automatic settling and
reverse gestures share the same continuous path without another timed animation.

Below 30%, keep the user's position. Past the 384 px destination, feed
scrolling stays free. Do not snap upward gestures or programmatic restoration.
Reverse wheel input, a new touch, leaving Homepage or unmounting interrupts the
settling immediately. Native edge bounce remains enabled. Reduced motion lands
at the same destination without animation. The supplied Figma node specifies
the destination layout but contains no motion parameters.

## SERP ↔ Search

Reference the native search-activation pattern described by
[UISearchController](https://developer.apple.com/documentation/uikit/uisearchcontroller)
and [Apple HIG: Searching](https://developer.apple.com/design/human-interface-guidelines/searching).
Coordinate the field and reserved keyboard space as described by
[UIKeyboardLayoutGuide](https://developer.apple.com/documentation/uikit/uikeyboardlayoutguide).
These sources document search presentation/dismissal and layout following the
keyboard, but do not publish a Bing/Safari or iOS 27-specific transition curve.
The existing 420 ms navigation curve and 200 ms artwork fade are prototype
tuning, not Apple system constants.

Measure the actual SERP field inside its mounted screen, dividing out workbench
zoom. At 402 px the endpoints are 332 × 48 and 370 × 56, both at x=16, y=62.
Interpolate the field's height and reserved trailing space without scaling text
or icons. Crossfade the existing Bing/microphone and back/clear artwork while
both share the animated geometry. The underlying SERP field is concealed during
the handoff, so only the traveling composer is painted. Keep the same navigation
curve for the keyboard, field and keyboard space in both directions.

Submission explicitly targets the measured SERP composer, including when Search
was entered from Homepage or Recent; it must not animate back toward Homepage.
Keep focus on submit and let the navigation exit own keyboard dismissal. On
cancel, retain the result iframe, its scroll position and its request state.
Only a new submission (including the same query) starts a fresh results load.
Outgoing Search is inert, and inactive SERP is inert while Search is open.
Retarget existing values on reversal; reduced motion lands instantly. Passive
Key screens and Library states retain their original dimensions and artwork.

## Homepage → Search

Homepage stays mounted underneath Search. On entry, measure the actual search
composer, including its current scroll offset and height. Normalize those
measurements by the phone preview's scale, then move the Search composer from
that position to y=62 and height=56 in the device's local coordinates. Conceal
the Homepage composer during the transition so there is one visible field.
Crossfade the actual Homepage field artwork with the Search field during the
first 200 ms, in both directions. The original artwork stays inert and hidden
from accessibility navigation. Interpolate both layers' icon widths and text
insets on the same 420 ms timeline as the field so the camera, microphone and
placeholder stay aligned; there must be no icon swap after landing. Return to
the measured Homepage height, including intermediate sizes in its scroll-driven
collapse, because navigation freezes the underlying Homepage position.

Content rises 12 px while fading in after a 100 ms lead by the field. Its 320 ms
entrance uses the same easing and ends at the same 420 ms point as navigation,
preserving the subtle upward movement without a separate finishing animation.
Content exit has no delay, so rapid reversals remain responsive. Background
and InPrivate fade in. The keyboard and its reserved space use the same 420 ms
timing and easing as the field, on both entry and return. Independent focus,
Escape and scroll dismissals retain the 350 ms keyboard preset. Keep one
stationary `IOSHomeIndicator` above the keyboard. The shared iOS 27 keyboard
travels 332 px, while the 34 px bottom safe area and indicator geometry stay fixed.

Back reverses the transition before releasing the Homepage. Pressing the back
control preserves input focus until activation, so blur cannot start dismissing
the keyboard before navigation. Ignore focus changes on an outgoing screen;
its navigation exit owns the keyboard dismissal. Inactive/outgoing
screens are inert and hidden from accessibility navigation. Restore focus to
Homepage content without scrolling or reopening Search. The Homepage scroll
position survives; each new Search visit starts with an empty query.
