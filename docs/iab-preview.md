# In-app webpage preview

SERP result links open real public webpages inside the existing 402 × 874 phone.
The App retains its search/address field, loading line and IAB Footer; webpage
HTML, CSS and images provide the content. This runs in the existing web workbench
without installing a desktop client.

Homepage Feed images and headlines also open their real article URLs in IAB.
Each carousel slide opens its own article; swiping, pagination and More do not
navigate. A new article opens in a new App tab and Back returns to the same
Homepage scroll position. URL visits enter browsing history, not query history;
private browsing keeps them out of normal activity.

## Navigation and activity

- `LiveSERP` owns a document stack for each App tab. Back and Forward restore
  mounted documents and scroll positions without fetching them again. A new
  navigation after Back removes the forward branch. Closing a tab releases it.
- At the first document, the App's Back control slides the screen out to the right
  and returns directly to Homepage (instant under Reduce Motion).
  Query editing opens only through the search/address field. Returning from a
  linked webpage still traverses the tab's previous documents first.
- Ordinary and middle-clicked result links stay in the same App tab. Bing's
  encoded result redirects resolve to their destination; Bing search links use
  the existing search endpoint. Fragment links stay within the document.
- Tapping the address field opens the existing Search flow with the current
  URL/query. Cancel restores the document. Submitting a full HTTP(S) URL opens
  that website; submitting text performs a Bing search. Submission retains the
  existing behavior of replacing the current tab's query session.
- Recent thumbnails use the same sanitized document without executable code.
  Loaded titles, final URLs and declared favicons update tab/history metadata.
  Back/Forward do not duplicate or restore deleted history. Private visits do
  not enter normal activity. Activity remains in memory until reset/reload.
- Unsupported pages show an in-app error and Retry. They never automatically
  open an external browser tab. Back remains available after a failed visit.

## Endpoint and isolation

`GET /api/web-page?url=…` is included by both Vite dev and preview servers.
Static hosting alone cannot supply this API. Successful responses contain
`requestedUrl`, `sourceUrl`, `title`, `faviconUrl`, `html` and `fetchedAt`.

The server accepts public HTTP(S) pages on standard ports, follows at most five
redirects, limits responses to 4 MiB, and applies an eight-second timeout and a
six-request concurrency limit. It validates every DNS answer and pins each
connection to a public IP; redirects repeat these checks. It does not forward
client cookies or authorization, cache responses, or add URL logs.

MSN article pages are script-rendered shells. For recognized HTTPS
`www.msn.com/{locale}/…/ar-{id}` destinations, the server retrieves the published
body from MSN's public `assets.msn.com/content/view/v2/Detail/{locale}/{id}`
endpoint through the same bounded, public-IP-pinned transport. It checks article
identity, locale and rendering restrictions, then passes the body and supplied
images through the same HTML sanitizer. This displays real article text in a
simple reading layout, not MSN's complete interactive website. The address and
activity retain the original article URL. Unavailable/restricted articles use the
existing in-app error; no substitute article is manufactured. The public endpoint
may change independently of this prototype.

The HTML sanitizer removes website scripts, embedded frames, forms, event
handlers, redirect meta elements and forged navigation attributes. Relative
links/assets resolve against the destination URL. Images/styles/fonts load
from the source site's addresses, with a no-referrer policy.

The iframe uses an opaque sandbox origin, no popups and credentialless mode
where supported. Its only authorized script is a small App-owned link bridge.
The parent accepts navigation only from the active iframe's exact window and
random channel. CSP rejects remote scripts, network script calls, forms and
embedded frames. The iframe cannot access the workbench DOM.

## Scope

This is a webpage preview, not a complete browser engine. Script-rendered pages,
sign-in, forms, video players, downloads, payment, popups and some interactive
widgets are unavailable. Bot challenges, blocked remote resources, unusual
encodings or compressed responses may also prevent a useful preview. Website
content and appearance can change. App appearance affects the chrome; the
website retains its own colors.

Webpage navigation retains the current search-field progress behavior. The App's
Back-to-Homepage action uses the shared navigation preset to slide right; see
[motion references](motion.md#serp--homepage-back).
