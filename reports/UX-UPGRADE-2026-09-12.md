# UX upgrade: watchlist signals, research-map folding, Today, creators · 2026-09-12

Status: implemented on branch `codex/ux-upgrade-20260912` (worktree `ducky-site-ux-upgrade-20260912`, based on
`main` `b0d3f22`). Not merged, not deployed. Backend `web` was read at `44704787` for API shapes; no backend
file changed.

## Why

Owner request (2026-09-12): make the app smoother and more legible on phone and desktop without changing what it
does. Specifically: pack insider buying, recent fund adds, a rational support reference and call/put levels into
the watchlist list view; make the research map's "134 facts & context" readable and show connections; make Today
reflect the latest content and stop looking flat; make the creator page's buttons lead somewhere, especially
"simulate a view".

## What changed

### Watchlist list (`views/watchlist.js`, `watchlist-overview.js`, new `watchlist-signals.js`)

Four sortable columns after Market cap. Each reuses the metric-cell grammar (label, value, note, status) and the
existing header-button sorting, so unknown values still sort last and focus/scroll survive re-renders.

| Column | Source | Value shown | Sort key |
| --- | --- | --- | --- |
| Insider buying | `GET /briefing/stocks` facts `reported_insider_purchase` (Form 4 code P, ≤4 filings, 12 months) | Yes/No chip · reported shares × price · filing count · latest date · owners | total reported value |
| 13F adds | `GET /radar/archive.json?kind=13f&direction=1&limit=200` (newest reported-share increases / new positions) | Yes/No chip · fund name · report period · filed date; "No adds since {oldest record}" when the page holds none | number of adds |
| Option walls | brief fact `option_concentrations` | Call and Put strikes with % distance to price, expiry | distance above the put wall |
| Support refs | brief facts `option_concentrations.put_wall` + `price_position` (20 closing sessions) | nearest recorded reference below price, its % distance, and a 20-day range bar with the current position | distance to the nearest reference |

Rules kept: the list route (`GET /watchlist`) is unchanged; the two extra reads are shared, memoized pages,
requested with `observe:false` so they do not enter the shared revalidation budget reserved for prices and saved
research, and a failure leaves the column in a dated "Data pending" state. Copy uses "reference", "potential
support area", "not a forecast or a guarantee"; no target price or floor language (copy lint passes). A
"About the signal columns" disclosure states every source, window and limit.

Not done, deliberately: there is no fair-value or intrinsic-value model in the backend, so a true "rational price"
cannot be shown without a new producer; the support column uses recorded reference levels only. 13F coverage is
the newest 200 add records; a stock absent from that page reads "No adds since {date}", never "no fund holds it".

### Research map (`views/evidence.js`, new `evidence-topics.js`)

- Facts and events inside a lane fold by topic in a fixed order (filings & ownership, price & technicals,
  relative performance, options & volatility, discussion, macro, other); three cards visible per topic, the rest
  behind one `details` with a stable `data-reading-key`. A lone record needs no heading.
- After the reader expands, authors whose records only mention the stock fold into one closed group
  ("Mentions without a stated direction · N records · M authors"); records, dates and repeat-source labels stay.
- Expansion is gradual: "Show 12 more" and "Show all viewpoints"; the first screen keeps six balanced points.
- Connections: one spine per lane with a stub and port for every displayed card (desktop SVG; a CSS spine on
  phones); hovering/focusing a card highlights records from the same original source or author (`is-related`)
  and draws dashed wires between them; the center card shows a record-balance bar with the three lane counts.
- Author grouping, citation numbers, stance ownership and counts are unchanged (existing tests pass unchanged).

### Today (`views/today.js`)

Twelve records per page (was five); inside a page the newest publication reads first; when "Today" returns
nothing on arrival, the view widens once to the past seven days and says so (a manual range choice is
respected). Cards carry the record's stance rail, source mark, author initial and the saved watchlist quote;
analysis rows show record counts and quotes; the header shows "N new records · 7d" and "N stocks with a current
analysis". Quotes come from the already-shared `GET /watchlist` read and never block the feed.

### Creators (`views/creators.js`, `views/creator-simulation.js`, `api.js`)

- Tab copy: "Simulate a view / 观点模拟". Each verified post gets "Simulate this view", which opens the simulator
  on that exact post and point instead of the first row.
