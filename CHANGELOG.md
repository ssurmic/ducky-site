# Change log

## Adding a stock from the search box shows the whole list again · 2026-09-12 (in review, not deployed)

Owner report on the live app: with three stocks on the list, searching for a stock the list did not have
and pressing "Add to watchlist" left the page showing "4/50 stocks" above a table with only the new stock,
which read as the earlier stocks having failed to load. They were still on the list: the search text that
found the stock stayed in the search box, so the table kept filtering by it after the add.

- **Watchlist add**: a successful add (from the search offer or the Add form) clears the search box and
  its filter, so every stock is listed with the new one; the new row is scrolled into view, and when the
  add came from the search offer (whose button disappears) focus moves onto the new row's name. A failed
  add (limit, network) leaves the search text in place for a retry. No API or membership change: the same
  `POST /watchlist` and the same membership reload as before.
- Tests: `tests/watchlist-selection.test.js` gains the regression (search → option → add → all four rows,
  empty search, count 4/50, focus on the new row); the `tests/watchlist-overview.test.js` case that asserted
  the search text survived the add now asserts the opposite. `tests/browser/watchlist-add.mjs` (new,
  synthetic fixture only) records the flow on desktop EN dark and phone ZH light; the fixture gains a
  writable `watchlist-add` case with three stocks and a symbol search that can find COIN.
- Evidence: [acceptance record](reports/WATCHLIST-ADD-FILTER-2026-09-12.md); before/after screenshots and
  measurements under `reports/watchlist-add-filter-20260912/`.

## Creators open on their latest views; insider column reads local Form 4 records · 2026-09-12 (deployed)

