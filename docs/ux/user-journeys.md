# User journeys and content map

Status: production UI integration implemented locally, 2026-09-28; final acceptance and deployment pending. These are reading paths and acceptance scenarios, not measured usability gains. Earlier prototype scenarios remain in the [prototype journey report](../../reports/UX-JOURNEYS-2026-09-28.md) and [preview guide](README.md).

## One research destination, several reasons to enter

Explore helps people find a company and choose a research question. Watchlist helps people revisit followed companies and compare readings. Both reach the same stock workspace and metric definitions. Following changes personal scope; it is not a prerequisite imposed by the research route. Existing account entitlements still control access.

The stock workspace answers four questions: **What is the case? What do price and options readings show? What supports or challenges the case? What was recorded when?** Creator views, disclosures and scheduled events retain their own source identities and date meanings.

## Three perspectives

| Perspective | Starting question | Current production path | Successful outcome |
|---|---|---|---|
| Researcher | No watchlist yet; wants to investigate a company and verify its evidence. | Explore → search or dated candidate → Overview / Metrics / Map → exact source → History → optionally follow. An activity record can enter the same workspace. | Read unwatched research within account access, inspect opposing evidence/dates and return to the entry scope. Explore provides per-stock metrics; the prototype's cross-stock comparison is not integrated. |
| Stock beginner | Wants a starting point without interpreting a metric table. | Today or Explore → an available dated stock record → company/research context → support and risk sources → optional follow → Watchlist → Calendar or activity. | Explain the claim and uncertainty, distinguish a view from a fact and find its source. No fabricated first-use example is injected into production. |
| Experienced user | Wants to triage watched stocks and inspect levels. | Watchlist List → Overview for reasons or Metrics for comparison → Stock Metrics → dated reference → above/below alert draft → review → explicit confirmation. | Inspect basis/expiry, keep unknown distinct from zero and create a condition deliberately. Prefill alone does not activate an alert or prove delivery. |

## Where information belongs

| Content or task | Primary home | Explore entry | Watchlist entry | Detail and next action |
|---|---|---|---|---|
| Market backdrop / liquidity | Existing Today and report routes | Optional Reports tool; Today navigation | Today navigation | Existing published readings and dates. The prototype's normalized three-line chart is not newly connected. |
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

## Candidate acceptance scenarios

1. With no watched stocks, search from Explore, inspect Metrics/Evidence, open an exact source and return to the same search without an implicit follow.
2. At 320/390 px, reach results without opening research questions or the weekly feed. Keep primary navigation and named stock actions usable.
3. Open a stock from filtered activity, switch to Metrics and return to that activity scope. Reject unsafe returns and account-stale history state.
4. Read support and risk before the full archive; preserve missing-source states without substituting sample claims.
5. Read several authors' main views, expand one author's repetitions and reach every original post/point/date. Changed conditions and opposing stances remain separate.
6. Sort Watchlist Metrics with missing readings last. Inspect expiry separately from quote time. Open an above/below reference and verify editable alert input without automatic submission.
7. Exercise pending 202 and denied research. Retry pending metrics; denied data cannot reappear when older snapshot, bar or history requests finish.
8. Check Form 4 trade/filing dates, 13F period/filing date, political ranges and company effective dates. Do not label a reported 13F share change an executed trade.
9. Repeat stock tabs, source dialogs, creator filters and return paths in both languages/themes. Confine table scrolling and preserve keyboard focus.

Focused tests and an initial phone check are recorded in [production acceptance](../../reports/UX-PRODUCTION-2026-09-28.md). The final combined viewport matrix and release/live-content receipt remain pending. Prototype bookmarks, plans, themes, synthetic liquidity comparison and scenario switching remain historical design references.
