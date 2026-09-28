# Activity layout reference and integration audit

Status: local prototype implemented; production interface contracts inspected and two public GETs
verified. Browser prototype remains synthetic, with no production account access or notification
activation. No backend code, worker configuration or service state changed.

## Reference and design decision

Reviewed [Stocks.News](https://stocks.news/) in the browser and its
[App Store listing](https://apps.apple.com/us/app/stocks-news-market-alerts/id6476615803).
The current public homepage is an app-acquisition page. Its Insider Activity preview foregrounds
the person/role, ticker, event and amount; scanner, alerts, watchlist and news have distinct labels.
This is observation of public promotional UI, not an authenticated walkthrough of its native app.
No native app was installed and no account or purchase flow was entered.

Adopt the clear category names, compact fact rows and direct stock context. Retain Ducky's five
primary destinations. Activity lives prominently inside Explore, with smaller Today and stock
previews and Watchlist links. Preserve records of purchases and sales, original time meanings and
amount ranges. Do not import performance promises, simulated trading, unsupported real-time labels,
or all-market rankings calculated from a single result page.

## Delivered layout

- Explore has Research and Disclosures/events tabs. Activity supports category, ticker, search and
  watchlist-only scopes. Source details retain report period, transaction and publication dates.
- Categories map to actual kinds: Insider (`insider,cluster`), holdings (`13f`), political
  disclosures (`political`), company events (`partner,stake,news,index`). Unsupported developer-feed
  rows are excluded from the pure adapter; they are not presented as a connected news source.
- Macro, technical/options, creator and calendar capabilities link to their existing product homes.
- `activity-adapter.js` projects the existing archive structure without fetching or generating data.
  The six fictional examples use that input structure and canonical locale copy.
- Missing amounts/dates stay missing; political amounts stay ranges; joint-filer totals are not
  multiplied by owners. 13F absence is not a sale, and options/unresolved securities have no stock action.
- A source-date review flag and an official event's effective date remain visible in details.
  Following a stock keeps the activity search/scope and restores a usable focus target.

## Existing interfaces and remaining wiring

Audited frontend baseline `a6d4948` and backend `a4851d0c861f6356d52abffe2a18a871b2329848`.
Evidence in the frontend: `public/js/app/views/boards.js`, `views/record.js`,
`watchlist-signals.js`, `views/watchlist.js` and `record-format.js`. Two bounded agents separately
checked the backend response definitions and existing frontend callers, then reviewed the adapter.

| UI need | Existing read contract | Remaining work |
|---|---|---|
| Activity rows | `/radar/archive.json` with kind, ticker(s), q, dates and before cursor | Use account-aware `api.js`; render real access and missing/stale states |
| Full record | `/radar/record.json?id=…` → `{item}` | Keep stable ID and full source text; source links must resolve to the actual filing |
| Coverage | `/radar/coverage.json` → `{sources, access}` | Show actual status, last success, gaps and limitations; source availability is not implied by a timer |
| Filter facets | `/radar/facets.json` | Keep server-owned available sectors; do not fabricate counts |
| Watchlist summaries | Archive `fields=signals&tickers=…` | Honor partial/cursor and account scope; compact rows lack some detail/date precision |
| Stock facts | `/briefing/stocks?fields=signals` | Use verified evidence and clocks already shared by stock/watchlist |

The public versions prepend `/public`; authenticated and public access are not interchangeable.
Full activity lists should use full archive rows. Amount ranking, trade-date ordering, complete
category counts, person identities and profiles require separate contracts; no such feature is
claimed in this preview. House disclosure coverage must not imply equivalent Senate/executive
coverage. Archived partnerships and covered official events do not constitute all company news.

At 2026-09-28 ~17:40 UTC, two credential-free reads returned HTTP 200:

- `/public/radar/archive.json?kind=insider&limit=1`: one row; actual top-level keys include
  `items,next_cursor,filter_version,access,as_of,market_epoch`. Row `extra.facts` contains
  owners, transactions, side, total_value, sale_values and venue_rule. The returned source date
  was September 23 and observation time was separately present.
- `/public/radar/coverage.json`: seven source entries with status, last_attempt, last_success,
  gap_count and limitations. Both responses explicitly reported five-day delayed public access.

Only response structure, dates and access metadata were retained here, not member data or secrets.
These checks establish readable public contracts, not authenticated end-to-end integration or
proof of current worker health. The preview CSP remains self-only; it never fetches those endpoints.

## Validation and persistence

Prototype integration and adapter checks: 18 test nodes pass. Existing frontend suite: 773 pass.
Adapter regressions cover original clocks, unknown/zero amounts, range preservation, 13F absence,
option exclusions, source URLs, unsupported kinds and pagination/access metadata. Journey checks
cover filters, stock context, modal close, follow/return state and both languages.

Browser validation covers desktop, 390×650 Chinese/dark and 320×600 English/light. Initial phone
controls obscured useful rows; reduced wrapping and moved amount/action ahead of long descriptions.
Checks use viewport emulation, not physical touch devices. Source dialog and empty-filter behavior
remain part of the visible walkthrough. The final narrow layout exposes ticker, amount and actor in the initial reading area.

The durable [change register](../docs/ux/change-register.md) records all prior UX changes plus this
slice and identifies unconnected features. Pre-slice rollback reference: `a6d4948`.


Final browser sweep: Today, NVDA overview, Watchlist List/Overview, Explore research and Explore
activity all have document width equal to viewport width at 320px English/light and 390px
Chinese/dark. In the 320×600 reading viewport, the first record starts around 390px at top scroll;
the amount and actor are visible above the 64px bottom navigation. The 390×650 first row starts at
404px. Type/search controls retain 44px targets and search input remains 16px. Source detail was
opened and closed with Escape at both desktop and phone sizes. No browser console errors occurred.
Copy lint passes (4,055 files); internal links pass (2,067 links). Generated calendar output from
the build was restored; no production artifact was included in this change.