Released through `scripts/deploy_pages.sh`: main `1858a406` (PR #55) → Pages `7a563a0a` at 2026-09-12 23:51 UTC; the live `config.js` serves VERSION `1858a406`. Backend counterpart `a6d09163` (ducky-bot PR #89) was released to the host at 23:47 UTC, so the dated-facts path is live end to end.

Owner feedback on the live app: the creators page made you pick a creator first and listed videos whose
summary was still being prepared ("no full summary yet", "request a summary"); the watchlist showed
"data pending" for insider buying, option walls and support wherever a stock's brief text was awaiting a
recheck, even though those are local records.

- **Creators, "My creators"**: the default view is each followed creator's latest views, one line each
  (stock, direction, the creator's claim, date, video), newest creator first, four lines per creator
  with the rest behind one disclosure. A line opens the source in a card: the video, its attributed
  views with the chosen one focused, the full reviewed summary with timestamps, the original video at
  that moment, and the same exits as before (view history, simulate, research map). The creator's
  name opens that creator's page as before. No creator picker, no "include unverified" toggle, no
  "request a summary" button; discovered videos without a reviewed summary are listed nowhere (an
  exact source link still reaches them with their date and original link).
- **Watchlist insider column**: read from the archived Form 4 records for exactly the watched stocks
  (`/radar/archive.json?kind=insider&start=…&tickers=…&fields=signals`, last twelve months, records
  held for date review skipped). "None" is claimed only on a complete page; the brief's copy of the same
  filings is the fallback when the archive read fails. Option walls and support now also read a brief's
  last saved facts while its text is pending (`facts_status: dated`, ducky-bot PR #89), so a pending
  brief no longer turns three columns into "data pending".
- Tests: `tests/creator-latest-views.test.js` (new), `watchlist-signals.test.js` extended;
  `tests/app.test.js` no longer looks for the removed toggle. Nine new `app.creators.*` keys; the four
  `request_*` keys removed.

## Quote age, one price per stock, honest 13F pages and a lighter boot · 2026-09-12 (deployed)

Follow-up to the same-day read-path audit ([report](reports/UX-UPGRADE-2026-09-12.md), "Third round").
Released together with the entry below through `scripts/deploy_pages.sh`: main `855c1b83` (PR #53) → Pages
`19d270f3` at 2026-09-12 21:52 UTC; the live `config.js` serves VERSION `855c1b83` and the sign-in page
renders with the deferred Telegram SDK. The 13F `tickers=`/`fields=signals` reads need ducky-bot PR #86
deployed on the host; until then the backend ignores both parameters and the column falls back to the
previous market-wide page shape.

- **Quote clocks**: each quote line reads "Latest quote · just now / N min ago / N h ago" (the print's own
  New York time beyond six hours), timed from the server's `age_seconds` plus elapsed time since arrival and
  re-timed every 20 s in place; after 180 s it reads "Saved quote" (`quoteNote`, `retimeQuotes`;
  `currentQuote`, which nothing used, is removed).
- **One number per stock**: map tiles, breadth and tooltips use the same displayed value as the list rows;
  the map heading says when quotes are shown. YTD is labelled "Year to date · adjusted" and the prices
  method note names the basis difference.
- **13F column**: reads `/radar/archive.json?…&fields=signals&tickers=…` for exactly the watched stocks
  (fifty per page, merged) instead of the market-wide newest page; option lines are dropped, one amended
  report per fund and quarter counts once, implausible quarter-end marks are withheld; "No adds in tracked
  funds' 13F filings" appears only when the page was complete, otherwise "Not in the latest {n} 13F
  records"; the method line counts filings. Requires ducky-bot `perf/read-path-20260912` for the filter
  (older backends ignore the parameters and return the previous page shape).
- **Briefs**: `/briefing/stocks?fields=signals` (same backend branch) returns only the four fact topics
  the columns read.
- **Boot and polling**: the per-stock `/snapshot/{T}` fan-out at boot is removed; the first page after
  boot reuses the boot `/watchlist` read once (`api.bootRead`) while later entries still revalidate;
  `served_at` and quote `checked_at` are not treated as new data; watchlist detail snapshot reads carry
  `observe:false`; a skeleton replaces the loading spinner; the filter debounces rebuilds above 60 stocks;
  the research map no longer double-fetches on a free account's selection sync; the app shell preconnects
  to the API origin and defers the Telegram SDK.
- Tests: 734 pass (`tests/watchlist-overview.test.js`, `watchlist-signals.test.js`,
  `shared-read-refresh.test.js`, `evidence.test.js`, `initial-research-recovery.test.js` updated or
  extended); `lint_copy`, `check_links` OK. Five new `app.watch.*` keys; `app.watch.signal_funds_none_since`
  removed.

## Watchlist signals, research-map folding, richer Today and simulator entry · 2026-09-12 (deployed)

UX pass over the signed-in app on `codex/ux-upgrade-20260912`; no API, model or investing-algorithm change.

- **Watchlist list** gains four sortable signal columns between Market cap and YTD: insider buying
  (Yes/No with reported value, filing count, latest date and owners), 13F adds (fund name, report period,
  filing date), option walls (call/put strikes with distance to price and expiry) and support references
  (nearest recorded reference below price plus a 20-day closing-range bar). `watchlist-signals.js`
  derives them from two shared, read-only pages, `GET /briefing/stocks` (saved stock-brief facts) and
  `GET /radar/archive.json?kind=13f&direction=1` (newest reported-share increases), so the list route
  and the shared revalidation budget are untouched. Unknown values sort last; a methodology disclosure
  states each source, window and limit. Copy never calls a level a target, floor or guarantee.
- **Research map**: recorded facts and events inside a lane fold by topic (filings & ownership, price &
  technicals, relative performance, options & volatility, discussion, macro, other) with three cards
  visible per topic and the rest behind one disclosure; after expansion, authors who only mention the
  stock fold into one closed group; expansion is gradual (twelve more, or all). Each lane draws a spine
  with a stub and port per displayed card; hovering or focusing a card highlights records from the same
  original source or author and links them with dashed wires; the center card shows the retained-record
  balance across lanes. Every record, number, stance and repeat-source label is retained.
- **Today** asks for twelve records per page, reads the newest publication first inside a page, widens
  once from an empty "Today" to the past seven days with a visible note, and decorates cards with the
  record's stance rail, source mark, author initial and the saved watchlist quote; the header shows a
  small stats strip. The quote read (`GET /watchlist`, already shared and cached) never blocks the feed.
- **Creators**: the simulator tab reads "Simulate a view"; each verified post offers "Simulate this view",
  which opens the simulator on that exact recorded view; an empty simulator explains what it needs and
  offers the fictional scenario once; pending videos render as quiet rows and Pro accounts can request a
  creator's summaries (`POST /kol/{id}/analyze`, server cooldown respected).
- **Shell**: the five-tab bar lights the tab a route belongs to (stock briefs light Watchlist; account and
  sign-in pages light nothing instead of Explore); a short page entrance; stale three-column nav rules,
  orphaned watchlist research-row rules and the removed creator journey stepper are deleted.
- **Owner review round (same day)**: every one-sentence analysis (watchlist Overview mode, Today rows, the
  inline table reading) now lists its cited records under the sentence — number, stance, author, title, date,
  and a "Latest" mark on the newest — instead of two floating footnote numbers; inline numbers shrink to
  26px because the list rows carry the 44px targets. Insider buying shows the volume-weighted average
  purchase price and share count. The 13F column reads "Fund adds" with a plain hint under every signal
  header ("13F quarterly holdings, shares up", "Form 4 filings, 12 months", …) and "13F filed" dates.
  Leaderboard rows gain an agreement bar against the 50% mark with N beside it and direct "Call history /
  Simulate a view" actions; call-history cards show a settled 20-session result on the closed card and a
  "Simulate this view" step on every verified directional view. Today re-reads its first page once a minute
  while visible and adds newly published records in place (no search or cursor replay).

- **Second review round**: every signal header has a "?" that opens a plain-language explanation (what the
  column is, where it comes from, its limits) instead of a hint line; the 13F column reads "Large fund adds /
  大基金加仓"; each signal cell is one button that opens a flashcard listing the records behind the number
  (insider filings with buyer, role, shares × price, value and source link; fund adds with share change,
  quarter-end reported price, the report quarter's close range and source link; option walls and support
  references), ending in the same two exits — "View all filings" (or "Open chart") and "Open research map".
  13F report periods read as quarters ("2026 Q2"); the fund cell shows the quarter close range when the
  backend supplies `facts.quarter_price_range` (read-time derivation in `radar_archive.page()`, backend
  branch `feat/13f-quarter-price-range-20260912`). Signal columns have fixed widths so cells never squeeze;
  notes clamp to two lines; the table grows to 1860px and scrolls.

Tests: 730 frontend tests (21 new across `watchlist-signals`, `evidence-topics`, `today-feed`,
`creator-simulation-target`, `focus-navigation`, `stock-citations`), bilingual build, copy lint, link check
and Python checks pass. Acceptance and open items: [reports/UX-UPGRADE-2026-09-12.md](reports/UX-UPGRADE-2026-09-12.md).

## Today leads with sources published in the period · 2026-09-12 (deployed)

The research-updates feed on Today and Explore is ordered by record availability, so a re-projected
Form 4 from April rendered as "Revised record" at the top of "Past 7 days" and a fresh video sat
below it. `views/today.js` now keeps a record in the main feed only when its source was published
inside the selected period (`isFreshChange`, calendar-day comparison in the viewer's zone) and folds
the rest under one closed disclosure, "Older sources updated (N)", with a one-line note; pagination
keeps filling both. No request or API change. Test in `tests/product-focus.test.js`. Released through
`scripts/deploy_pages.sh`: main `713f0fcb` → Pages `cfca997c` at 2026-09-12 08:19 UTC; verified in the
browser (Explore, Past 7 days: "Older sources updated (5)" folded, no April filings in the main feed).

## One gated release path for the Direct Upload Pages project · 2026-09-12 (deployed)

`scripts/deploy_pages.sh` publishes the reviewed `main` tip: it refuses unless HEAD equals
`origin/main` and the tracked tree is clean, runs the exact CI gate (build, node tests, export
unit test, `lint_copy`, `check_links`, landing sanity), publishes with `wrangler pages deploy`
carrying the commit hash, then verifies the live `config.js` `VERSION` and prints the served CSP.
First release through it: main `43de210b` → Pages `eef06b96` at 2026-09-12 07:29 UTC, which also
published the three commits (`#46`, the 2026-09-12 notary data, `#49`) that had been sitting on
`main` while production still served `6fcf7b38`. `.github/workflows/deploy-pages.yml` stays gated
on a Pages token the repository does not have; until an operator adds one, this script is the
release path from any machine with a wrangler login.

## Allow the Cloudflare Web Analytics beacon through the CSP · 2026-09-12 (deployed)

Cloudflare Pages injects `https://static.cloudflareinsights.com/beacon.min.js` on every
response, but the site CSP only admitted `'self'` and `https://telegram.org`, so every
browser blocked it (console: `violates ... "script-src 'self' https://telegram.org"`) and no
page view has ever reached Cloudflare Web Analytics. `script-src` now admits the beacon and
`connect-src` admits its POST to `https://cloudflareinsights.com`; nothing else in the policy
changed. `tests/headers-csp.test.js` pins the rendered `dist/_headers`. The pinned string in
the backend `SYSTEMDESIGN.md` §5 changes in the same set. Not deployed by this change: the
Pages project is Direct Upload, so a merge alone does not publish. Released with main `43de210b` →
Pages `eef06b96` at 07:29 UTC; the beacon loaded (HTTP 200) with no CSP violation in the console.

## Shared design and continuation references · 2026-09-12

Added a generic agent entry and linked frontend agent/README guidance to the private backend's
shared current technical design and continuation record. Corrected the README's language-route
and app description. The public repository contains references only, not private architecture.
Documentation only; no assets, API behavior, feature flags or production deployment changed.

## Bilingual interactive onboarding · 2026-09-11 (deployed)

New verified accounts receive a skippable, animated tour of real stock/map/chart controls,
then source/video/calendar/disclosure chapters. Help resumes or replays saved progress.
Onboarding works with billing closed and never claims an ungranted trial. Current bulk
watchlist management and navigation remain. 706 tests pass; browser evidence covers both
engines and short phone layouts. Main `6fcf7b3` / Pages `247ad28c` is live; real
production clicks completed 10/10 with saved progress. [Acceptance](reports/open-onboarding/README.md).

## Watchlist removal and capacity · 2026-09-11 (deployed)

Select stocks with left-side checkboxes, review selected tickers and remove them together. Full accounts see their limit and how to free space before adding. Failed removals remain selected for retry; confirmed removals release slots immediately. 694 frontend tests and bilingual phone checks passed. PR42 / main `5c86ada1` / Pages `b2489ad9` passed CI, asset verification and signed-in EN/ZH selection checks. [Acceptance and release](reports/WATCHLIST-SELECTION-2026-09-11.md).

## Today navigation and expandable stock analyses · 2026-09-11 (deployed)

The signed-in duck returns to Watchlist. Today orders stock analyses by their actual update dates, exposes the complete list, and supports per-record expansion with sources. 685 tests, both languages and phone themes passed. PR41 / main `e0457434` / Pages `2308f071` are live. [Acceptance and release](reports/TODAY-NAVIGATION-2026-09-11.md).

## Group repeated creator wording · 2026-09-10 (deployed)

Identical viewpoints from the same video share one headline, with every original
record, excerpt and map link available on expansion. Different qualifications
remain separate. Both languages explain repeat source use; exact point links open
their record. 677 tests and 12 browser layouts passed. PR38 / main `960ebb02` /
Pages `7609ecf0` passed exact CI, public asset verification and live EN/ZH checks.
[Behavior and acceptance](reports/CREATOR-REPEATED-VIEWS-2026-09-10.md).

## Preserve stock scope in source return links · 2026-09-10 (deployed)

Direct source links now retain the current stock when opening the creator's
record, matching ordinary map-card clicks. No additional request or model work
is introduced. All 670 frontend tests and 12 bilingual/theme viewport checks
passed. PR37 / main `35a5713c` / Pages `23cf155b` passed exact CI, public asset
verification and live English/Chinese source-to-creator navigation.
[Bug and acceptance](reports/MAP-SOURCE-RETURN-2026-09-10.md).

## 2026-09-10 · Daily stock analysis and financial creator aggregation (deployed)

Homepage search/share titles now use the owner’s daily stock analysis positioning. Both descriptions explain financial creator aggregation with original sources. The copy check permits only the full approved English descriptor while retaining the trading-call bans. PR36 / main `d5aa72c9` / Pages `63125cd9` passed 669 tests and live bilingual metadata checks. [Validation and release](reports/SEARCH-POSITIONING-2026-09-10.md).

## Read sources in the stock page · 2026-09-10 (deployed)

Map cards open their saved evidence in place, with the original source first and a stock-scoped
creator link. Exact repeated prose appears once; conditions, dates and history remain accessible.
Main `0a754d8f` / Pages `ef8e64f3` passed 668 tests, exact CI and EN/ZH live checks.
[Behavior and acceptance](reports/SOURCE-READING-CONTEXT-2026-09-10.md).

## Saved YTD · 2026-09-10 (deployed)

Retained YTD values show their original dates in English and Chinese and remain sortable.
Main `0cd9fa23` / Pages `2811c752` passed 667 tests, exact CI and bilingual browser checks.
[Contract and acceptance](reports/YTD-RETENTION-2026-09-10.md).

## 2026-09-10 · English default and Google Search Console (deployed)

Root routes now serve English, /en/ remains the canonical English URL and /zh/ holds Chinese. Language links, installation manifests and legacy recovery links retain the intended language. Public pages declare reciprocal language alternatives; the sitemap omits account shells and placeholders. Search Console HTML-tag verification succeeded, the sitemap reports 14 discovered pages, and root/en/zh recrawl requests were accepted. The original fluffy duck favicon is verified live. Main `679a32c1` / Pages `0efeb36c` passed 664 tests and the 23-URL production audit. [Checks and publication status](reports/SEARCH-CONSOLE-SEO-2026-09-10.md).

## 2026-09-10 · Use the fluffy homepage duck in search and browser icons

The favicon and installation icon now use the homepage's original 1254px green
duck at one stable URL. Legacy favicon paths redirect to it, and builds no longer
regenerate the older vector icon. 660 frontend tests, asset checks and copy/link
checks passed. Search-result changes still depend on Google's next crawl.
[Acceptance and publication status](reports/FLUFFY-FAVICON-2026-09-10.md).

## 2026-09-10 · Show actual viewpoints before repeated mentions (deployed)

Map and author previews no longer let generic mentions displace substantive records.
Stock-scoped creator excerpts lead with that stock while retaining the full source
context and exact linked points. All dates, records and separate stance lanes remain.
PR30 / main `e0840269` / Pages `e3a15d95` passed 660 tests and live EN/ZH map/feed checks; [release evidence](reports/CREATOR-READING-ORDER-2026-09-10.md).

## 2026-09-10 · Following a stock preserves existing summaries (deployed)

Following/unfollowing preserves unaffected dated research; an already-read new stock can reuse
its summary and citations. Bounded cache/HTTP/render logs correlate with backend read receipts.
English symbol search supports separate English business labels. PR28 / main `8d2ca66f` / Pages
`69e1817f` passed 658 tests. Live follow/remove/return retained 41 summaries, restoring the original
45 watches after the test. [Release and workflow evidence](reports/SAVED-READ-UX-2026-09-10.md).

## 2026-09-10 · Saved research appears before refresh (deployed)

Watchlist, Today, stock briefs, stock pages and maps reuse recent reads in this login while
fresh GETs run. Network errors retain dated content; withdrawals and access/session changes
remove affected previews. Memory only, bounded to five minutes, with source links preserved.
[Behavior and acceptance](reports/SAVED-READ-UX-2026-09-10.md).

## 2026-09-10 · Compact phone watchlist and sorting indicators (deployed)

Replaced wrapping Unicode sort arrows with fixed-size chevrons and reduced phone
list typography and spacing. Full analysis, dates, fixed stock/map controls,
16px inputs and 44px sorting targets remain. 643 tests, copy/link checks and
eight bilingual/theme phone layouts passed; the same 393px fixture shows three
complete rows instead of two. Runtime `62974f8b` / Pages `d9110fac` passed exact
main CI and production mobile-layout verification.
[Acceptance and release](reports/WATCHLIST-DENSITY-2026-09-10.md).

## 2026-09-10 · Repeated creator excerpt text (deployed)

Reviewed creator excerpts now display an identical title and reason only once.
Distinct reasons, conditions, dates, records and original-source links remain visible
in both languages. This fixes the duplicated MRVL paragraph observed in the live
Parkev Tatevosian video page. All 643 frontend tests, copy lint and 1,274 links passed.
Exact main CI passed; dadfcc6c / Pages b66b1fc7 is live and five public assets match.
[Acceptance and release status](reports/CREATOR-EXCERPT-DEDUP-2026-09-10.md).

## 2026-09-10 · Creator leaderboard and simulator copy (local verification)

Simplified the leaderboard title, introduction and empty state. Simulator options
and results now distinguish one trading day/trade from plural counts; the day label
is shared with one-session report comparisons. Ranking thresholds and simulation
calculations are unchanged. The focused 48-test suite, 22-page build and copy lint
passed. Cumulative English QA: 131 revised strings and seven new bilingual labels.
[Acceptance and release status](reports/english-qa-20260910/README.md).

## 2026-09-10 · English walkthrough fixes (local verification)

Revised 128 English labels and messages, made missing English reports explicit while
retaining originals, and preserved sub-cent prices instead of showing false zeros.
Calendar expiration labels, research-log titles/times and the English track-record
disclaimer are clearer. All 642 tests, copy lint and 1,274 links passed. Source data,
review gates and investing rules are unchanged. Deployment and browser acceptance
remain separate. [Changes, checks and limits](reports/english-qa-20260910/README.md).

## 2026-09-10 · Quote clocks and long-open page recovery (released: da4449b4 / Pages39acb98a)

Current list/stock/map prices share dated quote selection, retaining the newer valid quote on failure. Returning pages revalidate; healthy old releases offer an explicit update without losing forms or auth. Daily metrics and historical evidence retain their own dates. [Checks and limits](reports/MINUTE-QUOTES-MOBILE-UI-2026-09-10.md).

## 2026-09-10 — Recover a failed first research read (deployed)

A failed initial saved-research request used to miss the automatic refresh registry.
The mounted account/page can now retry that GET at most twice through the existing
visible-page refresh schedule. Successful reads resume normal source revalidation;
auth failures, cancellations, rate limits, searches, history and writes are excluded.
The request deadline covers JSON body consumption, and watchlist diagnostics distinguish
read, shape and rendering failures without logging response text or account data.
List-first ordering, header sorting and dated source dialogs remain intact.
PR #18 and exact main CI `34508908792` passed all 628 tests. App `680086e7` /
Pages `31db4766` is live; four public assets match. Signed-in EN/ZH each loaded
43 watched stocks and 27 dated paragraphs without a read error in these two trials.
Synthetic first-failure recovery is verified; the earlier intermittent production
error has not yet recurred with the new diagnostics, so its cause remains unproven.
[Tests, browser checks and delivery status](reports/INITIAL-RESEARCH-RECOVERY-2026-09-10.md).

## 2026-09-10 — Show the analysis date in collapsed watchlist rows (deployed)

The list now shows the saved analysis date and previous-version status before expansion,
using the same source-bound reading metadata. Loading/failed reads do not acquire a false
analysis timestamp. On the narrowest phones, the overview column fits beside the fixed
stock/map column when scrolled into view. No extra requests or inference. 620 tests and
EN/ZH light/dark 320/390px browser checks passed. Exact main CI passed; `de788804` / Pages `020b808c` is live and three asset hashes match. Live EN/ZH dates verified; a transient English read failure still needs diagnosis. [Acceptance](reports/VISIBLE-ANALYSIS-CLOCK-2026-09-10.md).

## 2026-09-10 — Show each full creator note once (deployed)

Expanded call history repeated the same long note in both the reader and its shared
claim-details component. The reader now renders that paragraph once while retaining
conditions, horizons, reasons, original evidence and revision dates. Other readers
keep their existing full-note behavior. All 619 frontend tests, copy lint and 1,274
internal links passed. App `a3c03e39` / Pages `008ba58b` passed exact main CI; seven public asset hashes and live EN/ZH source details verified. Original timestamps, video links and losses remain visible. Rollback: `92026a55` / Pages `7a25997b`. [Implementation and acceptance](reports/CREATOR-DETAILS-2026-09-10.md).

## 2026-09-10 — Show followed creators' history on the first page (deployed)

Following now reaches the API before pagination, so other creators' recent records cannot
leave the first page empty. Later pages keep the same filter; a changed-scope cursor retries
from the first page. Discover still includes unfollowed creators. Full frontend suite:
618 passed; PR #13 and exact main CI `34484377137` passed. App `92026a55`, Pages
`7a25997b`, graph `1fd559894eca2fda7830` is published; six public asset hashes match.
Signed-in English and Chinese first pages display 16 views in 8 creator–stock groups.
AVGO expansion preserves three records, source timestamps and a negative recorded-price
change; 20-session results remain explicitly unfinished. List-first ordering and direct
maps work when NVDA's summary is unavailable. Backend `175a7675` filters within current
account access and reads subscriptions without cold schema migration. Rollback: app
`533cd73d` / Pages `ce3835e3`. Existing translation/entity concerns remain content work.
[Evidence and acceptance](reports/CREATOR-HISTORY-PAGE-SCOPE-2026-09-10.md).
## 2026-09-10 — Distinguish reading from unfinished generation (deployed)

Watchlist prices can arrive before the saved research response. Empty cells now say “Loading saved analysis…” during that read, then show the actual accepted, pending or failed state. Existing paragraphs remain visible during a refresh. Sorting and direct maps remain usable while research loads; no extra request or generation is added.

The issue was observed on the signed-in production list: initially pending-looking cells subsequently became 27 accepted summaries out of 43 watched stocks. This is a point-in-time reading count, not population coverage. All 615 frontend tests, copy lint and 1,274 links passed. Eight synthetic 320/390×640 bilingual light/dark checks retained a 512px main viewport and first row at y=335.2, with no document overflow. A delayed response replaced four loading cells in place.

[PR #11](https://github.com/ssurmic/ducky-site/pull/11) and exact main CI `34471677296` passed. App `533cd73d`, Pages `ce3835e3`, graph `1cdf551933238f0208fb` is published and its public config verified. Signed-in ZH/EN lists showed List first, Overview second, 43 direct maps and 28 accepted paragraphs, including NVDA's earlier normal retry. The IV/HV header sorted successfully. This UI change does not claim new research generation. Rollback: app `8d19f7d6`, Pages `c353399b`.

## 2026-09-10 — Summary details use the available space (deployed)

The shared stock analysis can contain two sections when there is no source-backed verification task. The reasons panel now fits the actual section count instead of reserving a blank third column; phone layout remains one column. Source links and old three-section records keep working without network work on expansion.

615 frontend tests, copy lint and 1,274 links passed. Local 320/390×640 bilingual light/dark stock QA had no overflow; full-map checks and 1280×800 desktop confirmed one/two-column layouts. These are synthetic viewport tests, not physical devices. Backend generation and independent review acceptance are recorded in the central `ANALYSIS-SECTION-ROLES-2026-09-10.md` report.

[PR #9](https://github.com/ssurmic/ducky-site/pull/9), its PR check and [exact main CI](https://github.com/ssurmic/ducky-site/actions/runs/34470116055) passed. Published app `8d19f7d6`, Pages `c353399b`; production config and the served responsive CSS were verified. JavaScript graph `7fb856aa26c6f941c953` is unchanged. Rollback: app `8b6aba6b`, Pages `4abe5bfd`. This publishes rendering support, not a claim that every stock already has a newly reviewed summary.

## 2026-09-10 — Singular author-history counts (deployed)

The signed-in English MU page exposed “1 records” and “1 original sources.” Author-group headings
and the one-more-record disclosure now use singular translations; plural counts and Chinese remain
consistent. This changes wording only, not records, grouping or source identities.

Validation: 614 frontend tests; bilingual copy/link gates; 320×650 and 390×650 stock/map-page QA in both
languages and light/dark themes. All sixteen checks had no document overflow and 522px main viewport;
visible screenshots confirmed the single-source author group. These are synthetic viewport checks,
not physical phones. [PR #7](https://github.com/ssurmic/ducky-site/pull/7) and exact main CI passed.
Published app `8b6aba6b`, Pages `4abe5bfd`; production config and the signed-in English MU page verified
“1 record · 1 original source” at 10:23 UTC. The corrected MU source card remains readable while its
whole-stock summary awaits review.

## 2026-09-10 — Restore visible maps, creator history and calendar (deployed)

List is the default watchlist on desktop and phone, with the saved overview in a table column and
clickable sorting headers. Stock rows and pages link directly to the information map; existing facts
remain visible during summary preparation. Bullish/context/bearish lanes group authors and flag
repeat sources without removing source history. Calendar and Creators return to primary navigation.
Explore and first-use Today include clearly dated, clickable examples.

Published in [PR #5](https://github.com/ssurmic/ducky-site/pull/5), app commit `20a803ee`,
Pages `1d9c25b3`. Both PR/main CI passed. Production browser verified COST onboarding and cleanup,
YTD sorting in both directions, NVDA's 118-record map and Investment TALK's author grouping.
Validation: 614 full-suite tests, 48 focused tests after the final refinement, bilingual copy/link
checks and three export tests. Reviewed-summary coverage remains partial.

Acceptance, real COST onboarding steps and limits: [visible core workflow](reports/VISIBLE-CORE-WORKFLOW-2026-09-10.md).


## 2026-09-10 — Connected stock reading (deployed)

- Make Today, Watchlist and Explore the default navigation in Chinese and English. Keep advanced tools and historical links accessible.
- Read the same saved stock summary in Today, Watchlist, stock detail and Stock briefs. Adopt completed background updates without interrupting reading.
- Preserve open reasons, exact source citations, keyboard focus and inspected chart dates. Withhold withdrawn content and distinguish unavailable states.
- Show dates for numeric source records and retain each older analysis's original date and source snapshot.
- Improve stock/source touch targets to at least 44px and retain 16px phone inputs.
- Validation: 609 JS tests; bilingual build; copy lint (3,225 files, zero failures); link check (1,266 links); three export tests. Mobile viewport and route evidence: [connected-reading report](reports/CONNECTED-READING-2026-09-10.md).
- Limits: not a market-data entitlement upgrade or completed human study. Backend pilot coverage at 08:11:56 UTC was 8/10; two drafts still retried. Publication: PR #3, commit `7cd5f6ab948e89e63b94ed51b68cc273c22c22ec`, Pages `6a399330`; both PR and main CI passed. Public config and signed-in GLW verified. At 08:28 UTC coverage was 9/10; NVDA still retry. Full receipt in the linked report.

## 2026-09-10 — Shared stock briefs and same-origin preview

Published from `4ae19a20b88d9e825e86cb436d2e4bee5faa80cf` in [PR #2](https://github.com/ssurmic/ducky-site/pull/2), Pages deployment `1b394637`. Stock briefs reuse the shared stock analysis rather than a separate half-day narrative; bilingual preview paths use the same API and release asset graph. Validation: 604 JS tests, copy/link/export gates and production browser inspection. The preview-only navigation decision is superseded by the next release at the owner's request.
