# UX change and integration register

Updated: 2026-09-28. This English register is the canonical handoff for continuing the UX redesign. Append each accepted change here and link its evidence. User-facing copy remains bilingual.

**Delivery status: local interactive prototype.** These changes have not replaced production routes, been connected to account APIs, or been deployed. See the [preview guide](README.md) for running and reviewing it. The private backend's shared documents remain the system-design authority; this register records presentation scope and integration boundaries only.

## Implemented presentation

| Area | Current UX | Integration boundary |
|---|---|---|
| Primary navigation | Today, Watchlist, Explore, Calendar and Creators stay visible. Stock research keeps its entry context. | Prototype routes only; no production replacement. |
| First use | Dated examples are readable with no watchlist. Following is an explicit decision after research. | Browser-local demo state; production follows must use existing account writes. |
| Today | Lead story and important changes precede secondary activity. The liquidity / QQQ / SPY comparison remains accessible, with retained chart choices. | Synthetic data; live surfaces must read the same shared research versions. |
| Explore | Search and stock results come first. Summary and metric comparison work without following; themes are optional. | Same stock/metric components as Watchlist. No new per-user calculations. |
| Watchlist | List is the default, Overview explains context, Metrics compares readings. Direct stock, map, metric and disclosure entries remain available. | Reuse `/watchlist` and shared stock research. Preserve filters, sorting and reading position. |
| Stock research | One destination for company context, support/risk, reference plan, metrics, evidence and chronology. Related creator, disclosure and calendar links retain the ticker. | Quote time, source withdrawal, expiry, access and missing fields must retain backend meaning. |
| Metrics | Long-term/trend perspectives, option walls, support references, IV/HV20 and Degen attention stay discoverable. Level actions distinguish upward/downward conditions. | Use existing definitions. Attention is not valuation; unknown is not zero. |
| Creators | Views precede the directory. Linked stock views share creator/source IDs and bookmarks with the creator archive. | Server-side scope filtering precedes pagination. Production saved-view ownership still needs a contract. |
| Company and capital activity | Insider disclosures, 13F holdings, political disclosures and company events have typed values and dates, with source details. | Pure read adapter is implemented and tested; browser still uses six synthetic archive-shaped records. |
| Activity across pages | Today has a secondary preview; stocks show related records; Watchlist links are ticker-scoped. The metric entry no longer requires a populated watchlist. | Reuse record IDs and shared projections, not copied per-user feeds. |
| Calendar | Two-week default; date, event meaning, related stock and timing status lead. Source and historical examples expand on demand. | Reuse existing event/date rules; no forecast or event producer changes. |
| Personal watch plans | Reference levels open editable conditions and expiry. The destination is explicitly named My watch plans. | Local drafts only. Notification creation, compilation and delivery are separate production states. |
| Saved material | Creator views share one saved-view identity across stock and author surfaces. Other evidence markers remain on their stock map; unused theme saving was removed. | No implied account synchronization or universal saved-research backend. |
| Responsive and bilingual UI | Chinese/English, light/dark themes, narrow-phone layouts and isolated demo storage. | Browser viewport verification, not physical-device testing. |

## Production connection checklist

1. Use existing `api.js`, account epochs, request cancellation and access control. Prototype localStorage is never an account database.
2. Radar reads use `/radar/archive.json`, `/radar/record.json` and `/radar/coverage.json`; public routes add `/public`. The public endpoints were verified as `access.mode=delayed`, `delay_days=5`. Authenticated reads require separate acceptance.
3. Apply kind, ticker, search and time filters on the server before following `next_cursor`. Six sample records do not establish market-wide counts. The existing API does not supply amount rankings, exact person profiles or complete category totals.
4. Preserve Form 4 trade dates versus filing dates; 13F report periods versus filing dates; political amount ranges; and company effective dates. First observation must not become publication time. Options or unresolved securities must not generate invalid stock actions.
5. Display `access`, `partial` and real coverage fields: `status`, `last_success`, `gap_count`, `limitations`. Readable archived records do not prove current acquisition. Uncovered sources are not healthy sources.
6. Track production reference-range, personal-plan and bookmark contracts in [integration gaps](proposed-backend-changes.md). The UI must not invent a valuation score or imply that handmade reference bounds are calculated.
7. Reuse stable stock, author, source and view IDs across entry points. Navigation origin and presentation preferences are UI state; following controls personal scope, not permission to research a company.

## Local change history

| Date / commit | Delivered slice | Evidence |
|---|---|---|
| Sep 28 · `d1a9cdc` | Integrated five-page and stock prototype | [Initial acceptance](../../reports/UX-REDESIGN-2026-09-28.md) |
| Sep 28 · `a6d4948` | Restored metrics and USD liquidity comparison | [Metric correction](../../reports/UX-METRICS-RESTORATION-2026-09-28.md) |
| Sep 28 · `9e174ea` | Stocks.News reference, activity layout, API mapping and adapter tests | [Activity acceptance](../../reports/UX-ACTIVITY-REFERENCE-2026-09-28.md) |
| Sep 28 · this change | Three-persona review, Explore/Watchlist parity, source continuity and English handoff | [Journey acceptance](../../reports/UX-JOURNEYS-2026-09-28.md) |

Before continuing, read this register, the [persona journeys and content map](user-journeys.md), and the latest acceptance record. Each new entry point must name its shared data owner, current wiring status and remaining gaps.
