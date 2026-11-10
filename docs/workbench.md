# Workbench maintenance

The maintained application is `src/main.tsx` → `src/App.tsx` → `PreviewWorkbench`.
Library, Key screens, and Prototype share the same components and themes.

## Code structure

- `src/App.tsx` connects the live account session and the workbench.
- `src/previewCatalog.tsx` registers Library components and variants.
- `src/keyScreenCatalog.tsx` registers static Key screen presets separately from
  the live prototype's account and activity.
- `src/screens/BingAppPrototype.tsx` connects screens, navigation, focus and voice.
- `src/screens/activity/` owns collection/session types and the prototype's
  history, tabs, bookmarks and retained page snapshots, including shared bookmark
  operations. Screen `*.data.ts` files supply design fixtures, screen-specific
  view projections and compatibility exports; shared activity lives separately.
- `src/auth/` manages Microsoft sign-in, Graph identity and local Rewards captures.
- `src/services/` validates public data and calls the configured API backend.
- `server/` exposes public read-only APIs and a separate local Rewards route.
  `http.ts` shares response helpers; `previewHtml.ts` shares HTML sanitization.
  Bing-specific result extraction remains in `bingSerpHtml.ts`, and public website
  transport/SSRF protection remains in `webPageFetch.ts`.

Keep component implementations, styles, assets, examples and tests together.
Register new components and screens in their corresponding catalogs. Preserve
Figma source links in component/screen READMEs; `docs/qa/` contains historical
visual evidence, not runtime settings or duplicate application entry points.

## Ownership

- `PreviewWorkbench` owns the active view, settings visibility, and appearance.
- `PreviewPrototypeNavigation` connects the sidebar to the retained live phone.
  The prototype owns routes and activity; the workbench forwards navigation
  commands and reads the current page. Independent Key screen presets cannot
  register as the live navigation target.
- `PreviewLibrary` owns search and category/item selection; `previewLibrarySearch.ts`
  performs case- and punctuation-insensitive matching across every query word.
- `PreviewLibraryGroup` renders an optional Overview above the normal grid.
  `overviewItemId` promotes an existing item without duplicating it. `fullWidth`
  lets comparisons and controls use the available preview width.
- Library artwork is wrapped in `StaticPreview`: native `inert` blocks focus,
  input and actions; pointer hit testing is disabled to avoid hover/press effects.
  Examples with `hasControls: true` must use `PreviewConfigurator`, which keeps
  its side controls interactive and applies the same boundary to the artwork.
  Footer and Multi-cards explicitly use `interactive: true` to restore direct
  component interaction requested by the user; neither has a side control panel.
  Do not disable reusable product components; Prototype retains their behavior.
- `PreviewKeyScreens` groups screen thumbnails; `PreviewExpandedScreen` owns the
  enlarged modal and restores focus to the triggering thumbnail or title.
- `PhonePreview` owns the decorative shell, overlay context, and automatic fit.
  `previewDevice.ts` defines the iPhone 18 Pro 402 × 874 screen and Figma's original
  450 × 920 Black/Portrait frame. Key screens and OS Native previews use this device width.
  PhonePreview and Key screens share the device's screen-opening mask. Product
  screens stay rectangular; do not copy decorative Figma frame radii into them.
  Standalone Library components do not inherit phone corner clipping.
- `BingAppPrototype` connects Homepage and Recent through the footer and opens
  the Query entry flow from Homepage search focus. Home and Recent stay mounted
  so their scroll positions survive navigation. `ScreenFooter` supplies their
  shared bottom safe area; Search has its own keyboard and InPrivate area.
  Prototype owns Private Mode across screen navigation; Homepage changes only its
  Avatar, and Search's Switcher controls the shared value.
  `usePrototypeActivity` owns collection changes and result sessions; navigation
  delegates those operations rather than maintaining another copy of the data.
