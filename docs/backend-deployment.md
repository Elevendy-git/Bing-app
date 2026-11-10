# Public API deployment

The workbench can remain on GitHub Pages while the anonymous data adapters run as
a separate Node 24 service. The public `Elevendy-git/Bing-app` repository contains
the source, while GitHub Pages serves only the workbench's built files.
`render.yaml` mirrors the free Node 24 web service in Singapore, with automatic
deployment on commits to its linked branch. The frontend Pages workflow publishes
after its CI checks pass.

## Current Render target

Use workspace **Eleven**, project [Bing app](https://dashboard.render.com/project/prj-dbpco9m1egvs73bp0hog),
environment **Production** (`evm-dbpco9m1egvs73bp0hp0`), and service
[bing-app-backend](https://dashboard.render.com/web/srv-dbpcr2nf3r2c73fq49lg)
(`srv-dbpcr2nf3r2c73fq49lg`). Its public origin is
`https://bing-app-backend.onrender.com`. This replaces the previous `bing-app-api`
service; target the existing replacement for future deploys. It was created
directly in Render, so do not apply a new Blueprint or create a duplicate service
as part of an ordinary code update.

## Run locally

```sh
npm ci --include=dev
npm run build:server
npm run start:server
```

The standalone server binds `0.0.0.0`, uses `PORT` (default `3000`), and serves
`GET /health` without calling any provider. The build writes `dist-server/production.js`
and imports `parse5` from the installed production dependencies. It does not load
Vite middleware or the React workbench at runtime.

## Deploy to Render

1. Connect Render to the public `Elevendy-git/Bing-app` repository.
2. Create a Blueprint from `render.yaml`, or a **Web Service** with runtime
   **Node**, instance **Free**, build command
   `npm ci --include=dev && npm run build:server`, start command
   `npm run start:server`, and health check `/health`. If the service-creation API
   cannot set an HTTP health check, configure `/health` in its Render settings.
   Choose automatic deployment explicitly for a directly created service if desired.
3. Set `NODE_VERSION=24` and the origins below. Render provides `PORT`.
4. Once the service is healthy, set `VITE_API_BASE_URL` to its HTTPS origin when
   building the GitHub Pages workbench, currently `https://bing-app-backend.onrender.com`.
   Use the actual service URL issued by Render, then rebuild and publish Pages.
5. Check `/health`, then exercise suggestions, news, SERP and article navigation
   from the published workbench. The provider may reject a request or serve a
   challenge; the existing unavailable/Retry states remain the response to those failures.

| Server setting | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Listening port; Render supplies its own value. |
| `API_ALLOWED_ORIGINS` | `https://elevendy-git.github.io,http://localhost:5174,http://127.0.0.1:5174` | Comma-separated HTTP(S) origins without page paths or wildcards. |
| `API_RATE_LIMIT_REQUESTS` | `120` | Requests per minute per connection IP; accepted range 1–1000. |
| `API_MAX_CONCURRENT` | `8` | Maximum active API requests per server process; accepted range 1–32. |
| `MSN_FEED_API_KEY` | Existing anonymous MSN public client identifier | Optional server-only override for the fixed MSN provider adapter. |

CORS origins contain only scheme, host and optional port. The Pages origin is
`https://elevendy-git.github.io`; `/Bing-app/` belongs in the page URL,
not in this setting. The service allows anonymous GET requests and an Accept
header preflight, and never grants credentialed CORS access. The frontend uses
`credentials: "omit"`. CORS is a browser boundary, not authentication: direct
anonymous requests remain possible and share the same limits.

The limiter uses the socket peer address and does not trust user-supplied
`X-Forwarded-For`. Behind Render's proxy, multiple visitors can share a quota.
Raise the configured limit for a small group only if needed; the process-wide
concurrency cap still applies. Counters are memory-only, expire after one minute,
and do not store queries, account identities, cookies or history.

## API contract and boundaries

| Route | Query | Response |
| --- | --- | --- |
| `GET /health` | None | `{ "status": "ok" }` independent of upstream availability. |
| `GET /api/search-suggestions` | `query` | Bing autocomplete's `[query, suggestions]` JSON. |
| `GET /api/msn-feed` | Optional opaque `cursor` | Existing MSN public feed JSON and continuation cursor. |
| `GET /api/bing-serp` | `query` | Sanitized Bing mobile results document and page metadata. |
| `GET /api/web-page` | `url` | Sanitized public article/page document and page metadata. |

The service does not expose `/api/rewards`, account tokens, Microsoft cookies,
`.local/` snapshots, source files, or arbitrary static files. Upstream requests
use fixed provider endpoints or the existing public-IP-pinned webpage transport.
Webpage destinations reject credentials, non-default ports, local/system hosts
and private addresses; every redirect is checked and DNS connections are pinned.
Upstream bodies and timeouts retain their existing limits, and scripts are removed
from page previews. The app emits no request or query logs.

Free Render services sleep after inactivity and can take time to wake. Before
live suggestions, SERP/webpage previews or news start their provider deadline,
the configured remote frontend waits for the shared anonymous `/health` readiness
check for up to 65 seconds. Concurrent requests share that on-demand wait, and a
successful check is reused for ten minutes. Local Vite requests skip the check.
Host startup pages may omit CORS headers, causing browsers to report a network
`TypeError`; health checks retry these errors and HTTP 503 every two seconds
within the same 65-second limit. Other HTTP/JSON failures fail immediately, and
provider requests are never retried automatically by this readiness check.
The existing SERP loading line and news skeletons remain while the service wakes;
no background keep-alive or fabricated results are added.

After readiness, suggestions retain their five-second client deadline and
SERP/webpage/news requests retain their ten-second deadline. Clearing input,
replacing a query or unmounting cancels that consumer's wait and cannot fetch or
display its obsolete result. A failed readiness check or unavailable upstream
retains the existing empty-AS/error/Retry behavior; retry can start a fresh check.
Check the current [Render free-service limits](https://render.com/docs/free) before
sharing a prototype session. An always-on service is an option if that startup
delay becomes disruptive. Refer to [Render web-service deployment](https://render.com/docs/web-services)
and [Blueprint fields](https://render.com/docs/blueprint-spec) for host configuration.
