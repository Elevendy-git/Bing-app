# Interactive Bing viewport

The app's header, search field and footer remain React components. An anonymous
Chromium page runs Bing's own mobile scripts on the backend, and sends JPEG
frames over `/api/live-browser`. Pointer, wheel and text input return through the
same WebSocket. Unlike the HTML adapter, weather-card controls are live.

All search transports request the global English market (`en-US`, country `US`)
and an English browser locale/Accept-Language. Query text is preserved, including
non-English queries. Weather location still follows Bing's anonymous backend
network location; an English market is not a request for the user's location.

## Enable locally

```sh
npm ci
npm run setup:browser
npm run dev
```

Development uses the stream for searches by default. Set
`VITE_LIVE_BROWSER=false` to use the existing HTML adapter. Key screens are
unchanged. The Vite endpoint accepts only the configured localhost port 5174.

Production requires both `LIVE_BROWSER_ENABLED=true` on the Node service and
`VITE_LIVE_BROWSER=true` in the frontend build. The Pages workflow reads that
frontend value from its repository variable. Leaving the variable unset keeps
the published HTML transport. Keep `BING_SERP_RENDERER=http` on the free backend
so callers of the legacy endpoint do not launch unnecessary browser work.

## Lifecycle and limits

- One live session per process. Live sessions and browser snapshots share the
  same Chromium lease; each session gets a new isolated context.
- Recent, Search and IAB overlays pause the stream while retaining its current
  page. Returning resumes the same scroll and card state. Opening another live
  document first ends the previous context. It may reload when revisited.
- Inactivity ends a session after 90 seconds; the hard session limit is ten
  minutes. A disconnected or expired page can be reopened with Retry.
- The wire format uses binary JPEG frames with explicit ACKs. Only the latest
  waiting frame is retained. Input queues, connection attempts, payload sizes,
  bandwidth and upstream requests are bounded. ACKs do not extend inactivity.
- Logical viewports are 320–480 px wide and 300–900 px high, at DPR 1. Resizing
  the app or opening Find updates the remote viewport. Network coalescing and
  frame caps are transport tuning, not iOS animation constants.
- Initial Bing redirects must keep the same query, `/search` path and explicit
  English market. At most three are accepted within the same 30-second readiness
  budget. They do not open an IAB page.

Each connection starts anonymously. No local browser profile, Microsoft login,
cookie, token or Rewards snapshot is imported. Search text is sent in the first
WebSocket message, not in its URL. The service does not log page contents,
queries or URLs. A strict Origin allowlist protects browser connections; this
is not a user-authentication mechanism.

Remote resources stay limited to Bing and its Microsoft-hosted dependencies.
Result links are handed back to the existing app IAB. Those external pages
still use sanitized HTML previews; this feature is not an unrestricted remote
browser, and does not provide external-site login, video or downloads.

## Verify before enabling online

Render Free supports WSS on the service's existing port, but its 0.1 CPU and
512 MB are shared by Node and Chromium. Initial wake-up, upstream availability,
network latency and frame rate differ from local tests. Streaming does not fix
a Bing challenge, hidden response or unrelated search response. A failed search
reports an unavailable state; it never silently substitutes a static card.

Check an actual query, card action, scrolling, a result link, Back, Recent and
Find in the phone prototype after deploying. Confirm a second visitor gets a
busy response rather than another user's page. Do not enable the frontend flag
based on a successful health check alone. Keep the existing transport enabled
if the selected free host cannot load usable Bing pages.

References: [Render WebSockets](https://render.com/docs/websocket),
[Free services](https://render.com/docs/free),
[Compute plans](https://render.com/docs/compute-plans),
[CDP screencast](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-startScreencast).

