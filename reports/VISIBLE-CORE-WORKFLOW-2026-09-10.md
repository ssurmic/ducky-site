# Visible core workflow — 2026-09-10

Status: deployed to https://duckybot.app and checked in the signed-in production browser.

## Release receipt

- [PR #5](https://github.com/ssurmic/ducky-site/pull/5), source `c2212b0`, merged app
  `20a803ee04d9297a5c0a724bc810e8af33ddee7c`; Pages deployment `1d9c25b3`.
- PR CI `34458086858` and main CI `34458376470` passed. Public configuration reports
  `20a803ee`, both product-focus/shared-brief flags enabled, asset graph `6041201b4b838345ae33`.
- The production browser was reloaded with the new document before acceptance; changing only
  the hash route does not load a newly deployed app bundle into an already open tab.

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
browser action, not a synthetic API screenshot. After deployment, COST's heading actions and inline
map exposed those seven records despite the pending overview. The temporary follow was then removed;
the production watchlist returned to its original 43 stocks.

In the released production watchlist, List was selected and Overview was second. Clicking YTD once
placed SNDK, AEHR and AXTI first; clicking again placed OKLO, NKE and COIN first. These names record
the observed order during acceptance, not an investment ranking. NVDA's released map retained all
118 records across the three lanes. Expand all grouped Investment TALK's context records as 26 records
from 13 original posts, with a local disclosure for the remaining 24 records. Opening it preserved
individual dates and the notice that three records shared one original post; the author heading
linked into that creator's history. These are presentation checks, not a new audit of every claim.

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

- Full local Node suite: 614 passing; final source-repeat refinement: 48 focused tests passing.
  Merged-release copy lint: 3,157 files, zero failures; link check: 1,274 links; export tests: 3 passing.
  Both CI runs repeated the required gates successfully.
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

## Follow-up: English author-count grammar

The production MU source audit exposed incorrect singular labels in author groups. Single records,
single original sources and the final single-record expansion now have proper EN/ZH translations.
The eight 320×650 / 390×650 × EN/ZH × light/dark synthetic stock-page checks showed no document
overflow, 522px main viewport, correct source counts and the one-record disclosure. Four representative
screenshots were visually reviewed. Viewport override was reset afterward. Full local frontend suite:
614 passed; copy lint 3,259 files; link check 1,274 links. No source counts, grouping, citations or API
behavior changed. Production publication remains separately recorded.