- Product components own their native Figma sizes. Screens own constrained widths,
  safe areas, composition, and scrolling. Shared `*.examples.tsx` files belong to
  Library and are not separate application entry points.

## Layout and input behavior

`styles/layout.css` supplies 16 px search and 20 px content side insets. All three
screen search boxes and full-width Feed/List cards fill the available width.
Existing 24 px spacing stays intact: Homepage title bar, section title offsets
and InPrivate introduction. Horizontal Glance/Tab/Event cards keep intrinsic
widths within their full-width scrolling containers. Library specimens keep their
source dimensions. See [device QA](qa/iphone18-layout-qa.md).

Desktop uses a 232 px navigation sidebar, a flexible preview canvas and a 284 px
Inspector. Prototype pages, Key screen groups and Library categories share the
same sidebar styling. View selection and Appearance use compact segmented
controls in the Inspector; Reset and Close sit in its header. The fixed iPhone
18 Pro geometry is shown as read-only device information. The phone fits the
available canvas automatically and keeps the product's typography separate from
the workbench font. Below 1100 px the side columns narrow; at 900 px and below
the Inspector docks at the bottom. Library content remains capped at 1120 px and
scrolls independently.

Search spans the entire Library even when an individual component was selected.
Selecting a result narrows the query. Clear or Escape restores all items and
focuses search. Escape must not close Settings when it is clearing a query or
closing an enlarged screen.

Library uses five categories in this order: Navigation, Inputs, Content,
Overlays, OS Native. Header and Footer form the page navigation; Search Box and
Switcher are inputs; Avatar, List, Glance Card, Feed Card and Tabs Card present
content. Menu (including SERP/Webpage variants), Feed Menu and Toast share Overlays. System-provided components
stay together in OS Native at the end.

Use these categories by purpose rather than creating a category for each new
component or presentation style. In particular, a bottom sheet belongs in
Overlays, and a browser tab thumbnail belongs in Content rather than Navigation.
Keep display names in Title Case. Variants belong within their existing component
group, such as App Footer and IAB Footer under Footer.

`PREVIEW_LIBRARY_CATEGORIES` in `previewTypes.ts` defines category order.
`src/previewCatalog.tsx` defines component order within each category; register
new components alongside related entries rather than prepending them. Sidebar,
compact selectors, full gallery and search results consume this same order.
Show counts only on categories and All library items, not individual components.

Glance Card's Overview hugs its full group instead of clipping to a device width.
Sports uses a responsive 4 / 2 / 1-column comparison at native card sizes.

Tabs Card is in Content. Its Overview shows one 140 × 160 card with Rest / Selected
controls on the right; individual states remain below. Cards cannot be selected
or closed directly in Library. Footer selection changes by clicking Home or
Collections. Multi-cards supports direct swiping/dragging, pagination dots and
arrow keys. Search previews do not accept text or focus.
Tabs, List and App Search Box use `PreviewConfigurator` for the same 244 px side panel,
segmented controls, and responsive breakpoints. Multi-variant Overviews should
show one chosen variant with side controls rather than duplicate state previews.

Switcher is in Inputs. Its 40 × 24 Overview toggles directly and displays Pressed
while held, with no side configurator. All six static variants remain below.
Components remain passive unless a caller supplies `onSelectedChange`.

Bing Search Box includes Homepage, Search page and Recent page. The latter two
compose `AppSearchBox`, each showing one preview with a side State selector for
Zero Input / Focus / Input. Focus and Input are static artwork with an unanimated
cursor. Search and Recent opt into native input and clear in Prototype;
Search also provides a Back action.
Library and Key screen examples keep their passive states.

List's Overview uses a 244 px right-side control area and a centered preview.
At less than 680 px of available container width the controls become a top toolbar;
below 440 px the fields stack. Controls fit their container while the native-size
card preview can scroll horizontally. Single renders one original row; Multi
renders a section header and five example rows with no final divider. Both modes
expose six List types and preserve selection when switching.

