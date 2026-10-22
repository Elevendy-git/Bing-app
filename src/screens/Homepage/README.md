# Homepage

Homepage composition for Figma `x2wnQRhqdGBZcsouyMMQUV`: first screen `5826:54329`
and scrolled screen `6233:27220`, with the pinned-header mask from `6233:28203`
and the updated search width from `6245:28594` (Composer `6245:28956`).

The page reuses IOSStatusBar, Avatar, BingSearchBox, GlanceCardGroup, FeedCard, AppFooter, and IOSHomeIndicator.

`feedSource="msn"` selects the live Prototype feed; the default `"preview"` keeps
the original Figma feed without requests. MSN supplies the article metadata and
photos, and the existing FeedCard renders them at the same widths and image ratio.
The carousel contains up to five distinct stories. Missing logos remain absent;
ads, widgets and video payloads are not represented as ordinary news articles.
Near the bottom, the live feed follows MSN's continuation and appends unique
stories. Tapping Home animates the existing scroll surface back to the hero,
synchronizing search position and preserving loaded cards and activity.
See [MSN news integration](../../../docs/msn-news.md) for caching and limitations.
It adds the title-bar layout, original weather artwork, wallpaper crop. `className` lets the screen size the existing search box, feed, and footer while
their Library examples retain their default widths. FeedCard's optional `mediaAspectRatio`
matches the homepage image's 312:172 ratio.

`privateMode` selects the existing `<Avatar variant="private" />`, following
C2 [title bar `1070:59188`](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/?node-id=1070-59188).
It is the sole Homepage visual difference: a 40 × 40 #282d3e circle with the
24 × 24 `Incognito24Filled` icon in #e5ebfa, positioned at x=24/y=70. The weather,
wallpaper, content, search and footer retain the regular Homepage composition.
`BingAppPrototype` owns the mode across Home/Search/Recent navigation. Turning
the SP switch off restores the image avatar. The setting is held in memory for
the current prototype; queries still reset when leaving Search.
Key screens includes `Homepage · InPrivate` using the same composition.

Dark mode adds a 5% `#000000` overlay above the wallpaper image and its gradients,
following the requested treatment for `5931:38142`. The overlay stays below all UI
content, follows explicit and system themes, and is transparent in light mode.

At the current 402 × 874 screen: status safe area 62, title bar y=62/h=56,
search x=16/y=394/w=370/h=64, glance first card x=20/y=522,
lead feed x=20/y=622/w=362, footer y=788/h=86 (52+34), using the shared iOS 27 bottom safe area.
The title bar retains its original 24 px horizontal padding. Search and feed
widths fill the device after their respective 16 px and 20 px insets.
The status bar and footer remain fixed while the page content scrolls. Profile and
weather stay at y=62 within the hero until scrollTop 260, when search is 24 px
below the visible controls. The hero's 16 px bottom padding combines with the
row's 8 px bottom inset to preserve that gap. Over the final 72 px of search travel, the hero pushes
the sticky title bar upward, clipping it at the status safe area as search docks.
Reverse scrolling restores the row along the same path, without a separate timer.
Glance scroll padding
preserves the 20 px inset during native scroll snapping and keyboard navigation.

