# Search discovery data

Prototype enables `discoverySource="live"`. It prefetches both public sources
while Homepage is visible, keeps their results across navigation, and renders
the existing AppList / AppListCard components on zero-input Search. Key screens
and Library retain Figma fixtures. InPrivate continues to show its own intro;
discovery does not send account identity, search text, history, cookies or location.

## You might like

`/api/search-discovery?section=recommendations` uses MSN's public zero-input
search endpoint, `https://assets.msn.com/service/news/feed/segments/autosuggest`,
with `market=en-us` and `fdhead=1s-autosuggestnpt2`. These parameters and the public
client identifier come from MSN's `CommonAutoSuggest` configuration. The server
uses the same `MSN_FEED_API_KEY` override as Homepage news, when supplied.

MSN identifies this result as `NewsAutoSuggest` / `TopStories`. The adapter takes
the first three valid unique items, preserving source order, titles, thumbnail
URLs and destinations. This is a genuine public recommendation list, not
account-personalized suggestions. Missing or failed images never use a sample
logo. The source has no publication timestamps here, so none are invented.

## What's trending

`/api/search-discovery?section=trending` reads
[Google Trends' public US RSS feed](https://trends.google.com/trending/rss?geo=US).
The user approved using another platform so the prototype can show real trends
with pictures. `source` is `google-trends`; these are Google search trends,
not Bing rankings or personal recommendations.

The adapter takes the first six unique `<item><title>` queries in feed order.
Numbers represent that order, not a claim about global search-volume rankings.
The original query remains in `title`. For readable display, `headline` contains
a related article's `ht:news_item_title`, paired with that same article's
`ht:news_item_picture`. The adapter prefers the first complete headline/image
pair. Search displays the headline in the existing two-line List title; it does
not invent or translate copy. These are contextual news headlines for trending
topics, not literal user queries. A headline never borrows another story's photo.
If there is no headline, the original query and its supplied thumbnail remain
the fallback. Missing/failed thumbnails are omitted. Source links are preserved
from the feed; `fetchedAt` is our fetch time, not a trend's publication time.
No extra row-click, search or article-detail behavior is added.

Verified on 2026-10-22: the public feed returned ten terms with thumbnails,
and the local route displayed the first six using the existing List layout.
This replaces Bing's text-only QSON source. Upstream empty/error responses still
use the existing retry state without fake or historical sample queries.

## Failure and lifecycle

The two sections load and fail independently. Successful public data is cached
for five minutes; empty trend results are cached for 30 seconds. Concurrent
requests share one upstream fetch per section. Requests use fixed endpoints,
eight-second upstream and ten-second client timeouts, and a one-megabyte response
limit. MSN responses are parsed as JSON. Google Trends RSS uses `fast-xml-parser`
with XML validation and rejects DTD/entity declarations, malformed XML and
foreign namespaces. No response is executed or rendered as HTML. Thumbnail URLs
are restricted to Google's observed encrypted-tbn gstatic image hosts and are
loaded with no referrer. Invalid/challenge responses fail safely.

Reset clears personal prototype activity and prefetches public discovery again,
subject to the cache. Hiding discovery in InPrivate/unmounting cancels outstanding
client requests and ignores late replies. Titles and thumbnails are supplied
data; the source response is never treated as executable content.

Both development and preview servers register the middleware. Static deployment
needs the equivalent backend routes; these public webpage services have no
guaranteed third-party API stability or production authorization.
