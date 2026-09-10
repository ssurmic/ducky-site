# Visible core workflow — 2026-09-10

Status: implemented and locally tested; production release receipt follows after CI and browser verification.

## Owner correction and result

The previous three-link navigation hid the information map, creator history and calendar. An empty
Today/Explore also made an established research corpus look empty to a new user. Preserve the
simpler workflow while making these core capabilities directly reachable.

- Primary navigation: Today, Watchlist, Explore, Calendar, Creators, in both languages and on phones.
- Watchlist: List first and default on every mount, Overview second, Heatmap third. The list includes
  the shared saved paragraph, stock price, market cap and six comparison metrics. Column-header
  buttons toggle ascending/descending sorting; unknown values always remain last. No sorting menu.
  Compact phone table keeps the stock and map button fixed while other columns scroll horizontally.
- Stock: explicit map/history/creator/calendar actions near the heading, and an inline map using the
  same saved `/stock-research/{ticker}` response. Existing evidence stays readable during summary
  preparation. No additional acquisition or inference occurs when opening or arranging a map.
- Map: bullish left, facts/context middle, bearish right. Phones stack the lanes with a direct category
  filter. A stable creator ID groups that author's records within each stance; individual points retain
  their dates, IDs and original-source actions. More than two records from an author use a local
  disclosure. Repeat-source notices count distinct linked nodes, not independent corroboration.
- Explore: concrete NVDA map link and dated NOK/GLW historical cases, including the losing GLW case;
  visible research tools and a seven-day recent-ingestion feed. Today with no subscriptions also shows
  the examples. Historical cases are labelled; they do not masquerade as new/current conclusions.

## Actual workflow acceptance

On the signed-in production browser, searched COST from Explore, selected Costco, explicitly followed
it and opened its map through the old “Deeper research” disclosure. The watchlist increased by one.
The existing backend subsequently supplied seven saved fact records (including price, volatility,
option positioning and RSI), while its summary remained unavailable. This was a real new-stock
browser action, not a synthetic API screenshot. The added stock is a temporary QA change, to be
removed after the post-release check.

Action counts below start from an already opened stock/list, excluding typing and scrolling:

| Task | Previous focused UI | This implementation |
|---|---|---|
| Stock → information map | Expand Deeper research, then open map: 2 actions | Inline map: 0; full map: 1 |
| Default Watchlist → map | Open stock, expand tools, open map: 3 | Fixed row map button: 1 |
| Any primary page → calendar | Explore, then calendar: 2 | Calendar navigation: 1 |
| Any primary page → creator records | Explore, then creators: 2 | Creators navigation: 1, then select author |
| Sort by an indicator | Open menu, find option, choose | Click that column header: 1; next click reverses |

These are action-path measurements, not a claim that every newly followed stock has reviewed content.

## Checks and practical limits

- Full local Node suite: 614 passing; copy lint: 3,244 files, zero failures; link check: 1,274 links. A later source-repeat refinement was checked with the focused evidence tests; CI repeats the full gate.
- Added regression coverage: sorting zero/loss/unknown in both directions, no extra reads, focus and
  horizontal position preservation, default mode order, examples with no watches, seven-day Explore,
  pending summary with existing map, author identity separation, opposing records, repeated source
  counts, and original links. Existing exact previous-citation/withdrawal tests remain enabled.
- Actual viewport simulation: 320×650 and 390×650, ZH/EN, light/dark. Main content viewport 522px,
  bottom navigation 67px, first table row at approximately y=335. Compact rows show three stocks in
  the 320px first screen. Table overflow is intentional and contained; no document-level overflow.
- Browser clicked the YTD header at 320px: order changed to positive, zero, negative returns; fixed
  stock/map column remained visible and horizontal position was retained. Separate unit tests prove
  sorting itself adds no network call; background shared refresh can still occur while viewing.
- DOM route sweep: 36 combinations covering watchlist, briefing, chart, calendar, boards, alerts,
  creators, profile and billing with five visible primary links and no document overflow. Synthetic
  ancillary data is incomplete; this sweep establishes navigation/layout, not live provider coverage.
- Visually inspected desktop Explore/table/map, phone table/Explore/new-user Today/pending-stock
  page and author expansion. This is viewport simulation, not a physical-device/touch-emulation test.
- Live generation remains partial: at 08:51 UTC, 9/10 original pilot stocks had some accepted analysis;
  this includes retained previous versions. NVDA still had no accepted paragraph. This UI does not
  turn pending/rejected content into approved research.

## UI reference research

[Bobalor Radar](https://bobalor.com/radar) exposes dated ticker entries and movements directly next to
its chart/table controls. [Robinhood Lists](https://robinhood.com/us/en/support/articles/lists/) uses
curated groups that lead into stock detail. The relevant design inference is to place concrete content
and direct stock actions ahead of instructions or collapsed menus. Ducky's examples preserve source
history and losses; no competitor metric, predictive claim or scoring method was copied.

## Rollback

Previous production app code: `7cd5f6ab948e89e63b94ed51b68cc273c22c22ec`, Pages deployment `6a399330`.
This iteration changes presentation and local sorting only. Backend access checks, model admission,
strategy qualifications, source revisions and notification rules remain authoritative.