The same page scrolls from its wallpaper hero into the compact search state.
Over scrollTop 236–332 the search smoothly shrinks from 64 to 56 px, reaching
its final height at the same moment it docks. Position and height update directly
from the same scroll sample, without rendering the feed each frame or running a
second height transition after arrival. A composited transform keeps the moving
field stable; native scroll anchoring is disabled on the content container.
The wallpaper and its dark overlay fade out together over 280 ms, revealing the
theme's solid feed background (`#f1f4f8` in light mode, `#1f2431` in dark mode).
Returning above that threshold fades the wallpaper back in; the status bar's color
and background transition with it. The search sits outside the native scrolling surface;
its vertical offset is clamped between 0 and 332 so bottom overscroll cannot move it.
The original 393 × 138 header mask is opaque through 94% of its height, then fades
to transparent over the last 8.28 px. Mask opacity also transitions over 200 ms.
Search keeps 16 px side insets in both states (370 px at the current 402 px width).
Reduced-motion preferences disable these transitions.
`initialState="scrolled"` positions the scrolled key screen at scrollTop 384: search
x=16/y=62/w=370/h=56, glance x=20/y=138, lead article x=20/y=238/w=362.
The original 393 px Figma measurements remain in the historical QA records;
feed height now responds to available width while preserving its image ratio.
Scrolling to 555 places the lead article behind the header at y=67.
The search input stays mounted, preserving its value; its placeholder stays
"Ask anything" in both states, matching the latest pinned-header design.
Preview initialization waits for a hidden dialog or view to receive a scrollable layout.
Both top and scrolled states reuse the same four glance cards in the same order:
Rewards, Sports, Create with AI, Money. Scrolling changes layout only; the cards
stay mounted and retain their horizontal scroll position.

Downward scrolling now settles into Shareout
[`1:20253`](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20253)
after the search crosses 30% of its path (99.6 px). Once the gesture ends and
scrolling is idle for 60 ms, the shared iOS-inspired 320 ms motion carries the
native scroll position to 384 with a gentle start from rest, synchronizing the
search and cards. Below 30%
the position stays put; feed scrolling beyond 384 remains free. Reverse input,
new touch and navigation interrupt settling. Preset restoration does not trigger
it, reduced motion skips the animation, and native content bounce is retained.

`HomepageFeed` composes the lead story, five-position carousel, Reddit ad, four horizontal
`FeedEventCard` components (160 × 276), and Yahoo article from the supplied node. Figma
only supplies one carousel story; all five positions currently reuse that fixture. The
article text, including duplicated copy and the `3herror` typo, follows the source file.
Publisher SVGs come from the original Medium and Yahoo components. Destinations for
profile/weather/search and articles remain outside this screen assembly.
The exact Segoe Sans variable font is still unavailable, as documented for Glance Card.

Assets:

- `wallpaper.png`: original Figma image fill, SHA-1 `93cacf4959087137e72cf2cc51de556b794000b3`.
  Uses the original crop matrix and gradients; image adjustments are translated to CSS filters.
- Avatar's `../../components/Avatar/assets/avatar.jpeg`: original 480 × 480 image used
  by `5931:39299`, rendered through the shared 40 × 40 Avatar component.
- `sunny.svg`: original 20 × 20 illustration from `I5931:39299;8:31090;97228:691320`,
  centered inside its 24 × 24 slot. The connected `./weather-icon` is absent locally.
- `feed-beach.png`: original image from `5826:54335`, displayed at 329 × 181.37.
- `feed-technology.png`, `feed-ad.png`, `feed-forgiveness.png`, and the three
  `event-*.png` images: original fills returned by the scrolled node's design context.
- `medium.svg` and `yahoo.svg`: exports of source components `3006:6826` and `3006:6848`.
- `search-header-mask.svg`: original 393 × 138 alpha gradient from `6233:28542`,
  refreshed after the design width changed from 390 to 393.

No full-screen Figma render or temporary Figma asset URL is used by the application.
See `docs/qa/homepage-scrolled-qa/` for the reference, rendered previews, and geometry.
See `docs/qa/homepage-header-qa/` for the updated mask and interaction checks.

## Feed actions

The Prototype enables `interactiveFeed`. Three-dot buttons on normal and carousel
feed cards open FeedMenu in an iOS-timed sheet; the current carousel slide supplies
its own publisher or explicit topic target. Follow state is shared by target identity
for the current prototype session, survives page navigation, and resets with the
workbench Reset button. It is not synced to the MSN account.

Follow/Unfollow closes the sheet and shows the reusable Toast above the footer;
Undo restores the preceding state. The background remains inert through the full
exit, scrolling/pagination pause, and focus returns to the original three-dot button.
The four `initialFeedOverlay` presets are passive Figma Key screens.
See [Feed follow QA](../../../docs/qa/feed-follow/README.md).
