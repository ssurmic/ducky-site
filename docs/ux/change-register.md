# UX change and integration register

## Professional reading system and persistent navigation · 2026-09-30

The owner requires phone/desktop and dark/light parity. A common type/color system, neutral stock identities and persistent workspace choices accompany dense tables, aligned figures and reduced decoration. [Rationale](professional-reading-system.md) and [acceptance](../../reports/PROFESSIONAL-UI-2026-09-30.md) retain the validation and release boundary.

## Workspace density and discoverable research · 2026-09-30 (PR #128)

Four visible Watchlist/source choices, compact phone navigation and prominent Company activity are combined with a shared title/subtitle/spacing scale across desktop and phone. Calendar monthly history is a compact comparison table with full interpretation and annual records on expansion. Stock actions/profile alignment and the English record count are repaired. [Discoverability evidence](../../reports/DISCOVERABLE-VIEWS-2026-09-29.md) and [full workspace/first-use acceptance](../../reports/WORKSPACE-DENSITY-2026-09-30.md) distinguish local checks from the authorized production release.


## Insider transaction controls and compact source facts · 2026-09-30 (candidate)

Insider filings use immediate All / Buy / Sell controls, exact market-cap chips and visible advanced-filter constraints. New visits no longer silently apply the verified-open-market threshold. Compact records preserve source dates, security units, strict optional price/holding metrics and full filing access; source-reader labels follow the actual reported side. Existing bookmarks, language changes and asynchronous query/account fences remain. [Contract, checks and release boundary](../../reports/INSIDER-FILTER-UX-2026-09-30.md).


## Video views in current research maps · 2026-09-29 (released PR #125)

Both the stock Map tab and standalone map expose the same exact-ticker reviewed video views as Overview, with visible author attribution and complete source details. The shelf stays outside transcript evidence, graph counts and archived versions. Existing access and shared-read withdrawal rules remain. [Implementation and validation](../../reports/NATIVE-MAP-VIEWS-2026-09-29.md).

