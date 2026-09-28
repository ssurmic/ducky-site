# UX change and integration register

Updated: 2026-09-28. This English register is the canonical presentation handoff for the UX redesign. User-facing copy remains bilingual. The private backend's shared documents remain the system-design authority; this register records public UI behavior and integration boundaries only.

**Delivery status: production UI integration implemented in the local worktree; not yet deployed.** The candidate uses existing production route modules and the API client. The combined test suite passes 805/805; final browser acceptance and release checks are still in progress. The earlier isolated prototype remains available through the [preview guide](README.md); its fixtures and browser-local interactions are not production features.

## Current production integration

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
| Continuity and failures | Stock return context is tied to its history entry/account epoch, including activity entry. Pending metrics offer retry; denied research rejects late responses. | Focused regressions passed; final combined browser acceptance remains pending. |
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

- The prototype's fictional authors, nine-stock fixture, six activity records, handmade entry bounds and scenario selector remain confined to prototypes/ux-lab.
- Prototype cross-stock Metrics in Explore, thematic stock filters, shared bookmarks and My watch plans are not production additions. Production Explore links to per-stock Metrics; Watchlist retains its real comparison table.
- No new entry-range calculation, valuation score, semantic claim merging, verified creator performance, historical delivery or broader source coverage is claimed. [Proposed contracts](proposed-backend-changes.md) remain proposals, not activated capabilities.
- The combined test suite passes 805/805. Final build/copy/link checks, 320/390 px and desktop checks in both languages/themes, exact candidate release and live readable-content checks remain with the integrating agent. The [production acceptance record](../../reports/UX-PRODUCTION-2026-09-28.md) separates these stages.

## Change history

| Date / commit | Delivered slice | Evidence |
|---|---|---|
| Sep 28 · d1a9cdc | Isolated five-page and stock prototype | [Initial acceptance](../../reports/UX-REDESIGN-2026-09-28.md) |
| Sep 28 · a6d4948 | Prototype metrics and USD liquidity comparison | [Metric correction](../../reports/UX-METRICS-RESTORATION-2026-09-28.md) |
| Sep 28 · 9e174ea | Prototype activity layout, API mapping and adapter tests | [Activity acceptance](../../reports/UX-ACTIVITY-REFERENCE-2026-09-28.md) |
| Sep 28 · 3987be2 | Prototype persona review, source continuity and English handoff | [Journey acceptance](../../reports/UX-JOURNEYS-2026-09-28.md) |
| Sep 28 · local candidate after 3987be2 | Production route/API integration; acceptance and release pending | [Production integration](../../reports/UX-PRODUCTION-2026-09-28.md), [creator preservation](../../reports/CREATOR-UX-INTEGRATION-2026-09-28.md) |

Read this register, the [current journeys](user-journeys.md), and the latest acceptance record before continuing. Update release status only from actual committed, deployed and readable-content receipts; preserve prior prototype reports as historical evidence.

### Phone density follow-up · 2026-09-28

Implemented in the production candidate: compact phone shell, one-row stock tabs, denser Watchlist
List/Overview and author cards, shorter Explore introduction and full-width research actions.
320px Stock Metrics now shows all six readings in the first screen. 390px Explore fits two complete
company rows plus the next summary. Inputs remain 16px; primary touch areas remain 44px.
The final local suite reached 809 passing tests. A 52-route locale/theme/viewport sweep found no
horizontal document overflow. See the production acceptance report for measurements and limitations.
Publication/live receipt remains a separate release step.
