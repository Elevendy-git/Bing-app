# Bing results screen

Source: [Bing App Shareout, 1:20518](https://www.figma.com/design/yClrtwNrFJhE7W5waPRmkv/?node-id=1-20518).

The App owns the status bar, search composer and shared `IABFooter`. The central
viewport, including Bing's category navigation, belongs to the web page. No
React/native search-result cards are recreated here.

Private sessions use the shared composer and status bar in a fixed private
navy header, independently of workbench appearance. The session, rather than a
subsequently toggled Search draft, owns this palette. Web content and the shared
footer keep their existing presentation. Composer transition artwork carries
the origin's private palette without changing its geometry or motion parameters.

## Two workbench views

- **Key screens → Search results → SERP · Weather** uses the original web image
  embedded in the Figma node, cropped beneath the live App chrome. This is a
  passive design reference, not real-time weather or an error fallback.
- **Prototype** submits Search via Enter, the keyboard Search action, or a query
  suggestion. `LiveBingResults` requests `/api/bing-serp?query=…` through the shared
  API URL resolver. The adapter runs in Vite locally and in the standalone Node
  backend online; it fetches Bing's mobile HTML and retains its result markup
  and CSS. The viewport scrolls independently beneath fixed App chrome.
  Result links navigate inside the App; Back/Forward traverse the current tab's
  visited pages. At the first
  entry Back slides the result screen out to the right, revealing Homepage.
  The result document stays mounted; Reduce Motion returns instantly. See
  [SERP Back motion](../../../docs/motion.md#serp--homepage-back). Tapping the composer opens query
  editing. Home and Recent retain their destinations.

`LiveSERP` connects the request and iframe lifecycle to AppSearchBox's loading
line. The result viewport stays blank while requesting, with no centered
“Searching Bing…” message. Valid HTML advances the line; the iframe's load event
completes and fades it. The line is a stage estimate, not a measured download
percentage. Errors stop it and preserve Retry, which starts fresh progress.
Requests from removed documents are aborted. Retained background documents can
finish loading without changing the active page or its progress.
See [IAB loading motion](../../../docs/motion.md#iab-search-loading).

Editing the result query uses a shared-composer transition into Search. The
332 × 48 field on the current 402 px phone grows into the 370 × 56 Search field;
Back reverses that path, with the keyboard on the same timeline. The input uses
the text cursor. The result document stays mounted and inert while editing, so
cancel preserves its scroll and does not reload it. Submission starts a new
navigation. See [SERP ↔ Search motion](../../../docs/motion.md#serp--search).

## HTML preview boundaries

This is a live-fetched HTML snapshot, **not a full WebView**. Remote scripts,
embedded frames and forms are removed. Script-driven weather widgets, other rich
cards, lazy content and controls may be absent or inactive. Ordinary links open
their real destination through `/api/web-page` in the same App viewport. Bing
search links become another SERP entry. Each tab retains its documents and scroll
positions for Back/Forward and Recent; a new link after Back replaces only the
forward branch. In SERP the composer microphone opens the shared
[Voice Search modal](../VoiceSearch/README.md) in Prototype; successful recognition
replaces the active tab's result session and Cancel restores the retained page.
Webpage addresses use a bookmark star instead, saving the actual canonical URL,
title and favicon into the shared Bookmark activity. Tapping again removes it.
InPrivate does not write normal bookmarks. Copilot remains passive.
Bing's returned layout, ranking, locale and content may vary, and will not
necessarily match the historical weather reference.

## Browser actions

More presents the shared `BrowserMenu` / `MenuSheet` using the Feed menu material.
SERP includes Refresh, Copy link, Open in default browser, Share, Search settings,
Feedback and Find on page; webpages omit Search settings. Both include Cancel.
Cancel, outside click and Escape restore the page and trigger focus after exit.
Refresh reloads only the current document, preserving the rest of the tab's stack.
Copy and Share use the current canonical URL; native sharing is used when available,
otherwise Share copies the link with explicit feedback. Search settings and
Feedback open their official Bing browser destinations; the prototype does not
submit feedback itself. Both menu variants are available in Library → Overlays → Menu.

Find on page opens after the sheet exits and reuses the Search input and iOS
keyboard. Literal, case-insensitive matches are highlighted inside the current
isolated document, with count, Previous/Next, Clear and Done. Counts remain visible
while stepping between matches. Closing or covering the document clears highlights;
the iframe stays mounted. The App-owned bridge authenticates the parent/frame,
origin, per-document channel and latest request, without same-origin access.
Presentation references and web timing distinctions are recorded in
[motion.md](../../../docs/motion.md#iab-browser-actions-and-find-on-page--9-november-2026).

The search endpoint calls only `https://www.bing.com/search`, uses a mobile user agent,
does not forward browser credentials, and follows no redirects. Queries are
limited to 256 characters; documents to 4 MiB; upstream calls to 8 seconds.
Responses use `no-store` and the application adds no query log or persistence.
English/Chinese input selects the corresponding language. Location-sensitive
results can reflect the server's network location; no device location is sent.
Result assets load from their original HTTPS sources in an isolated, credentialless
iframe (where supported). The only executable script is the App-owned, nonce-authorized
navigation/find bridge. The iframe has no same-origin access or popup permission. CSP blocks
remote scripts, forms and embedded frames; the parent validates message source and
channel before navigating. Thumbnail snapshots contain no bridge and allow no scripts.
See [IAB preview](../../../docs/iab-preview.md) for the webpage endpoint and its limits.

Failed, challenged or unrecognized responses display an error with Retry instead
of replacing live data with a screenshot. The extraction relies on Bing's current
`b_content` / `b_results` markup and can break if Bing changes it. Both `npm run dev`
and `npm run preview` provide the API locally. A GitHub Pages workbench uses the
separate HTTPS backend selected by `VITE_API_BASE_URL`; build configuration and
CORS origins are documented in [backend deployment](../../../docs/backend-deployment.md).
Static hosting alone cannot provide the adapters. Public requests omit cookies
and authorization, and unavailable providers retain the error/Retry behavior.

A production mobile app needing complete Bing interaction should replace the
viewport with a real native WebView loading the mobile Bing URL, following the
supported integration approach available to that app. Retain the surrounding App
components. The current browser workbench does not claim to implement that container.

## Geometry and assets

The supplied frame is 393 × 852; the workbench's existing iPhone 18 Pro screen is
402 × 874. Shared iOS metrics provide a 62 px status bar and 34 px bottom safe area.
The composer is 48 px high, with an 8 px gap below: header total 118 px.
The search row has left/right insets 16/10 px and a 44 px More slot. Composer width
is 323 px on 393 and 332 px on 402. The toolbar is 52 px plus the bottom safe area
(86 px total); the central viewport fills the remaining height (670 px on 402 × 874).
The phone shell alone owns screen corner clipping.

- `AppSearchBox/assets/bing.svg`: original Figma export, 28 × 28 in a 32 px slot.
- Existing `AppSearchBox/assets/copilot-mic.svg`: 24 × 24, byte-identical to the
  supplied SERP microphone export; reused without alteration.
- `AppBrowserToolbar/assets/copilot-outline.svg`: original instance export from
  `I1:20520;3634:76232`, 22 × 22. Other toolbar icons reuse Fluent Code Connect
  mappings and the existing Collections icon at 24 × 24.
- `assets/bing-weather-reference.png`: original 1206 × 2622 image contained in
  Figma node `1:20519`. Its original crop is retained; the full Figma screen is
  not used as a background.

Chrome follows the workbench appearance. Bing HTML and the reference image retain
their source appearance; no invented dark-mode restyling is applied to web results.
The existing Segoe UI fallback remains a typography difference from Segoe Sans.