- Empty simulator: title, what it needs, and one "Try a fictional scenario" button.
- Pending videos render as quiet dashed rows; Pro accounts see "Request a summary" (`POST /kol/{id}/analyze`);
  429 shows "Requested recently".

### Shell

`selectNavigation` lights Watchlist for stock briefs and stock-scoped tools, nothing for account/sign-in pages
(previously Explore). A 180 ms page entrance (disabled under reduced motion). Dead CSS removed: three-column
nav rules, orphaned `.watch-research-*` rows, `.creator-journey`.

## Owner review round (2026-09-12, same day)

Feedback: the Overview mode's two footnote numbers were not intuitive; insider buying should show the average
price; ordinary readers do not know what 13F means; call history and the leaderboard deserved polish; and does
everything update automatically when a creator posts a new video.

- `stock-reading.js` `citationList()`: under every one-sentence analysis, the cited records are listed with
  number, stance chip, author, title, date and a "Latest" mark on the newest cited record; each row opens the
  same stored source as the inline number. Inline numbers are 26px; the rows are the 44px targets.
- Insider cell: volume-weighted average purchase price and total shares (`insider.average`, `insider.shares`),
  then value · filings · latest date, then owners.
- 13F column: label "Fund adds / 机构加仓", header hint "13F quarterly holdings, shares up", cell clock
  "13F filed {date}". Every signal header carries a one-line plain-language hint.
- Leaderboard rows: rank, eligibility chip, agreement bar with the 50% mark and `N=` beside the rate, the
  three stat tiles, and "Call history" / "Simulate a view" actions. Call-history group cards show a settled
  20-session result when ready; each verified directional view has "Simulate this view", which opens the
  simulator pre-selected on that post and point.
- Today: while the page is open and visible, the first page is re-read once a minute (`observe:false`, no
  search or cursor replay, paused when hidden/offline) and records that were published since are inserted in
  place; open disclosures and reading position are untouched. The shared revalidation allowlist is unchanged.
- Auto-update along the pipeline is a backend property: the frontend revalidates shared reads (30 s in
  product-focus mode) and now the Today first page (60 s). Whether a newly posted video reaches those reads
  depends on the backend's new-video lane, which the current design record describes as a limited canary with
  real end-to-end acceptance still outstanding; this branch changes nothing there.

## Second review round (2026-09-12)

Feedback: the table looked crowded at the owner's window width; "Form 4 filings, 12 months" under a header
is jargon; wanted an explanation entry ("?"); wanted the 13F purchase price range; wanted a visual entry
like "Open map" so a cell opens a card.

- Header hints removed; a 22px "?" per signal header opens `modal()` with the plain-language explanation
  (`watch.signal_help_*`), the methodology line and the data-source date.
- Every ready signal cell is a `button.watch-signal` opening `signalCard()`: insider filings (buyer, role,
  shares × price, value, filing date, SEC link), fund adds (fund, share change, quarter-end reported price
  = value / shares, report-quarter close range, filed date, SEC link), option walls, support references;
  each card ends with "View all filings" / "Open chart" and "Open research map". Missing cells stay plain.
- Column label "Large fund adds / 大基金加仓"; report periods shown as quarters; fixed signal widths
  (150 / 168 / 132 / 152 px; phone 132 / 146 / 118 / 136) and two-line clamps keep cells readable at 1024,
  1280, 1600 and 1920 px browser widths (screenshots in the preview page).
- Backend counterpart (separate branch `feat/13f-quarter-price-range-20260912` in ducky-bot):
  `radar_archive.page()` attaches `facts.quarter_price_range` to 13F rows at read time from `prices_daily`;
  stored records, hashes and revisions are untouched, so no backfill or "revised record" noise is needed.
  `bin/tests/test_radar_archive_quarter_range.py` covers window bounds and hash invariance; `arch_lint`
  passes. Insider average price is computed on the frontend from the Form 4 transactions already present.

## Third round: read-path audit and fixes (2026-09-12)

The owner asked why prices sometimes refresh slowly or look wrong (including YTD), and for a review of the
price, 13F/insider and list read paths that would hold beyond 48 watched stocks. Three read-only code
reviews were run (quotes/YTD; 13F/Form 4 pipeline; frontend load and polling). Findings and what changed:

**Why a price can look slow or wrong**

