# Bing App Workbench

The workspace for maintaining Bing App mobile components and screens. The React
workbench is the only application entry, with **Prototype**, **Key screens**, and
**Library** views. It uses CSS Modules and shared `--gnrc-*` design tokens.

## Run locally

Use **Node.js 24 LTS** (see `.nvmrc`). Install dependencies from the lockfile;
no private npm registry configuration is required.

```sh
npm ci
npm run dev
```

Open [Bing App](http://localhost:5174/). The development server uses port 5174 and
reports a conflict instead of silently choosing another URL. The old 127.0.0.1
address redirects to localhost so Microsoft's login callback shares the app's origin.

Profile shows real Rewards values when a local dashboard capture matches the
signed-in account. The capture stays on this
machine and is excluded from Git, static serving and the build. See
[Rewards data](docs/rewards.md) for its source and snapshot behavior.

Prototype's Homepage loads real English-language article metadata from MSN's
anonymous web feed: title, photo, publisher/logo, publication time and original
URL. It reuses FeedCard's single and five-story carousel layouts. The server
caches each public page for five minutes. Approaching the bottom automatically
loads MSN's next page and appends unique stories without moving existing cards.
Home smoothly returns to the hero without clearing loaded news or activity.
Relative times update while it stays open. Failures show Retry instead of sample
news. Key screens and Library remain fixed design examples. This public web
integration is intended for prototype evaluation, not a contracted production
API. See [MSN news integration](docs/msn-news.md).

Prototype's zero-input Search shows only submitted search history in a List Card.
Without records, the content area is blank. Quick features, You might like and
What's trending are no longer part of Search.

Prototype's Search suggestions use live Bing autocomplete (up to five queries).
Both local development and `npm run preview` include the same-origin API route.
Input is debounced by 80 ms; real results appear together without an entered-query
placeholder. Recent responses are reused in the mounted Search session for 60 s.
Key screens and Library keep their fixed design examples. This endpoint supplies
neither personal history nor logos. See [Search data behavior](src/screens/Search/README.md).

Submitting a query opens the SERP with App-owned header/footer and a live-fetched
Bing mobile HTML viewport. This reuses Bing's markup rather than native result
cards. Script-driven rich cards and actions are limited; see
[SERP integration and limitations](src/screens/SERP/README.md). Key screens retain
the supplied Weather design reference separately from the live prototype.

SERP links open inside the phone's IAB viewport, retaining the App header/footer.
Back/Forward and Recent tab switching preserve visited documents and their scroll
positions. Page titles, URLs and available favicons update real activity; private
visits stay out of normal history. The web preview keeps original HTML/CSS but
does not support complete website scripting or sign-in. Unavailable pages offer
Retry inside the App. See [IAB preview](docs/iab-preview.md).

```sh
npm test           # Component, screen, and workbench regression tests
npm run typecheck  # TypeScript and design-token checks
npm run build      # Validate and build the workbench into dist/
npm run preview    # Serve the built workbench at http://127.0.0.1:4174/
```

## Project structure

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Workbench entry, account session and key-screen registration |
| `src/auth/` | Microsoft personal-account login, Graph profile and redirect bridge |
| `src/previewCatalog.tsx` | Library categories, previews, overviews, and search keywords |
| `src/components/PreviewWorkbench/` | Navigation, settings, phone frame, gallery, search, themes |
| `src/components/` | Reusable Bing components, Library examples, local assets, and tests |
| `src/screens/Homepage/` | Homepage composition and scrolling behavior |
| `src/screens/Profile/` | Account photo, initial, and signed-out Profile screens |
| `src/screens/Settings/` | Settings groups, current account and Profile return flow |
| `src/screens/Search/` | Query entry, zero input, keyboard and suggestion states |
| `src/screens/SERP/` | App chrome, per-tab browsing and isolated web viewports |
| `server/bingSerp.ts` | Fixed Bing upstream and mobile HTML preparation |
| `server/webPage.ts` | Public webpage preview API for in-app navigation |
| `server/msnFeed.ts` | Anonymous MSN article proxy and short-lived cache |
| `src/screens/Homepage/LiveHomepageFeed.tsx` | Live news using the existing FeedCard layouts |
| `src/services/searchSuggestions.ts` | Validated Bing suggestion data and client request |
| `server/searchSuggestions.ts` | Local suggestion API for development and build preview |
| `src/styles/` | Shared tokens, Consumer themes, typography |
| `scripts/check-tokens.mjs` | CSS token validation |
| `docs/workbench.md` | Layout, interaction, and maintenance notes |
| `docs/qa/` | Figma references, screenshots, and historical visual checks |

`*.examples.tsx` files are used by Library itself, including the List Card controls,
Avatar comparisons, Sports states, and IOSStatusBar examples.

## Workbench views

**Prototype** displays the interactive Homepage inside the iPhone 18 Pro frame
from the supplied iOS 27 Figma library. The screen is 402 × 874 and the frame is
450 × 920. It fits the available space,
reserves 4% horizontal breathing room, and never scales above 100%. Input and
selection state persist when switching views.

Prototype starts with no activity. Submitting a normal-mode query adds Search
history and a Recent history visit, with the newest query first. Repeated queries
share one Search history row; each submission remains a separate browsing visit.
Editing a result reuses its tab; submitting from Home or “+” creates a tab.
Private queries do not populate these normal-mode collections. Bookmarks and
Copilot history remain empty until their corresponding actions create records.
Activity lives in the current prototype session. **Reset** in the upper-right
toolbar clears prototype activity and returns to Homepage; reloading also starts
activity empty. Microsoft identity is kept separately in the browser session;
Reset does not sign out. Appearance, Library and Key screen examples are independent
of this reset.

Homepage, Search and Recent search boxes fill the screen with 16 px side insets.
Feed and List content fill with 20 px insets. Existing 24 px spacing remains,
including Homepage's title bar, section titles and the InPrivate introduction.

**Key screens** contains Home, Profile (photo, initials, signed out) and Settings, Recent, Tabs (grid, menu and empty), seven Search states (including empty and InPrivate), and SERP Weather. Thumbnails
render at 50%; clicking either the thumbnail or title opens an enlarged preview
in place. Escape or the surrounding canvas closes it and restores keyboard focus.

**Library** contains component groups and previews organized by purpose.
Search matches components, categories, variants, and combined-preview states.
Navigation switches to compact selectors in narrow windows. Empty categories
remain hidden until components are registered.

| Category | Components |
| --- | --- |
| Navigation | Header, Footer (App Footer / IAB Footer) |
| Inputs | Bing Search Box, Switcher |
| Content | Avatar, List, Glance Card, Feed Card, Tabs Card |
| Overlays | Menu, Feed Menu, Toast |
| OS Native | iOS Status Bar, iOS Keyboard, iOS Home Indicator |

Glance Card's Overview shows the complete content-sized group above its individual
cards. Sports compares Cold start, Upcoming, Live, and Final. List's Overview
supports all six content types and Single list / Multi list, preserving type when
switching modes. Its controls appear on the right in wide canvases and become a
top toolbar in narrow ones. Seven independent List variants remain below.
Switcher’s Overview toggles directly and shows Pressed while held; its six
static variants remain below, with no side control panel.
IAB Footer's Overview switches Recent selection directly. SERP and Recent's
browser variant reuse the same component and compose the iOS home indicator at
screen level; Library shows only the 52 px action bar.

Recent's Open tabs / View all opens the Tabs grid. Both screens share selection
and tab removal; Close all tabs opens the empty state. The shared New tab button
opens Search and Back restores the originating screen and scroll position.
Menu is a reusable 238 × 136 component; its Library preview follows global
appearance. Tab settings and Feedback retain their supplied artwork without
inventing destination screens. Supplied tab thumbnails are confined to design
presets. Prototype tabs preview the actually loaded Bing result document and use
its favicon; History uses the matching page URL and icon. Empty Recent sections
are hidden, and the trailing View all tile appears only with more than three tabs.

Workbench Settings switches views and System / Light / Dark appearance. Themes apply to the
workbench and its previews. Escape closes Settings unless search or an enlarged
screen is handling it first.

Homepage's avatar opens Profile with the shared iOS-inspired navigation motion.
Profile reuses Avatar, Header and List components; the account photo falls back to
the first name/email letter. History and Bookmarks open their shared screens and
return to Profile. Prototype's Tap to sign in opens Microsoft's official login
window for personal accounts. Homepage and Profile share the real name/email and
available photo; no photo uses the initial. The signed-in email opens an account
dialog with app-only Sign out. Navigation, Reset and reload retain the account
within the browser session; login/logout preserves prototype activity. Bing history,
bookmarks and Rewards are not synchronized. Key screens retain their design
fixtures; the real account never displays fixture Rewards points. See
[Microsoft sign-in setup and verification](docs/microsoft-sign-in.md) and
[Profile](src/screens/Profile/README.md).

Profile's Settings row opens the app's Settings screen, adapted from the supplied
393 × 974 design to the 402 × 874 phone. The four groups reuse the existing List
components, scroll below the pinned header, share the live account and have no app
footer. Back preserves Profile and returns focus to its Settings row. Individual
settings destinations await their supplied designs. See [Settings](src/screens/Settings/README.md).

## Design sources

| Component / screen | Figma reference | Notes |
| --- | --- | --- |
| Avatar | C2 `3312:51594` | 40 px / 64 px, seven variants |
| Header | C3 `4058:12091` | 393 × 56, replaceable actions |
| Tabs | C2 `878:30997` | 140 × 160 tab cards, Rest / Selected, select and close |
| Menu | Shareout `1:20756` | Three 40 px rows; shared Tabs menu with destructive action |
| Tabs flow | Shareout `1:20652`, `1:20742`, `1:20752`, `1:20747` | Recent entry, two-column grid, menu and empty state; adapted to 402 × 874 |
| Switcher | C2 `3326:52693` | 40 × 24; Off / On × Rest / Pressed / Disabled |
| Bing Search Box | C2 `775:47824`, `775:44984` | Default 358 × 64; screen owns compact layout |
| Feed Card | C3 `3572:5631`, `3707:12385` | 342 px, five variants, interactive carousel |
| App Footer | C2 `849:24365` | 390 × 52; Home and Collections switch selection |
| IAB Footer | Shareout `1:20637` | Five-slot toolbar; 402 × 52, with screen-owned iOS safe area |
| Glance Card | C4 `5826:53496`, `5912:35288` | Hugging group and four Sports states |
| List | C2 `375:9897` | Seven 390 px rows; 350 px composed card shell |
| Homepage | C4 `5826:54329`, `6233:27220` | First screen and scrolled screen |
| Profile | C3 `3467:9216`, `3587:13894`, `3825:20937` | Initials, photo, signed out; 402 × 874 adaptation |
| Homepage header | C4 `6233:28203`, `6245:28594` | Blur mask and compact search width |
| Search flow | Shareout `1:20487`, `1:20495`, `1:20502` | 393 × 852 zero input, keyboard and suggestions |
| InPrivate Search | Shareout `1:20449`, `1:20428`, `1:20441` | Shared Switcher activates private empty, keyboard and input states |
| InPrivate Homepage | C2 `1070:59188` | Existing private Avatar; mode shared with Search |
| SERP | Shareout `1:20518` | App composer/browser toolbar; Bing-owned web content |

C2: [Bing App — MAI Style Alignment](https://www.figma.com/design/vA59dRO3b38EcRK1JY8N6w/).
C3: [Bing App — MAI Style Alignment](https://www.figma.com/design/jSAgWuDdxjDuK404ZVNDbb/).
C4: [Bing App — MAI Style Alignment](https://www.figma.com/design/x2wnQRhqdGBZcsouyMMQUV/).
Shareout: [Bing App Shareout](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/).

The phone frame is the original Black/Portrait asset from the supplied
[iOS 27 Figma library, node 12887:20848](https://www.figma.com/design/MxaoGSDUvLJ58OvsXmRTLY/?node-id=12887-20848).
Its 402 × 874 screen sits at x24/y23 within the 450 × 920 frame. Device preview
containers own clipping based on the asset's screen opening; product screens
do not specify phone corner radii. See [asset provenance](src/components/PreviewWorkbench/assets/README.md).
OS components follow the
[iOS 27 reference](docs/ios-native.md), while existing Live Activity variants retain
their One Copilot provenance. All required assets are stored locally.

The original Segoe Sans variable font is still unavailable. The current Segoe UI
webfont fallback does not exactly reproduce the design's intermediate weights.
Other Figma images and icons are bundled locally, rather than fetched from
short-lived design URLs. See component READMEs and [QA records](docs/qa/README.md)
for geometry and rendering details.

## Maintenance and deployment

Keep component code, CSS, assets, Library examples, and tests together. Register
new previews in `src/previewCatalog.tsx`, and screens in `src/App.tsx`. Document
Figma sources in a component README. Check relevant interactions and Light/Dark
appearance directly in the workbench before submitting changes.

The pull-request workflow runs types, token checks, tests, and the workbench build.
The deployment workflow publishes `dist/` to GitHub Pages only when manually
dispatched from Actions. Code pushes still run the automatic workbench checks.
Before starting a deployment, enable Pages in the repository settings and use
**GitHub Actions** as the deployment source. The production build uses relative
asset URLs for project-based Pages paths. No deployment is triggered by local edits.
GitHub Pages serves static files only, so live suggestions would need a separately
hosted API behind the same-origin `/api/search-suggestions` route. The current
static deployment shows no live AS card when this route is unavailable.
Live SERP also requires `/api/bing-serp`; without it the result viewport shows an
explicit load error and Retry. It never substitutes the static design reference.
