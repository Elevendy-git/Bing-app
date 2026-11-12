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
| Feed bottom-sheet presentation / dismissal | 420 ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Supporting fades | 200 ms | ease-out |
| Direct control feedback / switch thumb | 200 ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Root destination / Search content-category crossfade | 160 ms | ease-out |
| List row / section removal | 240 ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Departing row artwork | 140 ms | ease-out |
| Feed carousel settling | Physical spring, no fixed duration | mass 1, stiffness 460, damping 43 |
| Wallpaper / scroll-background color transition | 280 ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Follow / Unfollow toast presentation | 220 ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Collection layout spring | 320 ms perceptual response, plus settling tail | Critically damped spring, bounce 0 |
| IAB estimated request progress | Up to 8 s toward the pending cap | cubic-bezier(0.16, 1, 0.3, 1) |
| IAB progress advance / completion | 220 ms | ease-out |
| IAB completed progress fade | 180 ms after the 220 ms fill | ease-out |

These are iOS-inspired web timings, not UIKit constants. Navigation and control
transitions settle without elastic overshoot. Homepage and Search content retain
the platform's native vertical edge bounce with `overscroll-behavior-y: contain`;
scrolling stops at the phone container instead of chaining to the workbench.
Keep pinned search fields, headers, footers and keyboards outside that scrolling
surface so they do not bounce with the content. Keep related content and safe-area changes synchronized,
and allow reversals to continue from the current animated value. The feed
bottom sheet slides from the bottom while its backdrop fades independently.
Additional sheet gestures still require an explicit interaction design.

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

## IAB webpage navigation