## Homepage behavior to preserve

- Key screens use fixed 9:41; Prototype uses system time.
- Homepage keeps one search input outside its native scrolling surface. Its
  position clamps at 332 px; height follows the same scroll sample, shrinking
  from 64 to 56 px over the final 96 px of travel.
- Compact search has 16 px horizontal insets (370 px on the 402 px screen).
- Wallpaper fades into the solid feed background over 280 ms. Dark mode's 5%
  black overlay sits above the wallpaper and below UI elements.
- Bottom overscroll cannot bounce the pinned search. Reduced-motion preferences
  disable transitions. Input and footer selection persist through scrolling.
- The scrolled key screen initializes at scrollTop 384 and waits for layout if
  mounted inside a hidden view or modal. Normal scrolling reaches the deeper
  feed-under-header state; no dedicated test-only preset is needed.
- Each screen supplies its own IOSStatusBar and bottom safe area. The shell does
  not add a duplicate status bar or intercept component interactions.

## Motion convention

Unless the user or a supplied design specifies parameters, new motion should
follow iOS-like timing and easing. Reuse `src/motion/iosMotion.ts` for navigation,
keyboard, bottom-sheet and fade transitions; see [motion.md](./motion.md).
These are shared web presets inspired by iOS, not exact UIKit constants.
Respect reduced-motion preferences and preserve the passive Library/Key screen
states. A motion preset does not authorize a new interaction or destination.

## Development checks

Search's 402 × 874 Key screens include Zero input, Empty, Keyboard, Input,
history editing/clearing and InPrivate states. `src/keyScreenCatalog.tsx` defines
the current gallery. Prototype opens Search with its keyboard from Homepage's search field.
Typing (physical keyboard or the letter/delete/space keys), clearing, blurring,
scrolling to dismiss the keyboard, Escape and returning to Homepage are wired.
Key screens use the supplied Weather suggestion fixtures; Prototype uses live
Bing suggestions and submits selected queries to the live SERP viewport.
The shared InPrivate switch activates the supplied dark states while preserving
input and keyboard visibility. Clearing shows the private intro; leaving Search
resets its query while preserving the prototype's private mode. Homepage uses
the existing private Avatar and keeps the normal layout and theme.
Normal-mode submissions populate Search history, browsing History and open tabs.
Typing and private queries do not add normal activity. The workbench's Reset button
is shown only for Prototype and remounts its content to clear records, query drafts,
navigation and private mode, returning to Homepage. Appearance and design presets
are unaffected. Prototype activity is session-only; reload also starts empty.
See `src/screens/Search/README.md` for source nodes and asset details.

Recent is available through the third footer destination and in Key screens.
It composes TabsCard, AppList, AppListCard, AppHeader, IOSStatusBar and AppFooter
from C2 node 641:10440. Its 390 × 844 source adapts to the 402 × 874 device.
Recent shares activity with the Prototype's Tabs, History and Bookmark detail
screens. New tab opens Search; submitting creates a tab, and editing a result
reuses its active tab. Empty collections use the supplied empty state. Key screens
retain the design fixtures. Implement only interactions supplied by the user;
do not infer destinations from static Figma controls.

Use `npm run dev` at http://127.0.0.1:5174/. Run relevant tests during changes and
`npm test -- --maxWorkers=1`, `npm run build` and `npm run build:server` before
integration. The worker cap matches CI and prevents animation-heavy DOM tests
from competing for CPU. `npm run preview` serves the
compiled build at http://127.0.0.1:4174/ for production verification.

Verify Library search and variants, both List controls, theme changes, enlarged
screen open/close and focus, Prototype scrolling, and input retention after
switching views when a shared dependency or workbench shell changes.

Figma source links live in component/screen READMEs. `docs/qa/` preserves design
references and historical screenshots; its recorded geometry is evidence, not
runtime configuration. Font-weight fidelity remains limited by the unavailable
original Segoe Sans variable font.
