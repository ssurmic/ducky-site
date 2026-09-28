# User journeys and content map

Status: production UI deployed as version `e22240f3`, verified 2026-09-28 at 20:06:21 UTC; see the [follow-up release receipt](../../reports/UX-WORKFLOW-REVIEW-2026-09-28.md#production-release-receipt). PR #105 merged as `e22240f3bc4b7de2641d248585020e47f47d9eb7`; the release gate passed 821 Node and 14 Python tests plus copy/link checks, then published Pages `fcad2151`. These are reading paths and acceptance scenarios, not measured usability gains. Scoped phone and desktop production reads passed at 20:07–20:10 UTC; their exact limits are recorded in the receipt. The [initial `0c904fa3` receipt](../../reports/UX-PRODUCTION-2026-09-28.md#production-release-receipt), [prototype journey report](../../reports/UX-JOURNEYS-2026-09-28.md) and [preview guide](README.md) remain historical evidence.

The released follow-up extends these reading paths with consistent starter/creator stock entries, Today section
jumps and chart keyboard access, a compact Calendar phone stack, metric-first comparison and visible
historical states, direct disclosure archives, and preserved creator/activity/record/alert return
context. These fixes have their own release receipt; they do not inherit the earlier acceptance. The
[integrated review](../../reports/UX-WORKFLOW-REVIEW-2026-09-28.md) coordinates the independent
[newcomer](../../reports/UX-WORKFLOW-NEWCOMER-2026-09-28.md),
[experienced-user](../../reports/UX-WORKFLOW-EXPERT-2026-09-28.md), and
[mobile](../../reports/UX-WORKFLOW-MOBILE-2026-09-28.md) findings and their peer challenges.

## One research destination, several reasons to enter

Explore helps people find a company and choose a research question. Watchlist helps people revisit followed companies and compare readings. Both reach the same stock workspace and metric definitions. Following changes personal scope; it is not a prerequisite imposed by the research route. Existing account entitlements still control access.

The stock workspace answers four questions: **What is the case? What do price and options readings show? What supports or challenges the case? What was recorded when?** Creator views, disclosures and scheduled events retain their own source identities and date meanings.

## Three perspectives

| Perspective | Starting question | Current production path | Successful outcome |
|---|---|---|---|
| Researcher | No watchlist yet; wants to investigate a company and verify its evidence. | Explore → search or dated candidate → Overview / Metrics / Map → exact source → History → optionally follow. An activity record can enter the same workspace. | Read unwatched research within account access, inspect opposing evidence/dates and return to the entry scope. Explore provides per-stock metrics; the prototype's cross-stock comparison is not integrated. |
| Stock beginner | Wants a starting point without interpreting a metric table. | Today or Explore → an available dated stock record → company/research context → support and risk sources → optional follow → Watchlist → Calendar or activity. | Explain the claim and uncertainty, distinguish a view from a fact and find its source. No fabricated first-use example is injected into production. |
| Experienced user | Wants to triage watched stocks and inspect levels. | Watchlist List → Overview for reasons or Metrics for comparison → Stock Metrics → dated reference → above/below alert draft → review → explicit confirmation. | Inspect basis/expiry, keep unknown distinct from zero and create a condition deliberately. Prefill alone does not activate an alert or prove delivery. |

## Released follow-up: complete paths and returns

| Task | Entry and next action | Return and preserved context |
|---|---|---|
| Start with no watchlist | Today dated company → Stock Overview, or its separate Map action → Stock Evidence; Explore search reaches the same workspace. | Stock returns to Today or the Explore entry. Add stocks remains an explicit personal-list action; reading does not follow automatically. Full map and exact sources remain available. |
| Read personal research after the market digest | Today's existing new-record/latest-analysis counts → corresponding section. | The target heading receives keyboard focus. The full digest and liquidity/QQQ/SPY stack remain open and in their original order; an empty analysis target is disabled. |
| Inspect historical macro readings | Focus the three-line chart → Arrow keys or Home/End select a date; pointer/touch selection remains. | The selected date and each series' value are announced. Missing data remains missing, and the liquidity help control has a 44px target. |
| Investigate a creator's claim | Discover/Following → principal view → exact source → named Research ticker; the visible ticker can also enter Stock directly. | Return restores the author/exact-source route and local query, scope/stance, expansion, focus and scroll. Original post/point map and source link are preserved. Search text stays out of the URL and account changes discard the reading state. |
| Compare watched stocks | Watchlist Metrics → stock/quote, six readings, five signal groups, market cap, then full narrative → named Stock Metrics or Evidence. | Sorting, query, view and scroll remain. List keeps its own original column order. Finite stale/expired/previous-sample values show state/date instead of appearing current or being erased. |
| Check support and opposition | Stock Overview key sources → exact source, or Watchlist Map → Stock Evidence. | Available opposing evidence gets a preview slot within the existing important evidence; all inline citations and the full map remain. Colors and counts do not invent corroboration. |
| Find insider trades or fund filings | Any stock tab → Insider trades / Fund holdings · 13F → same ticker's complete archive → exact record. Watchlist filing dialogs use the same entries even when their preview is empty. | Record breadcrumbs retain category, ticker and applied query/direction, including alias-to-canonical ID changes. Broad all-record filters start compact; restrictive active filters remain exposed. |
| Turn a price reference into a condition | Stock Metrics → explicit above/below reference → editable Alerts draft. | Existing stock return preserves exact tab/from/focus and then the stock's original source entry. Opening does not translate, submit or activate the draft; unrelated stocks cannot inherit that context. |
| Review the next two weeks | Calendar → named event/ticker or event details. On phones, concise timezone precedes dates; full introduction and watchlist scope remain inside existing filters. | Closure, early-close and unconfirmed-time states, watched tickers, category counts and failed-read warnings stay visible. Historical views keep sample counts and losses. Quiet dates are not hidden to make the first event appear higher. |

All filing links preserve typed facts: Fund holdings selects 13F records only, with no seven-day
window or amount/direction restriction. Report period, filing date and reported share changes do
not establish current ownership or executed trades. These are navigation changes, not new data
acquisition. Alert/record/activity return state is bounded by the current account epoch and history
entry, with supported internal routes and matching ticker/record identity required.

## Where information belongs

| Content or task | Primary home | Explore entry | Watchlist entry | Detail and next action |
|---|---|---|---|---|
| Market backdrop / liquidity | Existing Today and report routes | Optional Reports tool; Today navigation | Today navigation | Existing published readings and dates. The follow-up adds keyboard date access and section jumps without replacing the production data path with prototype fixtures. |
| Company and summary | Stock Overview | Search or named Overview link | Ticker / Overview card | Available company name, saved summary, support/risk and sources. Missing identity data is not invented. |
| Long-term and trend perspectives | Watchlist context and stock reading | Same stock workspace | List / Overview; Metrics comparison | Preserve the two existing perspectives; neither is a popularity vote. |
| Option walls / price references | Stock Metrics | Named Metrics link | Named metric / Metrics table | Walls retain option expiry; 20-session low/high retain their own basis; explanations remain available. |
| IV/HV / technical readings | Stock Metrics; Watchlist Metrics | Per-stock Metrics without following | Sortable comparison → stock | Actual values, dates and missing states. IV/HV is not a valuation score. |
| Discussion attention | Explore candidates; existing metrics | Dated ranking | Existing metric cells | Counts/rank changes are attention only. Missing stance is not neutral or bullish. |
| Creator views | Creators | Creators destination or stock tool | Stock tool / map | Main claim/ticker before archive; full qualifications and exact post/point/source; explicit follow. |
| Insider / fund / political / company records | Company and capital activity | Named destination / candidate activity link | Ticker-scoped activity link | Original record and typed dates/values; stock actions only for valid linked equities. |
| Support and counterevidence | Stock Evidence / full map | Named Map link | Direct map entry | Green support/red risk with text; exact sources; repeated wording retains every record/date. |
| History | Stock History; creator history/archive | Stock → History | Stock → History | Server-paginated changes and original source records, not automatically verified performance. |
| Events | Existing Calendar | Stock Calendar tool | Calendar / stock tool | Existing two-week default and explicit timing state. Scheduled dates do not imply confirmed times. |
| New entry range | Stock Overview references | Open stock | Open stock | Explicitly unavailable. Existing metrics remain accessible; no handmade buy range. |
| Personal price condition | Existing Alerts draft/list | Stock metric action | Metric action / alert entry | Editable direction-specific prefill, then existing submission/review/confirmation. No new local-only plan store. |

## Continuity and source rules

- Keep the five primary destinations and direct map/metric/chart access. Readable results precede optional explanations and archives.
- Generic stock links open Overview; named links open their section. Return context belongs to the current history entry and account epoch, including activity entry. Ticker-scoped links must not inherit unrelated filters.
- Preserve full claims and qualifications. Collation requires stable identity, matching bilingual wording, stance, scope and semantic fields. A shared ticker is insufficient. Unknown/changed fields, opposed views, mentions and withdrawn records stay separate.
- Each repeated group retains every original source action. Counts measure records, not independent support. Publication, observation, transaction date, report period and option retrieval retain their own meanings.
- Missing, stale, partial, pending and denied states remain explicit. Pending summaries do not hide facts; denied material cannot return through late responses.
- Follow, alert submission and alert confirmation are explicit actions. Production bookmarks and Saved views are outside this integration.

## Follow-up acceptance scenarios

1. With no watched stocks, search from Explore, inspect Metrics/Evidence, open an exact source and return to the same search without an implicit follow.
2. At 320/390 px, reach results without opening research questions or the weekly feed. Keep primary navigation, 16px inputs and 44px frequent controls; measure actual useful content rather than document overflow alone.
3. Apply activity filters locally, enter a stock, switch tabs and return to the exact scope/scroll. Open an aliased record and check its breadcrumb after canonicalization. Reject external, mismatched ticker/record, wrong-entry and old-account state.
4. Read support and risk before the full archive, including three initial same-side citations with a relevant opposite view available. Preserve every inline citation and missing-source states without substituting sample claims.
5. Read several authors' main views, expand repetitions and reach each original post/point/date. Visit Stock from a creator or exact source and return with query, scope/stance, expansion, focus and scroll intact; changing accounts must clear that state. Changed conditions and opposing stances remain separate.
6. Select Watchlist Metrics and see numeric columns before narrative. Sort with unknown values last and actual zero retained. Inspect visible historical state/date and expiry separately from quote time. Open an above/below draft without submission, then return to the exact stock section and original source.
7. Exercise pending 202 and denied research. Retry pending metrics; denied data cannot reappear when older snapshot, bar or history requests finish.
8. Check Form 4 trade/filing dates, 13F period/filing date, political ranges and company effective dates. Do not label a reported 13F share change an executed trade.
9. Repeat stock tabs, source dialogs, creator filters and return paths in both languages/themes. Confine table scrolling and preserve keyboard focus. Check desktop after mobile layout changes.
10. Use Today's count jumps and confirm target-heading focus, disabled empty targets and unchanged digest/macro order. Select chart dates by keyboard and verify announced values, including missing readings, plus the 44px help target.
11. On phone Calendar, verify the short timezone, readable dates/event labels and full context inside filters. Confirm watched earnings, closure/early-close/unconfirmed states, source warnings and historical losses remain; distinguish quiet date cells from excess introductory chrome.

The released integration's tests, viewport matrix and scoped live-content checks are recorded in
[production acceptance](../../reports/UX-PRODUCTION-2026-09-28.md). The broader follow-up has the
[integrated workflow record](../../reports/UX-WORKFLOW-REVIEW-2026-09-28.md) and the earlier bounded
[disclosure record](../../reports/STOCK-DISCLOSURE-ENTRY-2026-09-28.md). Focused DOM/router tests and
local viewport observations remain pre-release evidence. The exact-revision combined gate and
deployment passed; the follow-up receipt records real Today reads/jumps, NVDA Metrics/disclosure
archives and exact record return, plus desktop Watchlist Metrics ordering without document overflow.
Creator Following, the inspected touzi-talk source/MU return and the real MU chart were also readable
after the separate backend repair. This scoped check does not establish all creators or production
workflows. Synthetic browser fixtures do not certify live source
freshness or semantic fidelity, physical-device behavior, account writes or notification delivery.
Prototype bookmarks, plans, themes, synthetic liquidity comparison and scenario switching remain
historical design references.

Known remaining limitation in `e22240f3`: Chart return loses the exact stock tab/from and original
creator filter context. A separate correction is pending. Direct Creator → Stock → Creator return
and chart rendering passed their scoped checks; the longer Chart return chain did not.