The web preview keeps the App chrome fixed while replacing the web document.
The native analogy is [WKWebView.goBack](https://developer.apple.com/documentation/webkit/wkwebview/goback())
and its back-forward list, alongside
[WKWebView.estimatedProgress](https://developer.apple.com/documentation/webkit/wkwebview/estimatedprogress).
Rechecked Apple's documentation on 26 October 2026: it specifies back-forward
navigation and normalized progress from 0 to 1, resetting on a new navigation.
It does not publish a fixed slide duration or progress curve for this case.

No page-slide timing is added. New documents use the existing estimated loading
stages above; Back/Forward restore the retained document and its scroll position.
Recent and Search transitions retain the existing shared `iosMotion` presets.
All stage values and animation durations remain prototype tuning, not iOS 27
system constants. Existing reduced-motion behavior remains in force.

## SERP → Homepage Back

Per the user's requested direction, SERP's Back button pops the whole result
screen to the right, revealing Homepage underneath. Checked
[UINavigationController.popViewController(animated:)](https://developer.apple.com/documentation/uikit/uinavigationcontroller/popviewcontroller(animated:))
and [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
on 26 October 2026. Apple documents restoring the previous navigation controller
and purposeful, brief, interruptible motion; it does not publish a fixed duration
or curve here. The direction is the user's specification. Reuse the existing
420 ms `iosMotion.navigation` curve as web-prototype tuning, not an iOS 27 constant.

Translate the retained result surface from 0 to 100% of its own width, without
fading its content during the slide. Reveal Homepage immediately underneath at
its preserved scroll position. Outgoing controls become inert immediately. Only
the App surface moves: the shared iOS status bar and home indicator remain fixed
above both screens during the return, avoiding duplicate moving system artwork. Only
after the slide completes, hide the surface and reset its transform for future
navigation; keep the iframe mounted. A reversal continues from the current
translation and cancels the previous completion. Reduce Motion skips translation.
The Home icon and SERP ↔ Recent keep their existing root fades. Webpage Back/Forward
inside the IAB retain their existing document navigation.

## Search history list

The simplified Search page uses vertical AS-style history rows. Reference
[UICollectionView.performBatchUpdates](https://developer.apple.com/documentation/uikit/uicollectionview/performbatchupdates(_:completion:)):
Apple documents grouped insertions, deletions and moves, including interrupted
completion. It does not publish a fixed duration or curve for this interaction.
Rechecked this documentation when replacing the chip layout on 23 October 2026.

Reuse `itemExit` (140 ms fade) and `listCollapse` (240 ms height collapse) for a
removed row. Collapse in flow so the card edge and following rows move together,
without scaling the row's text or compensating for the phone preview's zoom.
Retain the existing 200 ms edit-control crossfade and final-section collapse.
These are tuned web-prototype values, not exact iOS 27 constants. Departing rows
are inert immediately; reduced-motion and passive previews are instant.

The C2 deletion states `475:25871` and `400:18480` retain the keyboard while
editing and removing individual rows, then dismiss it when Clear all presents
the alert. Rechecked [Apple HIG: Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
and [UIKeyboardLayoutGuide](https://developer.apple.com/documentation/uikit/uikeyboardlayoutguide)
on 23 October 2026. The native analogy is a modal confirmation with coordinated
keyboard layout. Reuse the existing 350 ms keyboard transition, 200 ms alert
fade/control transition and the same fade for the InPrivate strip. No new timing
is introduced; these remain web tuning, not published iOS 27 constants. Pointer
actions in the edit controls preserve input focus until the modal is requested.
The background stays inert through dismissal and the home indicator stays above
the scrim; passive Key screens do not animate or acquire keyboard focus.

The previous YML/trending disclosure controls have been removed with those
sections. The shared non-bouncy disclosure spring is still used by Tabs.

## Recent search filtering

Checked [Apple HIG: Searching](https://developer.apple.com/design/human-interface-guidelines/searching)
and [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
on 26 October 2026. The native analogy is live in-app filtering with predictive
suggestions. Apple recommends suggestions while typing and avoiding extra motion
on frequent interactions; it does not publish a duration for Recent filtering.
Update matches immediately on each keystroke and on Clear, without replaying the
240 ms deletion/section collapse or fading the entire content. The existing
deletion motion still applies when browsing unfiltered Recent. This adds no
new timing constant, preserves rapid reversal and is also instant under Reduce
Motion. Navigation from a result reuses the existing root-screen crossfade.

Recent also reuses Search page's 350 ms `iosMotion.keyboard` transition for
focus/blur and scroll dismissal. Checked Apple's
[UIKeyboardLayoutGuide](https://developer.apple.com/documentation/uikit/uikeyboardlayoutguide)
and [UIScrollView.KeyboardDismissMode.onDrag](https://developer.apple.com/documentation/uikit/uiscrollview/keyboarddismissmode-swift.enum/ondrag)
on 26 October 2026. These document reserving the keyboard's occupied space and
dismissal when dragging begins, not a published duration or easing curve. The
existing 350 ms curve remains web-prototype tuning. Keyboard translation and
result-content space share that transition. Per the user's explicit correction
on 26 October, the empty illustration and text remain anchored to the full
canvas; remove their keyboard-dependent offset without adding another motion.
Keep the same mounted surface so refocusing reverses from its current position;
reduced motion uses `instant`. Footer controls behind the keyboard are inert,
and the single home indicator stays outside the translating surface. Physical
keyboard Escape and vertical wheel/touch input dismiss without erasing the draft.

## Recent History overflow menu

Checked [Apple HIG: Menus](https://developer.apple.com/design/human-interface-guidelines/menus)
and [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
on 26 October 2026. The native analogy is a contextual menu opened from a row's
More control. Recent reuses History's menu component and existing 200 ms
`iosMotion.control` fade/scale, with the same 0.96 scale and 4 px offset.
These are existing web-prototype values, not published iOS 27 constants.
Reuse the current row/section collapse on Delete; filtered results still update
immediately. Outside dismissal and Escape release the background only after
exit, and a removed trigger returns focus to the content. Reduced motion skips
translation/scale and uses `instant`; passive previews do not open a menu.

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

The Search content's first 8 px is a clip, not an independently painted cover.
The InPrivate strip also stays transparent above the single page background.
This avoids compounding two translucent surfaces into a pale stripe during
the existing fade. The 26 October rendering fix preserves all motion parameters
and content spacing; it adds no timing or curve.

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

## App motion audit — October 2026

Scope: existing interactive Prototype flows and the explicitly interactive
Library previews. No new routes, swipe-to-delete actions, or sheet detents are
introduced. Passive Library specimens and Key screens remain static.

Additional references checked before choosing parameters:

- [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion):
  purposeful, brief feedback, gesture-consistent direction, interruptibility,
  and avoiding unnecessary animation on frequent interactions.
- [Apple HIG: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets):
  a temporary modal task that preserves the underlying context.
- [UICollectionView.performBatchUpdates](https://developer.apple.com/documentation/uikit/uicollectionview/performbatchupdates(_:completion:)):
  coordinate collection insertions, deletions and moves.
- [WWDC23: Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/):
  non-bouncy springs and preserving continuity during interruption.
- [iOS & iPadOS 27 release notes](https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes):
  the SwiftUI resolved issue concerning `fullScreenCover`, `navigationTransition`
  and `FocusState` describes a jarring two-step presentation when the keyboard
  waits for the page transition. This supports synchronized presentation; it
  does not specify a keyboard duration or curve.

Apple publishes the behaviors above, **not the timing values in this file**.
All durations, offsets, spring coefficients and drag thresholds here are tuned
for this web prototype. There is no claim of exact iOS 27 system constants.

| Area | Audit result and implementation | Native analogy |
| --- | --- | --- |
| Homepage hero, docking and return Home | Keep the requested 30% snap, continuous shared scroll sample, sticky profile/weather and 24 px separation. Preserve interruptible settling; pinned controls never receive edge bounce. Centralize background/color fades. | UIScrollView settling; HIG gesture-consistent motion |
| HP ↔ SP and SERP ↔ SP | Keep the shared composer, icon crossfade and synchronized 420 ms keyboard in both directions. Preserve the subtle content rise finishing on the same timeline. | UISearchController, UIKeyboardLayoutGuide; iOS 27 keyboard fix |
| Search modes and suggestions | Crossfade history, private explanation and AS at 160 ms. Own opacity as a continuous MotionValue so reviving a departing mode cannot leave it transparent. Do not replay entrance on every query keystroke. Keep field geometry fixed. | Brief contextual feedback; interruptible transitions |
| Search keyboard gestures | Only a predominantly vertical scroll dismisses the keyboard. Horizontal swipes, small touch noise and pinch/trackpad zoom do not. Refocusing reverses the current dismissal. | Scroll-view keyboard dismissal |
| Search history | Fade and collapse deleted list rows in flow, coordinating the card edge and sibling movement. Keep edit-control crossfades. | Collection batch updates |
| Home / Recent / SERP root navigation | Add a short 160 ms crossfade while preserving screen instances, scroll positions and result iframes. Inactive destinations are immediately inert. | Non-directional contextual change; HIG brevity |
| Profile, Tabs, History, Bookmark and folders | Retain forward push / reverse return, focus restoration and mounted parent state. No additional tab-style lateral navigation. | Navigation stack push/pop |
| Tabs grid and Recent tab strip | Fade departing card art, then move surviving cards into the vacated space. Grid measurements divide out workbench zoom. A strip collapses width without stretching card content. Move focus to the next card or New tab. | UICollectionView batch updates |
| History / Bookmark rows and Recent sections | Fade and collapse rows in normal flow over 240 ms, without scaling text. Remove empty sections and transition to supplied empty artwork. | Table/collection row deletion |
| Menus, history alert and feed sheet | Departing controls become inert immediately. Keep the background blocked through exit and restore focus afterward. Cancel stale close callbacks on reopen or unmount. Feed sheet slide and backdrop fade are independent; taps on the backdrop still dismiss. | Native modal ownership and temporary sheets |
| Follow / Unfollow toast | Use a short 220 ms entrance/exit after the sheet closes. Outgoing Undo is inert, and an old toast timer cannot dismiss a replacement. Preserve existing timeout and hover/focus pause. | Brief status feedback; HIG motion principles (custom Bing toast, not an Apple toast API) |
| Feed multi-card carousel | Replace the CSS tween and per-frame React drag updates with a MotionValue and non-bouncy spring. Re-grabbing starts at the currently drawn position and settles relative to the visible page. Normalize drag distance for phone zoom; initial selection and canvas resize land directly. | Direct manipulation, paged scrolling, interrupted springs |
| Footer, app controls and OS elements | Keep established selected/pressed feedback and Switcher thumb motion. Status bar and home indicator stay stable; do not animate the clock or every loaded feed image. Existing optional Dynamic Island artwork remains unchanged. | Standard controls; avoid excessive frequent motion |

SERP ↔ Recent references UIKit's
[UIView.AnimationOptions.transitionCrossDissolve](https://developer.apple.com/documentation/uikit/uiview/animationoptions/transitioncrossdissolve):
dissolve from one view to the next. Apple documents the transition type, not a
duration for this flow; the existing 160 ms `iosMotion.pageFade` remains prototype
tuning. Homepage stays mounted but unpainted under SERP, including Search opened
from SERP, and throughout both directions of the SERP/Recent transition. Only
its own Home/Search/Profile stack reveals it. Otherwise the two partially
transparent destination layers expose an unrelated wallpaper mid-transition.
Keep the existing interruptible fades, reduced-motion behavior and iframe state.

The carousel retains a 12 px gap, a swipe threshold of `min(56 px, 18% of
viewport width)`, and 0.28 edge resistance. These are prototype gesture tuning,
not UIScrollView's private rubber-band or deceleration constants. Pointer motion
is direct; only release/pagination uses the shared settling spring.

For article opening, checked UIKit's
[UIScrollView.canCancelContentTouches](https://developer.apple.com/documentation/uikit/uiscrollview/cancancelcontenttouches)
and [delaysContentTouches](https://developer.apple.com/documentation/uikit/uiscrollview/delayscontenttouches)
on 27 October 2026. The native analogy is a paged scroll view cancelling a content
tap when scrolling takes over. Defer pointer capture until a horizontal drag and
suppress article navigation after a moved or cancelled gesture. The 6 device-pixel
tap slop in `iosFeedGesture` is web-prototype tuning, not an Apple-published
threshold. Article opening reuses the existing IAB navigation and carousel
settling presets; it adds no duration or curve. Reduced motion retains the
existing instant branches. Image/headline buttons are only active when the host
supplies both an article URL and an open callback; passive specimens stay passive.

New transitions use `useReducedMotion`; CSS color transitions are disabled for
passive/reduced-motion hosts. Existing navigation, keyboard, disclosure, progress
and scroll-snap reduced-motion behavior is retained. Native scroll elasticity
remains browser/platform dependent; no fake bounce is added to pinned UI.

Regression checks cover returning to a fading mode, modal ownership and stale
focus callbacks, carousel initial/resize layout and re-grabbing at 50% zoom,
reduced-motion carousel selection, keyboard gesture direction, deletion flows,
and preserved activity/network state. Browser verification uses the 402 × 874
phone prototype; timing tests wait for visible completion instead of assuming
that animated changes disappear in the same synchronous render.

## Activity empty states

Recent, Tabs, History and Bookmark use their supplied Figma artwork and copy.
After the last bookmark is deleted, reuse the existing `iosMotion.fade` (200 ms)
for the empty message alongside the collection removal. This follows the
[Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
guidance on brief contextual feedback and the collection batch-update analogy
above. The duration is existing web-prototype tuning, not a published iOS 27
constant. Keep passive previews and reduced motion instant. Empty artwork is
anchored to the full phone canvas, so keyboard presentation does not recenter it.

The 27 October component consolidation shares `ActivityEmptyState` across all
four screens and `AnchoredMenu` across their menu hosts. Rechecked
[Apple HIG: Menus](https://developer.apple.com/design/human-interface-guidelines/menus)
and [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion).
The analogy remains a contextual menu and brief empty-state feedback. Preserve
the existing 200 ms fade/control presets and 0.96 scale / −4 px menu pose,
centralizing the latter in `iosMenuMotion`. These are existing prototype tuning,
not published Apple constants; no duration or curve changes. Reduced motion uses
the expanded pose and instant transition. Keep background ownership until exit,
restore focus only after unlocking, and skip restoration into inactive screens.

## Keyboard state and double tap

Keyboard state changes (letters/numbers/symbols/emoji, Shift, Caps Lock and
prediction replacement) update directly, without replaying keyboard presentation.
Checked [Apple's onscreen-keyboard guide](https://support.apple.com/guide/iphone/type-with-the-onscreen-keyboard-iph3c50f96e/ios)
on 27 October 2026: it documents double-tap Shift for Caps Lock but publishes no
tap interval. `iosKeyboardInteraction.doubleTapWindowMs` is 300 ms of web-prototype
gesture tuning, not an iOS system constant. No animation curve or duration is
added; existing presentation/dismissal presets and reduced motion are unchanged.

## Detail navigation system chrome and location editing

Checked [UIViewController.childForStatusBarStyle](https://developer.apple.com/documentation/uikit/uiviewcontroller/childforstatusbarstyle),
[UISearchController](https://developer.apple.com/documentation/uikit/uisearchcontroller)
and [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
on 27 October 2026. UIKit delegates status-bar styling to the active controller;
the analogous web implementation keeps one status bar fixed above Profile,
Tabs, History and Bookmark while their content pushes/pops. Screen-local status
bars retain their layout space and background but hide their artwork. Retain
the fixed bar through the entire exit and any reversal, including nested detail
pages; release it after the last detail exits. Private Search keeps white status
artwork when opened above a detail screen. Passive isolated screens are unchanged.

Location editing uses the currently displayed webpage URL (or current search
query) in both the outgoing field artwork and the editable field. The retained
document is restored on cancellation. These corrections preserve the existing
420 ms navigation and 200 ms artwork fade, plus reduced-motion behavior; they add
no parameters. Apple documents behavior and motion principles, not these web
durations or exact iOS 27 animation constants.

## Demo account confirmation

Checked [Apple HIG: Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
and [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
on 28 October 2026. The native analogy is a user-initiated modal confirmation:
clearly named actions, cancellation, brief feedback and no background interaction
while it is presented. Reuse Search's existing confirmation surface and its
`iosMotion.fade` / `iosMotion.control` 200 ms fade and 0.96-to-1 scale, extracted
into `ConfirmationDialog`. These are existing web-prototype values, not Apple
system constants; no duration or curve is added or changed. Reduced motion uses
the existing instant preset. Keep the background inert through exit and restore
focus afterward. Account state changes directly behind the departing dialog;
do not add an artificial network delay, keyboard presentation or success overlay.

## Profile → Settings

Checked [UINavigationController.pushViewController(_:animated:)](https://developer.apple.com/documentation/uikit/uinavigationcontroller/pushviewcontroller(_:animated:))
and [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
on 28 October 2026. Settings is the next page in Profile's navigation stack:
push it in from the right and pop it out to the right, retaining the underlying
Profile and its scroll position. Reuse `iosMotion.navigation` (420 ms,
cubic-bezier(0.32, 0.72, 0, 1)) and the existing fixed system-chrome layer.
Apple documents stack behavior, optional animation, interruptibility and reduced
motion; the duration and curve are existing prototype tuning, not published iOS
27 constants. No parameter is added or changed. Reduced motion uses `instant`.
The keyed presence layer can reverse from its current translated position.
Covered/departing screens are inert, and finishing the pop restores focus to
Profile's Settings row without scrolling the retained parent.

## Feed carousel direction ownership — 3 November 2026

Rechecked [UIScrollView.isDirectionalLockEnabled](https://developer.apple.com/documentation/uikit/uiscrollview/isdirectionallockenabled)
and [UIGestureRecognizerDelegate.gestureRecognizerShouldBegin](https://developer.apple.com/documentation/uikit/uigesturerecognizerdelegate/gesturerecognizershouldbegin(_:))
before correcting diagonal feed drags. The native analogy is a horizontal paging
recognizer that only begins after horizontal intent wins; a vertical gesture
continues scrolling the containing feed. Apple's directional-lock documentation
describes general axis locking (and explicitly permits diagonal motion without
a lock); it does not prescribe this nested-carousel arbitration threshold.

The web carousel now resolves its direction after the existing 6 device-pixel
tap slop, before changing the track position. Horizontal displacement must exceed
vertical displacement; ties belong to the feed. Once resolved, that direction
owns the remainder of the press, so a vertical drag cannot turn into a page
change. A stationary tap or vertical gesture resumes any interrupted settling
target without changing the selected slide. Horizontal re-grabs still start at
the drawn position, and moved/cancelled presses cannot open articles.

The 6 px slop, `min(56 px, 18% of viewport width)` paging threshold, 0.28 edge
resistance and existing `iosMotion.carousel` spring remain web-prototype tuning,
not Apple-published constants. No animation duration, curve or spring parameter
changes. Workbench scale normalization and reduced-motion behavior are retained.

## Search history keyboard focus — 3 November 2026

Checked [Apple HIG: Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards)
and [UIFocusEnvironment.preferredFocusEnvironments](https://developer.apple.com/documentation/uikit/uifocusenvironment/preferredfocusenvironments).
The native analogy is maintaining a useful focus target when a keyboard-operated
control disappears. Edit transfers to Done, Done returns to Edit, and removal
transfers to the next surviving row (or the previous last row). Removing the last
row returns focus to the search field. Transfer only if the disappearing control
owned focus; pointer actions continue preserving input focus and the keyboard.
Do not restore into inactive screens or take focus after the user moved elsewhere.
The existing control and row-removal motion is unchanged. Apple specifies focus
behavior rather than timings here; no new duration, curve or system constant is
introduced.

## Voice Search — 3 November 2026

Checked [UIModalPresentationStyle.fullScreen](https://developer.apple.com/documentation/uikit/uimodalpresentationstyle/fullscreen),
[UIModalTransitionStyle.coverVertical](https://developer.apple.com/documentation/uikit/uimodaltransitionstyle/coververtical),
[Apple HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality)
and [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion).
The native analogy is a dedicated full-screen modal task, covering the current
page rather than pushing a new level in its navigation stack. Apple explicitly
documents `coverVertical` as sliding up from the bottom when presented and back
down when dismissed. Preserve the underlying page, draft and scroll position;
keep it inert through dismissal and restore focus to the initiating control
after the overlay releases it.

Reuse `iosMotion.navigation` (420 ms) for the full-screen presentation and its
reverse, `iosMotion.sheet` (420 ms) for the language picker, `iosMotion.fade`
(200 ms) for supporting fades and `iosMotion.keyboard` (350 ms) for independent
keyboard dismissal. The navigation, sheet and keyboard presets share
cubic-bezier(0.32, 0.72, 0, 1); the fade uses ease-out. These are existing web
prototype timings and curves, not published UIKit or iOS 27 constants. Do not
wait for the keyboard to finish hiding before presenting Voice Search. A
reversal continues from the currently drawn position and cancels stale exit
callbacks. Reduced motion uses `iosMotion.instant` without translation. Keep
the shared status bar and home indicator stationary above the moving content;
do not animate duplicate screen-local system artwork.

The language chooser references [Apple HIG: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
and [UISheetPresentationController](https://developer.apple.com/documentation/uikit/uisheetpresentationcontroller):
a scoped task related to the current context, with explicit dismissal and a
temporary modal owner. Slide it from the bottom while fading its backdrop
independently, then restore focus to the language control. Apple documents
detents, grabbers and vertical dismissal; this prototype does not add a drag
gesture or new detents without an explicit interaction design.

For listening and transcription, checked Apple's iOS 27 sample
[Recognizing speech in live audio](https://developer.apple.com/documentation/speech/recognizing-speech-in-live-audio)
and [SFSpeechRecognitionRequest.shouldReportPartialResults](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/shouldreportpartialresults).
The native analogy is live transcription with preliminary text refined by final
results. Update transcript text directly rather than replaying entrance motion
for each result. A successful recognition end or explicit completion owns
submission; cancellation stops capture and discards late results. Changing the
recognition language first cancels the previous session. Native Speech APIs are
behavioral references here; browser speech recognition is not Apple's engine.

The waveform follows the user's requested speaking motion, using the native
analogy of [Voice Memos recording feedback](https://support.apple.com/en-euro/guide/iphone/iph4d2a39a3b/27/ios/27).
Apple's [AVAudioRecorder metering](https://developer.apple.com/documentation/avfaudio/avaudiorecorder/ismeteringenabled),
[updateMeters()](https://developer.apple.com/documentation/avfaudio/avaudiorecorder/updatemeters())
and [averagePower(forChannel:)](https://developer.apple.com/documentation/avfaudio/avaudiorecorder/averagepower(forchannel:))
document measuring actual input power (dBFS), not a prescribed waveform animation.
Apple publishes no Siri/iOS 27 bar-height, response, smoothing or easing constants
for this UI. Do not describe this as an exact Siri animation.

During actual recognition listening, an independent local Web Audio analyser
samples the microphone, gates background noise with RMS and supplies 12 frequency
band levels to the waveform. The bars retain the Figma 5 px width, 6 px gaps and
8 px resting height, growing to at most 24 px inside the existing 40 px slot.
`iosMotion.voiceWaveform` is a critically damped spring with a tuned 200 ms
response (`mass = 1`, `stiffness = (2π / .2)²`, `damping = 2 × 2π / .2`).
Retarget the same MotionValues instead of restarting keyframes; reversals preserve
position/velocity. The listening-to-input 8 px offset uses the existing 200 ms
control transition while retaining the same 12 bars. These sizes, spring values,
FFT size, frequency range, gate and gain are prototype tuning, not Apple values.

Silence naturally settles to the original dots. Covers/exits freeze the drawn
pose before releasing capture; error states do not animate. Per
[HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility),
Reduce Motion keeps static dots with the existing text feedback and skips the
extra audio capture. Passive Key screens keep their static Figma artwork.
No random or transcript-timer animation substitutes for missing audio levels.

The independent visual analyser does not record, upload or play audio, and does
not claim to use the recognition service's identical input processing. The
[Media Capture specification](https://www.w3.org/TR/mediacapture-streams/) permits
multiple tracks sharing an input; concurrent browser services can still vary in
support. If analysis is unavailable/denied/suspended, retain static feedback and
let recognition proceed. Meter values never decide when to submit a search.
Only enable it after the browser reports recognition listening. Cancel, language
selection, a hidden document or leaving the workbench Prototype view stops its
tracks, RAF and AudioContext. Late permission results are stopped immediately;
returning to a foreground page never restarts capture without a new user action.

Checked [Apple HIG: Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy)
and [SFSpeechRecognizer.requestAuthorization](https://developer.apple.com/documentation/speech/sfspeechrecognizer/requestauthorization(_:)).
Request microphone or speech access only after the user activates the feature.
Show honest states for unavailable recognition, denied permission, missing
microphone, no speech and connection failure. Closing Voice Search, switching
language or leaving the active app cancels the old session so a late callback
cannot submit a query or reopen the interface. Do not simulate a successful
recording, transcript or network response.

## IAB browser actions and Find on page — 9 November 2026

Rechecked [Apple HIG: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets),
[UISheetPresentationController](https://developer.apple.com/documentation/uikit/uisheetpresentationcontroller),
[Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
and [UIModalTransitionStyle.coverVertical](https://developer.apple.com/documentation/uikit/uimodaltransitionstyle/coververtical).
The native analogy is a contextual action sheet above the current browser page:
present from the bottom, dismiss downwards, retain the underlying document and
keep background interaction blocked until the dismissal finishes. Apple publishes
the direction, modal ownership, detents and dismissal behavior; it does not
publish an exact iOS 27 timing or easing constant for this menu.

Browser and Feed menus use the same sheet presentation, `iosMotion.sheet`
(420 ms, cubic-bezier(0.32, 0.72, 0, 1)), independent `iosMotion.fade` backdrop
(200 ms, ease-out) and overlay-presence ownership. These existing values are
web-prototype tuning. No new duration, curve or spring is introduced. Reversing
the sheet retains its drawn position, reduced motion uses `iosMotion.instant`,
and dismissal restores focus after the page becomes available. A subsequent
local task starts after the previous menu releases its modal ownership.

Find on page keeps the current document mounted and reuses the existing Search
input and keyboard. The keyboard references the earlier keyboard interaction
and uses `iosMotion.keyboard` (350 ms, the same settle curve), with instant
presentation for reduced motion. Query changes, match counts and highlights
update directly; selecting a match scrolls immediately rather than starting a
new smooth-scroll animation on each keystroke. Highlighting is scoped to the
active snapshot and clears when the task closes or the document is covered.

The Find keyboard enters by growing its spacer from zero while sliding upwards
with the same keyboard preset. Task dismissal retains the Find footer while
its root height collapses using `iosMotion.keyboard` and its opacity uses
`iosMotion.fade`; the child keyboard spacer does not also collapse on exit.
The presence guard disables departing controls until the host releases the
footer and restores focus. Reopening reverses the retained root from its drawn
position. Reduced motion applies `iosMotion.instant` to both paths. These are
reused web-prototype parameters, not new Apple-published system constants.

Clipboard, native share and opening the default browser begin directly within
the initiating click because browser APIs can require transient user activation;
they do not wait for the sheet exit animation. Clipboard success feedback follows
the resolved API result, and cancelling native sharing produces no success toast.
Browser API behavior is governed by the web platform, not an iOS timing constant.


## Compact workbench and native input — 12 November 2026

Rechecked [Apple HIG: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
and [UISheetPresentationController](https://developer.apple.com/documentation/uikit/uisheetpresentationcontroller).
The analogy for the mobile Inspector is a scoped modal task over the retained
workspace, with a dimmed background and an explicit close action. Apple documents
sheet anatomy, modal ownership, detents and dismissal; these sources do not publish
an exact iOS 27 presentation duration or easing curve. The web sheet reuses
`iosMotion.sheet` (420 ms) for translation and `iosMotion.fade` (200 ms) for the
independent scrim. These are existing web tuning, not Apple system constants.
There is no grabber because this version does not implement a drag gesture/detents.
Retarget the same MotionValues on reversal, retain native dialog inertness through
exit, cancel stale exit callbacks, and restore launcher focus after release.
Reduce Motion uses `iosMotion.instant` with no translation.

Compact live inputs use the browser/device keyboard, referencing
[Apple HIG: Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards)
and [UIKeyboardLayoutGuide](https://developer.apple.com/documentation/uikit/uikeyboardlayoutguide).
Native keyboard motion is owned by the browser/OS; the prototype adds no imitation
keyboard timing or extra 332 px spacer on these devices. VisualViewport changes
update available layout directly. Existing accessory/footer transitions retain
the shared presets, and Recent's empty illustration retains its resting canvas
position. Desktop and passive specimens keep the existing simulated keyboard.
Browser support and permission/focus rules can vary; desktop responsive QA cannot
establish exact iPhone Safari keyboard behavior.

Homepage geometry now references the measured unscaled canvas height, preserving
its current hero progress or feed position when resized. Checked
[Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
and [UIScrollView](https://developer.apple.com/documentation/uikit/uiscrollview).
The analogy is preserving scroll context when the available viewport changes.
The 332 px travel/63 px Glance gap at 874 px, smaller-height clamps and 30% snap
threshold are web prototype spatial tuning. Existing 320 ms settling, curves,
interruptibility and reduced-motion behavior are unchanged. No Apple-published
scroll or keyboard animation constant is inferred.
