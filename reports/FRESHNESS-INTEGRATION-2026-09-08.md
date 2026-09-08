# Frontend/backend freshness and linkage review · 2026-09-08

## What the homepage date means

At 17:01–17:20 UTC / 13:01–13:20 ET on September 8, the latest completed US equity
session was September 4. September 5–6 were the weekend; September 7 was Labor Day.
The existing public prices API verified that exact completed session for NVDA, SPY
and NOK. No September 8 unfinished candles existed in `prices_daily` at the audit.
Source: https://www.nyse.com/trade/hours-calendars . The screenshot's calendar gap
alone is not stale data. Verification time and price-session date must stay separate.

## Fixes

- Homepage public close reads recover from initial failures and recheck every five minutes
  while visible, on return/focus and online recovery. Requests are GET-only without credentials,
  cancel on disposal and reject older returned sessions. Last-good prices remain readable on
  failure with an explicit unavailable check state. Both languages retain the close/date label.
- Static homepage quotes now use a maintained `public/desk-prices.json`, refreshed by the
  existing nightly notary. All three public quote sets validate before atomic replacement;
  dated examples stay immutable, and Git retains versions of the current projection.
- The calendar refreshes membership on every visit/shared reload. A failed or pending read
  retains the browser's saved list and gives a retry notice; an actual empty list replaces it.
- Earnings source health survives the live/static event merge. A source failure preserves
  dates and exposes true last-success/last-attempt timestamps, with unknown acquisition kept
  unknown. Recovery removes the source's failure notice. No model work on these reads.
- Delayed public Radar archive/coverage/facets participate in read revalidation; historical
  cursors/versions and hidden/disposed views retain their exclusions.
- The mobile evidence picker refreshes the currently selected ticker just like desktop.
- The chart distinguishes completed daily closes, unfinished daily bars, and unverified
  completion. State is tied to the selected source's recorded observation; wall-clock passage
  cannot finalize an old intraday cache. Option-wall percentages disclose their saved price
  anchor, including an explicitly missing quote time. No price or indicator algorithm changes.
- A long English status initially squeezed a 320px ticker into vertical letters. Browser QA
  caught it; the header now preserves a single-line ticker and wraps the status in its own cell.

Backend companions fix seven-day earnings source TTL sliding with daily revaluation, failed
Finnhub exports replacing good calendars with empty success, and a daily registry update
suppressing the scheduled half-day market background. API source-health projection is outside
its 30-minute base memo and inside its existing 60-second HTTP cache.

## Independent browser and data evidence

Read-only production sweep: watchlist, evidence, briefing, chart, calendar, radar, creators,
alerts, profile and billing. No complete route-load failures or captured JS errors. Chinese
creator-name search for 卓野聊美股 works without a ticker; calendar ORCL earnings and closure
details were present. The original-source link resolved to the selected video/time. Mobile
production inspection covered evidence, chart and creators at 390 × 649 CSS pixels.

At the parallel shared-link audit, 934 tickers had graphs and 898 were not watched by any
user. The live browser path for unwatched MU opened existing evidence, then the specific
creator interpretation, then the original YouTube source at 14:45. This proves shared
pre-association and read-through; it is a historical backfill sample, not a new-video SLA.
Acquired/indexed/projected/reviewed counts have distinct denominators.

Local browser fixtures explicitly contain synthetic prices and no real accounts. Chart
in-progress Chinese and unverified English were reviewed at 320/390 × 650, light/dark.
The calendar source/watchlist failure case preserves its usable event grid at those sizes.
These do not certify physical iPhone Safari or touch gestures. New production release
receipts and final checks are appended below.

## Remaining coverage and delivery limits

Some briefs remain unavailable after source revisions, review failure, timeouts or model
admission waits. Parallel producer work handles queue admission and semantic corrections;
none of those states is labelled completed merely because its graph exists. Watched daily
closes normally refresh on the 15-minute task after 16:30 ET. The wider unwatched universe
mainly uses the nightly batch; current official company-event adapters do not cover every
company/news source. No universal minute-level ingestion or quote freshness claim is made.

The live Pages project uses Direct Upload and has no Git integration. Nightly Git pushes
therefore did not publish the static website. `.github/workflows/deploy-pages.yml` is prepared
with validation, current-main checks and an off-by-default switch. No Cloudflare credential
is configured in GitHub, so automatic publication is not activated. See
[PAGES-AUTOMATIC-RELEASE-2026-09-08.md](PAGES-AUTOMATIC-RELEASE-2026-09-08.md). Existing local
production deployment credentials are kept local; they were not copied to a new principal.
