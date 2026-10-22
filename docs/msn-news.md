# MSN news in Prototype

The workbench's Prototype passes `feedSource="msn"` to Homepage. Library and
Key screens continue to use the original Figma data, including sponsored and
event variants. Live Prototype renders only article data actually returned by MSN.

## Source and mapping

`GET /api/msn-feed` fetches the anonymous English web feed at
`https://assets.msn.com/service/news/feed/pages/weblayout`. The request uses the
public web-client identifier shipped in MSN's frontend, with `ocid=Peregrine`.
`MSN_FEED_API_KEY` can override it server-side for an authorized deployment.
No account cookie, user ID, search history or personalization data is forwarded.
The key and MSN's session/telemetry metadata never enter the client response.

This was verified against the public MSN frontend and live responses on
2026-10-21. MSN can return its own editorial/static fallback feed; that remains
real MSN content, but is not personalized or a guarantee of breaking-news freshness.
Publication dates are taken from each article, including older editorial stories.

The adapter reads `sections[].cards[]` and nested `subCards`, keeps unique
`type=article` records, and validates HTTPS article/media URLs. It maps the title,
image, publisher name, square logo, publication time and original article URL.
When available, the image's focal region sets the card's object position so
portrait images retain the subject within the shared landscape crop.
Incomplete articles are omitted; missing logos remain null. It does not reuse
Medium's design mark for an unknown publisher or fabricate publication dates.
Raw HTML, ad payloads and full article bodies are not rendered.

## Display and lifecycle

- First story as a single card, next up to five in the existing interactive
  carousel, remaining and subsequently loaded stories as single cards. `newsTop`
  requests 12; MSN sometimes returns larger pages, which are retained up to the
  100-article safety limit before following its continuation.
- Existing card widths, margins, typography and image aspect ratio are preserved.
- A skeleton uses the existing Loading variant. Errors offer Try again and do
  not fall back to Figma/sample news.
- An intersection observer within Homepage's own scroll surface prefetches within
  900 px of the bottom. Only one request runs per feed at a time; inactive screens
  do not trigger more pages. New stories append without replacing existing cards
  or resetting the carousel. Article IDs and URLs are deduplicated across pages.
- Each page uses MSN's returned `nextPageUrl`, restricted to its known HTTPS feed
  endpoints. Generated user/activity identifiers are stripped. Clients receive an
  opaque cursor, never upstream tokens or arbitrary URL proxy access. The server
  retains at most 256 continuation entries and shares in-flight/public cached
  responses for five minutes per page. Expired cursors resume from a fresh feed,
  deduplicated against already visible news.
- Missing continuations or three successive pages without new usable stories
  end loading with “You’re all caught up.” Page failures preserve loaded stories
  and retry the same continuation. No recycled stories create fake endlessness.
- Tapping the active Home footer animates the same scroll surface back to zero
  with the shared iOS-inspired navigation timing; search follows that timeline.
  This cancels a pending hero snap, supports gesture interruption/reduced motion,
  and leaves loaded stories and search activity intact.
- Relative times update every minute. Reset/reload remounts the feed, subject to
  the public-data cache. Reset still clears only the Prototype's personal activity.
- Article URLs are retained in data; no unrequested article-detail flow is added.

## Runtime limits

Both `npm run dev` and `npm run preview` include the API middleware. A static-only
host needs an equivalent backend route. The upstream is a public webpage service,
not a promised third-party API; schema, public identifiers and availability may
change. Production deployment needs a confirmed, authorized source and service
contract appropriate to the intended use.

Requests have an eight-second upstream timeout and a two-megabyte response limit.
The browser cancels outstanding work on unmount, ignores late replies and offers
retry after failure. No private account credential is included in the repository.
