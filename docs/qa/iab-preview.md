# IAB preview verification — 26 October 2026

The phone prototype remains a web application at 402 × 874. This change adds
in-app link navigation, not a native browser engine.

## Automated checks

78 tests passed across the relevant server, SERP, tab and activity suites.
Coverage includes public URL/DNS validation, HTML sanitization, Bing redirect
decoding, iframe message ownership, back/forward branching, inactive requests,
failure/retry, tab restoration, history metadata and private-mode isolation.
The production build and design-token/TypeScript checks passed.

## Chrome phone-prototype checks

The controlled navigation fixture verified:

- SERP → article → another article without opening a browser tab.
- Back restores SERP scroll at 250 px; Forward restores article scroll at 480 px.
- Recent → the same tab restores article scroll at 420 px with no extra fetch.
- Recent receives the page's actual title and URL.
- A failed destination shows the in-app error; Back still restores the article.
- Remote unapproved scripts cannot execute, and the iframe cannot access the
  workbench DOM. The App-owned link bridge remains functional.
- Dark App chrome retains its geometry around source-colored web content.
- One browser page remained open, with no page-level JavaScript errors.

The Wikipedia destination was fetched through the real `/api/web-page` endpoint,
not a fixture. Its mobile heading, article, image and source styling were checked
visually after external resources finished loading. Initial external stylesheet
loading can delay the first paint; the progress line remains active until load.
Real endpoint requests also succeeded for Example Domain, BBC News and IANA's
Example Domains page. These checks do not imply all websites can be previewed.

See [IAB scope and implementation](../iab-preview.md) for scripting and website
compatibility limits.