- A quote's age was invisible: rows showed "Latest quote · Sep 12, 04:00 PM EDT" with no relative age, and
  the "latest/saved" label only moved when a new response arrived. Rows now show "Latest quote · just
  now / 2 min ago / 1 h ago" (the print's own New York time after six hours), computed from the server's
  own `age_seconds` plus the time since the response arrived, so a skewed browser clock cannot mislabel
  a row; a 20 s timer re-times the labels without re-rendering (`quoteNote`, `retimeQuotes`).
- List and Overview disagreed: list rows used the newest provider quote, map tiles and the breadth bar used
  the completed close, so the same stock showed two numbers in two tabs. Every surface now uses one
  `display(row)` value; the map heading says "Quotes show their own time" when quotes are present and the
  tile tooltip carries the quote label and time.
- YTD and the daily change have different bases (adjusted vs. unadjusted provider closes); the two
  disclosures were in separate collapsed paragraphs. The YTD column now reads "Year to date · adjusted"
  and the prices method note states the difference in one sentence.
- Backend quote rotation is ⌈N/50⌉ minutes; at 48 stocks one pass covers the list. Outside 09:30–16:00 ET
  the Yahoo regular-session feed only repeats the 16:00 print, so the worker now stops re-requesting
  symbols that already hold that print (bounded fifteen-minute re-checks for the rest), freeing the budget
  for intraday rotation as the union grows. Queue ordering is one bounded read inside the pass budget.
  After the 16:30 ET session flip, YTD repair takes ten symbols per pass instead of three (about five
  minutes for 48 stocks instead of sixteen). Details: ducky-bot `perf/read-path-20260912`.

**13F column could not cover a watchlist**

- The list asked for the 200 newest 13F increases market-wide. Every line of one filing shares its
  filing-date timestamp, so that page is an alphabetical-by-CUSIP slice of whichever single filing is
  newest; a 48-stock list found almost none of its stocks there, and the empty cells then read "No adds
  since {date}", a false negative. The list now asks for exactly its watched stocks (`tickers=`, fifty per
  page, merged) in a compact projection (`fields=signals`, no message prose or raw lines), says "No adds in
  tracked funds' 13F filings" only when the page was complete, and otherwise "Not in the latest {n} 13F
  records". The methodology line counts filings, not rows.