Production now serves `e2f36595` from Pages `75f859f1`, verified with the expected CSP at 2026-09-30 03:34:19 UTC. The publisher repeated the 975-test Node gate; Chrome fixture checks covered phone source dialogs/focus and the corrected desktop connector clipping. This is UI deployment acceptance; actual new-video publication remains pending. Repository receipt updates do not replace the deployed artifact. [Exact release receipt](../../reports/NATIVE-MAP-VIEWS-2026-09-29.md#production-release-receipt).

## Four-view creator shelves and signed changes · 2026-09-29

Compare four creator views per page with horizontal navigation: four columns on desktop, two by two on phones. Full sources retain conditions, speaker attribution, repeat records and timestamps. Structured increases/decreases use green/red across ranking, market and research surfaces; zero and missing stay neutral. No extra author-history fetch or processing activation. [Implementation and acceptance](../../reports/CREATOR-RAILS-2026-09-29.md).


## Integrated Today market dashboard · 2026-09-29 (candidate)

Keep current index quotes, four compact macro readings and both historical three-line comparisons in one market section. Phone emphasis comes from stronger reading text and less repeated metadata. Upcoming events follow the charts with a plain date, time, event and complete impact; provenance stays in expandable details. Canonical values, source clocks, archived closing notes and automatic-read state are retained. [Design and acceptance](../../reports/TODAY-DASHBOARD-2026-09-29.md).

**Current Today rounding consistency (released PR #120, 2026-09-29):** accepted current snapshots use the summary producer's fixed-point rounding for metric cards, percentages, chart legends, tooltips and accessible values. Raw source values and dates remain intact; legacy formatting and independently dated daily-versus-trade records retain their meaning. [Acceptance](../../reports/TODAY-ROUNDING-2026-09-29.md).

**Today event-preview visibility follow-up (released PR #119, 2026-09-29):** the current overview retains a visible, valid same-day structured event preview; older previews remain in their original close archive. A dated Calendar entry covers missing current previews. Post-session trade snapshots are explicitly distinguished from historical daily bars. No source data or source dates change. [Acceptance](../../reports/TODAY-INTRADAY-2026-09-29.md#event-preview-visibility-follow-up-candidate).

## Current-session Today overview · 2026-09-29

Implemented a compact four-index overview before the dated close archive, bound to the same saved current-session macro metrics used by the cards. Source times, missing values, expiry, historical chart dates, permission revocation and replica ordering remain explicit. 909 Node tests, Python18pass/1skip, build/copy/links and eight phone combinations plus desktop passed. Released in PR #118, followed by preview PR #119 and rounding PR #120; [acceptance](reports/TODAY-INTRADAY-2026-09-29.md).


**Returning-browser entry candidate (2026-09-29):** remembered sessions go from an ordinary homepage visit directly to Today, retaining existing auth/renewal and locale rules. Explicit introduction anchors and signed-out entry remain. Temporary restoration failures are retryable. [Acceptance and release boundary](../../reports/RETURNING-BROWSER-ENTRY-2026-09-29.md).

**First-use stock workflow candidate (2026-09-29):** Empty Watchlist is being changed to one search and four real dated discovery candidates, leading into the existing stock workspace before an explicit Add. Today gains a zero-watch research entrance; successful stock membership gets an in-place confirmation and list return. No sample membership or notification promise. [Design and acceptance](../../reports/FIRST-USE-STOCK-WORKFLOW-2026-09-29.md).

Updated: 2026-09-28. This English register is the canonical presentation handoff for the UX redesign. User-facing copy remains bilingual. The private backend's shared documents remain the system-design authority; this register records public UI behavior and integration boundaries only.

**Native author-page follow-up candidate:** Author links now open the same compact reviewed views under the selected author heading, filtered and validated by exact creator identity. Historical batch status is labelled separately from new-upload processing. Original-source contexts and existing transcript/research access remain unchanged. [Focused and visual acceptance](../../reports/CREATOR-NATIVE-PAGE-2026-09-29.md).

**Unreleased native-view integration:** Today adds qualified macro views, Explore keeps stocks first and adds latest views, and stock Overview receives only validated company-subject associations. Original transcript/metadata feeds remain; native rows retain exact conditions, opposed views, source dates and approximate original-video navigation. The shared read revision controls refresh and withdrawals without an implicit follow. [Candidate checks and deployment limits](../../reports/CREATOR-NATIVE-VIEWS-2026-09-29.md).

**Unreleased coherence follow-up:** Today consumes the backend's saved per-metric source
choice for yield, VIX, term ratio and funding score. Known-schema missing values do not
fall back to conflicting older fields; dates, acquisition clocks, intraday status and actual
zero remain distinct. Existing charts and digest prose are retained, without browser-side
source selection or revision. [Contract and candidate evidence](../../reports/TODAY-MARKET-READINGS-2026-09-29.md).
The preceding compact preview has since shipped as PR #112 / `4583e4c1` / Pages `7b1c95a0`,
verified September 29 at 00:28:39 UTC after 842 Node, 14 Python and build/copy/link checks.
Scoped authenticated phone/desktop reads at 00:29–00:30 UTC accepted its singular event,
17-missing disclosure, source details and refresh continuity. This does not claim the separate
canonical backend projection is already available.

**Current released Today addition:** PR #111 / `e19f4bbc` / Pages `73924238` was verified
on September 28 at 23:19:45 UTC after 839 Node tests, 14 Python tests and build/copy/link
checks. Today renders source-labelled close snapshots, complete saved event previews and
visible-only minute reads of the existing endpoint. At September 29 00:13–00:18 UTC, scoped
phone/desktop reads accepted the September 28 edition with actual 2/19 coverage, an
unconfirmed NKE time and the September 29 Calendar destination. This does not certify
complete coverage or the separate macro-source correction. See the [dated receipt](../../reports/TODAY-CLOSE-PREVIEW-2026-09-28.md#production-release-receipt).

**Compact follow-up (released as PR #112; original candidate scope retained):** only the known v1.3 close snapshot's redundant preview
paragraph is omitted when a valid same-session event list replaces it. Other versions,
daily-close prose and invalid-preview fallbacks remain exact. One event uses singular English;
long missing lists expand while actual coverage stays visible. Source data is unchanged.
[Candidate checks and limits](../../reports/TODAY-CLOSE-PREVIEW-2026-09-28.md#compact-preview-follow-up-candidate).

**Previous Today/Explore release: version `9ab95315`, verified on 2026-09-28 at 22:40:24 UTC.**
[PR #109](https://github.com/ssurmic/ducky-site/pull/109) merged at 22:39:29 UTC as
`9ab9531545fcd3294614318b3b04ff52b499a9be`. The publisher passed 831 Node tests, 14 Python tests,
bilingual build, copy lint (4,104 files) and 2,103 links, then published
[Pages `dc10d45f`](https://dc10d45f.ducky-site.pages.dev). The first edge read returned the prior
version; the second verified the new VERSION and CSP. Production Today and Explore reads and
Explore → MU Metrics → Explore passed scoped checks at 22:40–22:43 UTC. At 22:44 UTC, the
expanded Today note survived an Explore return and desktop Today retained its dated readings
and four macro tiles without overflow. Missing MU summary
metrics remained missing; this receipt does not establish full field coverage. See the
[Today](../../reports/TODAY-FRESHNESS-2026-09-28.md#production-release-receipt) and
[Explore](../../reports/UX-EXPLORE-COMPARISON-2026-09-28.md#production-release-receipt) release records.

**Released Explore comparison:** a six-column desktop/two-column phone grid initially shows up
to 12 valid source-ranked companies. Extra response rows and complete summaries expand without
another ranking read. One primary research action and lighter Metrics/Map links replace the old
four equal actions. Company activity remains available from Explore's primary activity destination
and the stock workspace. Source time, zero/missing states and attention-only meaning remain.

**Previous Chart release retained:** version `7fb28406` was verified on 2026-09-28 at 20:24:20 UTC. [PR #107](https://github.com/ssurmic/ducky-site/pull/107) merged as `7fb28406cc89ac363309392599f945f0ab931e0a`; the publisher passed 823 Node tests, 14 Python tests, build/copy checks and 2,103 internal links before publishing [Pages `809bdbf9`](https://809bdbf9.ducky-site.pages.dev). Production VERSION and CSP were verified. The exact Creator → MU History → Chart → MU History → selected-author return chain passed authenticated production verification at 20:25:30 UTC, including restored focus and no document overflow. See the [Chart correction receipt](../../reports/UX-CHART-RETURN-2026-09-28.md#production-release-receipt).

**Workflow release retained:** `e22240f3` / [PR #105](https://github.com/ssurmic/ducky-site/pull/105)
was verified at 20:06:21 UTC after 821 Node and 14 Python tests plus copy/link checks, through
[Pages `fcad2151`](https://fcad2151.ducky-site.pages.dev). Its scoped Today, NVDA disclosure/return,
desktop Watchlist Metrics, Creator/source/stock and MU chart checks at 20:07–20:10 UTC remain in
the [workflow receipt](../../reports/UX-WORKFLOW-REVIEW-2026-09-28.md#production-release-receipt).
The later Chart return failure and its correction are separate evidence; the original smoke did
not establish that longer return chain.

**Earlier production receipt retained:** version `0c904fa3` was verified at 19:05:25 UTC through
[PR #104](https://github.com/ssurmic/ducky-site/pull/104), after 809 Node tests and its release checks.
Its [original acceptance record](../../reports/UX-PRODUCTION-2026-09-28.md#production-release-receipt)
remains evidence for that release only. The earlier isolated prototype remains available through the
[preview guide](README.md); its fixtures and browser-local interactions are not production features.

**Follow-up released as `e22240f3`:** the implemented slice includes
the three-persona workflow review, phone density/accessibility corrections, and direct disclosure
entries. It is broader than the initial disclosure patch and is not included in the `0c904fa3`
receipt. The [integrated review](../../reports/UX-WORKFLOW-REVIEW-2026-09-28.md) coordinates the frozen
[newcomer](../../reports/UX-WORKFLOW-NEWCOMER-2026-09-28.md),
[experienced-user](../../reports/UX-WORKFLOW-EXPERT-2026-09-28.md), and
[mobile](../../reports/UX-WORKFLOW-MOBILE-2026-09-28.md) reports, including accepted and rejected peer
challenges. Earlier audit measurements remain evidence of the first pass, not measurements of the
final candidate.

## Released Today freshness correction (`9ab95315`)

The owner observed newer market readings alongside a still-expanded September 25 close note.
The implementation separates those clocks: a dated QQQ/SPY change row and market-reading context lead,
then a compact disclosure opens the complete last published note before the full macro tiles.
Its original next-session outlook is explicitly framed as written then. Same-day notes remain
fully expanded; weekends and unknown dates do not imply a missed trading-day publication.
The existing four tiles, three-line charts, research-count jumps and creator/research streams
remain. The [focused acceptance record](../../reports/TODAY-FRESHNESS-2026-09-28.md) is evidence
for the focused candidate; its [release receipt](../../reports/TODAY-FRESHNESS-2026-09-28.md#production-release-receipt) records the later publication and scoped live reads. The earlier receipts above remain historical evidence.

## Released Chart return correction (`7fb28406`)

The existing Chart Stock page action now restores the exact incoming stock tab/from URL and its
validated research origin. The stock breadcrumb can then return to the selected author or other
original entry. Context is bound to the account epoch, chart history entry and ticker; refresh of
that same entry retains it, while unrelated routes and symbol changes cannot inherit it. The fix
adds no API calls, account actions or chart-data changes. Regression coverage and the scoped live
chain are recorded in the [Chart report](../../reports/UX-CHART-RETURN-2026-09-28.md).

## Released workflow follow-up (`e22240f3`)

| Area | Released behavior | Preserved boundary |
|---|---|---|
| Phone density | Compact reading chrome, spacing and duplicate headings leave more room for actual records. Metrics and disclosure actions retain named destinations. | Full claims, conditions, dates and primary navigation remain. Inputs stay 16px and frequent controls retain 44px targets; no physical-device result is claimed. |
| Today | Existing research counts jump to and focus the matching heading; dated starters open Stock with a separate Map action. Macro history supports Arrow/Home/End date selection and announced readings; liquidity help has a 44px target. | The digest, three-line liquidity/QQQ/SPY chart, order and expanded macro content remain. A zero-analysis jump is disabled; embedded feeds gain no extra header. |
| Calendar | Phones keep a short explicit Eastern Time label and move repeated introduction/watchlist-scope prose into the existing filter disclosure. Gaps are reduced. | Two-week default, 18px dates, 12px event labels, category counts, closure/early-close/unconfirmed states and watched tickers remain. Failed membership/source warnings stay visible. |
| Watchlist comparison | Metrics orders stock/quote, six metrics, five signal groups, market cap, then the complete overview and both perspectives. Older finite values carry visible status/date. | List ordering, actual zero, unknown-last sorting, frozen stock identity, local horizontal scroll, all narrative columns and source methods remain. |
| Stock evidence | Watchlist Map opens the stock Evidence tab. Key-source previews retain an available support and counter side within existing important evidence. | The full map and every original inline citation remain; no stance or opposing claim is inferred to fill a slot. |
| Creator continuity | Named ticker/stock entries supplement exact-source and point-map actions. Author, query, scope/stance, expansion, focus and scroll survive a stock visit. | State is bounded to the account epoch; private query text stays out of URLs. Existing bounded reads, access, source identity and explicit follows remain. |
| Disclosure discovery | Every stock tab and Watchlist filing dialog links to the ticker's complete Insider trades or exact 13F archive, without an arbitrary seven-day window or amount/direction restriction. | Existing records, pagination and access; no added stock-page read or acquisition. 13F is not mixed with strategic-partner records or labelled current ownership. |
| Activity and record return | Applied filters notify the existing route-state mechanism. Record aliases retain the valid archive context through canonical-ID replacement. Broad all-record entries keep advanced filters collapsed. | Restrictive active filters remain exposed. Returns are validated against account epoch, history entry, ticker/record identity and supported internal routes. |
| Alert return | A reference draft retains the exact stock tab/from/focus URL and the stock's prior source context. | Opening remains a prefill only. Unrelated stock links do not inherit it; submission, review, confirmation and actual delivery remain separate. |

The [disclosure report](../../reports/STOCK-DISCLOSURE-ENTRY-2026-09-28.md) retains the initial bounded
patch checks. Persona reports retain focused regression results; the integrated report owns the
combined local browser observations. The exact-revision release gate and Pages deployment passed;
the release receipt records the limited authenticated production checks separately from local fixtures.
This frontend follow-up
does not add a backend API, inference, account
write or notification test; separate backend repair/release evidence stays in the shared private
engineering handoff.

## Released production integration (`0c904fa3`)

| Area | Implemented behavior | Boundary |
|---|---|---|
| Primary navigation | Today, Watchlist, Explore, Calendar and Creators remain primary. Stock research has Overview, Metrics, Evidence and History tabs. | Existing routes and account access remain authoritative. |
| Explore | Stock search precedes compact, dated discussion candidates. Each candidate names Overview, Metrics, Map and activity destinations. Research questions and the weekly feed expand on request. | Saved discussion data supplies candidates. Popularity is attention, not sentiment. Searching requires no follow; research access still follows account entitlements. |
| Watchlist | List remains default; Overview explains the case, Metrics keeps comparison, and Heatmap remains available. Stock/map/metric/alert/activity entries stay visible. | Existing shared research and metric definitions; presentation state is scoped to the account session, not a new preference service. |
| Stock | Summary, support/risk, references, metrics, evidence and recorded changes share one workspace. Chart, creator, calendar, alert and full-map tools remain reachable. | Source-backed reads only. Quote time, snapshot time, source dates and expiry keep their own meanings. |
| Metrics | Existing long-term/trend perspectives, option walls, 20-session low/high, technical readings and IV/HV remain discoverable. Level actions explicitly choose above/below. | A verified new entry range is unavailable. Existing levels are references, not a newly calculated buy recommendation. |
| Creators | A no-follow visitor enters discovery unless explicitly requesting Following. Compact author cards expose views and tickers before archives; conditions stay visible. | Existing feeds, server-filtered discovery/history, subscriptions and exact source routes. No production Saved-views feature is added. |
| Repeated views | Eligible exact repetitions from one stable author collapse behind an original lead with all records expandable. Support stays green and risk red, with text labels. | Both languages, stance, scope and semantic fields must match. Changed/uncertain claims stay separate. Counts describe records, not independent corroboration. |
| Company and capital activity | Existing Radar records appear in insider, fund, political and company categories with server filters, source details and valid stock actions. | Typed amounts/dates, access, partial results, coverage and cursors remain intact. No synthetic records or amount rankings. |
| Alert entry | A selected reference prefills the existing alert draft with explicit direction. Review and confirmation use the existing workflow. | Opening the form does not submit or create an alert. Compiler availability and delivery require separate evidence. |
| Continuity and failures | Stock return context is tied to its history entry/account epoch, including activity entry. Pending metrics offer retry; denied research rejects late responses. | Focused regressions and final browser acceptance passed; see the release receipt. |
| Today and Calendar | Existing production destinations and source rules remain in place. | Prototype examples/liquidity comparison and Calendar mockups do not replace these routes. |

## Existing read and action contracts

| Surface | Endpoint family | Retained meaning |
|---|---|---|
| Explore | Symbol search; /radar/social.json; optional existing Today feed | Collection date, stale/unavailable states; rank is not stance. |
| Watchlist | /watchlist, /me/stock-research, /briefing/stocks?fields=signals, scoped Radar reads | Membership, shared research, independent quotes and dated signals. |
| Stock | /stock-research/{ticker}, /bars/{ticker}?period=6mo, /snapshot/{ticker}, /me/research-changes | Shared evidence, historical prices, metrics and server-paginated changes. Accepted 202 remains pending. |
| Creators | /kol/discover, /kol/feed or /kol/trial-feed, /kol/{id}/page, /kol/{id}/history, /kol/{id}/posts/{post} | Access, scope/cursors, source withdrawal and stable author/post/point identity. |
| Activity | /radar/archive.json, /radar/record.json, /radar/coverage.json, /radar/facets.json; public equivalents add /public | Filters before pagination; response-owned access/partial/coverage. Archive availability alone is not fresh collection. |
| Explicit follows | Existing watchlist actions and /kol/{id}/sub | User-initiated account changes; reading never follows automatically. |
| Explicit alert draft | /alerts/translate, /alerts/drafts/{id}, /alerts/drafts/{id}/confirm | Submission, draft readiness and confirmation are separate states. Prefill is not an active alert. |

Account epochs, cancellation, access and withdrawal handling remain authoritative. This slice adds no backend schema, producer, model invocation or per-viewer research generation.

## Exclusions and remaining acceptance

- The production Chart return failure in `e22240f3` is retained as historical evidence. The [bounded correction](../../reports/UX-CHART-RETURN-2026-09-28.md#production-release-receipt) was released as `7fb28406`, and the inspected creator/stock/chart return chain passed live at 20:25:30 UTC. The earlier direct creator/stock and chart-rendering checks alone did not certify it; this focused acceptance does not cover every source or account workflow.
- The prototype's fictional authors, nine-stock fixture, six activity records, handmade entry bounds and scenario selector remain confined to prototypes/ux-lab.
- Prototype cross-stock Metrics in Explore, thematic stock filters, shared bookmarks and My watch plans are not production additions. Production Explore links to per-stock Metrics; Watchlist retains its real comparison table.
- No new entry-range calculation, valuation score, semantic claim merging, verified creator performance, historical delivery or broader source coverage is claimed. [Proposed contracts](proposed-backend-changes.md) remain proposals, not activated capabilities.
- The initial integration passed 809 Node tests, final build/copy/link checks and its viewport matrix. Its live evidence is limited to the routes and readable content named in the [original release receipt](../../reports/UX-PRODUCTION-2026-09-28.md#production-release-receipt). The workflow follow-up passed 821 Node and 14 Python tests plus copy/link checks and has its own [release receipt](../../reports/UX-WORKFLOW-REVIEW-2026-09-28.md#production-release-receipt), including limited phone and desktop production reads. Neither receipt certifies every source's prose, current coverage, physical-device behavior or notification delivery. The creator/chart smoke confirms the inspected read paths after the separate backend repair; it is not that backend's engineering or deployment receipt.

## Change history

| Date / commit | Delivered slice | Evidence |
|---|---|---|
| Sep 28 · d1a9cdc | Isolated five-page and stock prototype | [Initial acceptance](../../reports/UX-REDESIGN-2026-09-28.md) |
| Sep 28 · a6d4948 | Prototype metrics and USD liquidity comparison | [Metric correction](../../reports/UX-METRICS-RESTORATION-2026-09-28.md) |
| Sep 28 · 9e174ea | Prototype activity layout, API mapping and adapter tests | [Activity acceptance](../../reports/UX-ACTIVITY-REFERENCE-2026-09-28.md) |
| Sep 28 · 3987be2 | Prototype persona review, source continuity and English handoff | [Journey acceptance](../../reports/UX-JOURNEYS-2026-09-28.md) |
| Sep 28 · 0c904fa3 | Production route/API integration and compact phone layout; released through PR #104 | [Production integration and release](../../reports/UX-PRODUCTION-2026-09-28.md), [creator preservation](../../reports/CREATOR-UX-INTEGRATION-2026-09-28.md) |
| Sep 28 · e22240f3 | Three-persona workflow corrections: phone density, Today jumps/chart keyboard access, Calendar stack, Metrics ordering/status, source balance, creator/alert/record/filter returns, and direct disclosure archives; released through PR #105 / Pages fcad2151 | [Integrated review and release](../../reports/UX-WORKFLOW-REVIEW-2026-09-28.md#production-release-receipt), [original disclosure candidate evidence](../../reports/STOCK-DISCLOSURE-ENTRY-2026-09-28.md) |
| Sep 28 · 7fb28406 | Chart restores exact stock tab/from and validated original research entry; released through PR #107 / Pages 809bdbf9, scoped live chain passed | [Chart correction and release](../../reports/UX-CHART-RETURN-2026-09-28.md#production-release-receipt) |
| Sep 28 · 9ab95315 | Source-dated Today readings and preserved old-note disclosure; compact Explore comparison; released through PR #109 / Pages dc10d45f | [Today release](../../reports/TODAY-FRESHNESS-2026-09-28.md#production-release-receipt), [Explore release](../../reports/UX-EXPLORE-COMPARISON-2026-09-28.md#production-release-receipt) |

Read this register, the [current journeys](user-journeys.md), and the latest acceptance record before continuing. Update release status only from actual committed, deployed and readable-content receipts; preserve prior prototype reports as historical evidence.

### Initial released phone density · 2026-09-28 (`0c904fa3`)

Implemented in the initial production release: compact phone shell, one-row stock tabs, denser Watchlist
List/Overview and author cards, shorter Explore introduction and full-width research actions.
In that initial viewport check, 320px Stock Metrics showed all six readings in the first screen.
The then-current 390px Explore fit two complete
company rows plus the next summary. The later comparison-grid release supersedes that Explore
layout; these measurements remain the initial-release record. Inputs remained 16px and primary
touch areas remained 44px.
The final local suite reached 809 passing tests. A 52-route locale/theme/viewport sweep found no
horizontal document overflow. See the production acceptance report for measurements and limitations.
Published with the production release recorded above.


## Phone workflows and ticker identity — 2026-09-29

Implemented candidate: structured fluorescent ticker leaves in light/dark; compact empty-Watchlist rows and two-column Today candidates; macro reading disclosures and phone chart choice; phone evidence cards with visible stance counts, opposing views and original sources; early Overview tools; contextual creator empty-state compression. Existing data, access and membership ownership retained. [Design, browser evidence and release limits](../../reports/TICKER-MOBILE-UX-2026-09-29.md). Shared private Handoff §52 is the release record.
