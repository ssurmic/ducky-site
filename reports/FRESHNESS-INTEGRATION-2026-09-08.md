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

## Final release receipts

- Frontend code `8669e7d`, followed by successful real notary `3341ad9` at 17:34:15–17:34:18 UTC.
  All three stored-price fallback records retained September 4 price sessions with September 8
  17:34:16 retrieval timestamps. The backend's earlier 02:00 track-record generation timestamp
  was correctly preserved rather than relabelled as this publication time.
- Production Pages `c835c1bd` deployed build `3341ad9`. Both GitHub frontend check runs passed;
  automatic deploy jobs were correctly skipped while the enable variable/credential is absent.
  Local final frontend gate: 418 tests passed; export tests 3 passed; asset checks 4 passed,
  1 existing skip; copy lint and 1,344 links passed. No test notifications or account mutations.
- Backend `4722f3c` passed Linux CI 3,414 tests / 1 skip, selftest ALL GREEN and actual HTTP
  14/14, then deployed with a verified recovery bundle and healthy API. Production isolated
  targeted checks passed 112/112 after removing TEST_MODE from write-expecting test fixtures;
  those were temporary test databases, not production records.
- At 17:41:08, one existing Finnhub producer acquisition completed successfully. The public
  calendar reported `status=ready`, true attempt/success times, `partial=false`, and retained
  the September 10 ORCL earnings event. Existing source revisions remain available.
- Upcoming earnings' five-day fetch eligibility was also too slow. `757fa03` changes only this
  registry entry to daily, with the existing 300-second timer-jitter allowance. Local integrated
  gate: 3,511 passed / 6 skipped; final Linux CI: 3,510 passed / 7 skipped, ALL GREEN, HTTP 14/14.
  [Backend CI run](https://github.com/ssurmic/ducky-bot/actions/runs/34259664849).
  Production advanced from the parallel source patch `f54f962` to `757fa03` at **17:58:31 UTC**;
  the tested ref matched, recovery bundle `recovery-20260908T175814262578Z-521ae289` verified,
  API health passed, and a read-only registry check confirmed `earnings: 1`.
  No source/model/worker files or processes were changed by this daily-cadence follow-up.
- Live browser after deployment: Chinese homepage `2026-09-04 收盘 / 已核对 · 最近收盘`,
  English `2026-09-04 close / Verified · latest close`, with independent September 8 check times.
  AVGO graph header showed an unfinished September 8 bar **recorded at 17:39 UTC**; option-wall
  distance disclosed a separate saved quote and its missing quote time. Chinese and English
  chart plus Chinese calendar were checked at actual 390 × 651 CSS pixels with document width
  390 and no horizontal page overflow. Calendar matched the current 18-stock list and displayed
  ORCL. Shared-data change notices were observed naturally while these pages stayed open.

Remaining operator source reviews are still owned by the parallel creator task and can wait on
shared model admission. Their delay is not reported as completed semantic review. Automatic
Pages publishing still requires the scoped deployment credential described above. This report
commit records the release; it does not change the deployed application build.