- Option/warrant lines can no longer surface as adds (frontend drops `put_call` rows; the backend repair
  job applies the archive's instrument gate); an amended report for the same fund and quarter counts once;
  a quarter-end mark far outside the quarter's close range (a filing unit error) is withheld.
- Backend: the 13F parser derives value units from the filing date (whole dollars from 3 Jan 2023) and
  skips principal-amount lines; an archive error no longer suppresses the Telegram alert. Recorded for the
  operator, not changed: the firehose state in the repo ends on 2026-06-30 and `deploy/` has no 13F timer,
  so whether a production 13F producer runs must be checked on the host.

**Load path**

- Boot fanned out one authenticated `/snapshot/{T}` request per watched stock (48 requests plus
  preflights) that the default list never displayed; removed. Snapshots load when a row is opened, as
  before, and those detail reads stay out of the shared revalidation budget.
- The first page after boot reuses the boot sequence's seconds-old `/watchlist` read once (`api.bootRead`)
  and still registers it for shared revalidation; every later entry revalidates, as the read cache promises.
- `/briefing/stocks?fields=signals` returns only the four fact topics the columns read (the full brief was
  0.5–2 MB for 48 stocks by estimate, over 90% unused); `served_at` and quote `checked_at` no longer count
  as new data, which removes a spurious "new version available" banner from snapshot polls.
- A skeleton with the list's shape replaces the bare spinner while the first read is in flight; the filter
  debounces rebuilds only above 60 stocks; the research map no longer fetches the same 0.57 MB map twice
  when a free account's selection is synchronised on mount; the app shell preconnects to the API origin
  and defers the Telegram SDK (the one parser-blocking script). The API origin already compresses
  responses (measured: 73,788 → 8,466 bytes for one public JSON file).

**Not changed, recommended next** (each is a separate slice): a per-ticker latest-quarter 13F aggregate
written by the 13F producer, or folding the four signal columns into the shared `watchlist-overview`
projection so the list needs one request; batching `watchlist_metrics.project()` (the publish pass is
O(watched) SQLite scans and would exceed its five-minute timeout around 2,000 watched symbols); a
multi-symbol quote endpoint or provider (rotation is ⌈N/50⌉ minutes today); the O(S²) bilingual-pair CTE in
`radar_archive.page` (130 ms today, 11.6 s at 4,000 signals); `/me/stock-research`'s single-admission lane
(about 0.86 list reads per second per process); `modulepreload` for the default route's five-level import
chain; ETag/304 for the shared projections; list virtualization above ~100 rows.

## Validation

- Frontend (third round): 734 tests pass (`npm test`), `lint_copy` and `check_links` OK; backend
  `perf/read-path-20260912`: 7 new tests in `bin/tests/test_read_path_20260912.py`, full suite and
  `arch_lint` recorded in the ducky-bot CHANGELOG entry.
- Frontend (second round): 730 tests pass (`node --test tests/*.test.js` after `build.py`), including 21 new tests in
  `tests/watchlist-signals.test.js`, `tests/evidence-topics.test.js`, `tests/today-feed.test.js`,
  `tests/creator-simulation-target.test.js`, `tests/focus-navigation.test.js`, `tests/stock-citations.test.js`. Three existing tests were
  adjusted only to exclude the two new read-only signal pages and the Today quote read from request counts.
- `build.py` (bilingual, identical key sets, 33+12+4+7+1 new `app.*` keys), `scripts/lint_copy.py`,
  `scripts/check_links.py`, and the three Python unit suites pass.
- Browser: see the acceptance section below (local build against a synthetic mock API; production sessions were
  read-only during exploration and no production data left the account).

## Browser acceptance (synthetic data, local mock API)

Method: the branch was built with `build.py --api-base http://localhost:8787` and served from `dist/`; a local
Node mock (scratch directory, not in the repo) answered every app endpoint with seeded synthetic data (15 watched
stocks, a 156-node NVDA map, 72 creator posts, 13F rows, brief facts). Viewports were emulated in the desktop
app's browser pane; these are viewport simulations, not physical iOS/Android devices. The production app was
only read during exploration (signed-in session, no writes, no data copied out).

| Check | Result |
| --- | --- |
| Desktop 1440×900, EN, dark: watchlist list | Four signal columns render after Market cap with Yes/No chips, fund names, CALL/PUT strikes with % distance and expiry, support reference with a 20-day range bar; header sorting works; the fixed stock column shades when scrolled. |
| Desktop: research map (NVDA, 156 nodes) | Center card shows the 23 / 126 / 7 balance bar; lanes draw a spine, stub and port per displayed card; first screen keeps six cards; "Show 12 more" and "Show all viewpoints" both present; after expansion the context lane folds into "Filings & ownership 4", "Price & technicals 14 (Show 11 more records)", "Relative performance 17", "Options & volatility 9"; author groups unchanged; hovering a card outlines records from the same source/author and dims the rest. |
| Desktop: Today | Stats strip ("11 new records · 1d", "15 stocks with a current analysis"); cards carry the stance rail, YouTube source mark, author initial and quote chip; 12 cards per page. |
| Desktop: stock page, creators, simulator | Embedded map shows the balance bar; creator tabs read "Simulate a view"; each post offers "Watch original · Call history · Simulate this view"; the simulator opens on a recorded view with the fictional-scenario toggle. |
| Phone 375×812, EN, dark | Bottom bar; watchlist scrolls horizontally with the fixed stock column and the icon-only map action; signal cells wrap to 2–4 short lines and stay legible; Today cards stack the quote chip on its own line; map lanes stack with a CSS spine; map footer buttons fill one row. |
| Phone 320×600, ZH, light | Today stats strip wraps to two tiles; map header, quick take, lane heading "事实与背景 126", topic heading "申报与持仓 2", author groups, "再显示 12 条 / 展开全部观点" all legible; light stance colors applied. |
| Not covered here | Physical devices; the Telegram Mini App shell; production data (signals depend on live brief facts and 13F archive coverage); the creator "Request a summary" 429 path was unit-tested, not exercised in the browser. |

Open items for the owner: the Today feed is still paginated by record availability on the server; ordering by
source publication would need a backend change. A valuation-based "rational price" needs a new backend producer;
until then the support column shows recorded reference levels only.

## Rollback

Frontend only. Revert the branch merge or redeploy the previous `main` tip through `scripts/deploy_pages.sh`.
No database, backend or investing-algorithm change is involved.
