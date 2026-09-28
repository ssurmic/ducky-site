# UX production integration and acceptance

Date: 2026-09-28. **Status: deployed to production; release receipt below.** The combined npm test suite passes 809/809. Browser acceptance and local release checks are complete; production release and authenticated reads have been verified. Append the final candidate SHA and release/live checks before treating this as delivery evidence.

Frontend base: 3987be2, the prototype journey iteration. Selected designs are integrated into existing production route modules; the prototype is not served as the application. No backend API/schema/producer change, model call, historical rewrite or new account-storage contract belongs to this slice. Private shared documents remain the architecture authority.

## Implemented scope

Explore prioritizes search and compact dated discussion candidates. Each candidate names Overview, Metrics, Map and activity; the weekly feed and explanations expand on request. Saved discussion data supplies candidates. Missing/stale states remain explicit and popularity does not imply sentiment.

Watchlist retains default List, Overview, sortable Metrics and Heatmap. Compact rows/cards connect stock, map, metrics, alerts and activity. Existing left/right perspectives, unknown-last sorting and dated references remain. The bulk toolbar is hidden until selection.

Stock research has Overview, Metrics, Evidence and History tabs plus chart/deeper tools. Metrics reuse existing definitions and separate quote, snapshot, option-retrieval and expiry context. Walls and 20-session low/high are references. **A verified new entry range is unavailable**; the UI states this and links existing readings. It does not display the prototype's handmade buy range.

Creators defaults no-follow visitors to discovery unless Following was explicitly requested. Main views/tickers precede archives; qualifications stay visible. Exact repeated wording by one stable author can collapse without losing any original post/point/source/date. The map budgets preview slots by displayed groups, preventing repeats from crowding out other records. Support is green and risk red, with text labels.

Company and capital activity reuses Radar archive/detail routes with insider, fund, political and company categories. Server-side ticker/search/category filters precede cursor pagination. Existing reports, source details, typed values/dates, access and coverage remain available.

Reference actions prefill the existing alert draft with explicit above/below direction. Submission, review and confirmation remain explicit. Entry performs no automatic POST; compiler readiness and notification delivery are separate from form availability.

Today and Calendar retain existing production routes/source semantics. Prototype examples, liquidity comparison and event mockups are not substituted into real data paths.

## Existing endpoint contracts

| Consumer | Read / action | UI obligation |
|---|---|---|
| Explore | Symbol search; /radar/social.json; optional existing Today feed | Collection date and ready/stale/pending/unavailable/empty states; no rank-to-stance inference. |
| Watchlist | /watchlist, /me/stock-research, /briefing/stocks?fields=signals, ticker-scoped Radar signal reads | Shared research, independent quotes, explicit membership writes; unknown is not zero. |
| Stock Overview / Evidence | /stock-research/{ticker} | Analysis/evidence identity, available facts, source/access revocation and exact links. |
| Stock prices / Metrics | /bars/{ticker}?period=6mo, /snapshot/{ticker} | Historical bars are not current quotes; accepted 202 is pending with retry; original metric dates remain. |
| Stock History | /me/research-changes with ticker, window, scope and cursor | Server pagination; publication/observation and recorded changes stay distinct. |
| Creators | /kol/discover, /kol/feed or /kol/trial-feed, /me/kols, /kol/{id}/page, /kol/{id}/history, /kol/{id}/posts/{post} | Access, scoped cursors, original IDs, conditions, withdrawal and full archives. |
| Creator follow | Existing /kol/{id}/sub POST/DELETE | Explicit account action; viewing does not subscribe. |
| Activity | /radar/archive.json, /radar/record.json, /radar/coverage.json, /radar/facets.json; public equivalents add /public | Filters before pagination; response-owned access/partial/coverage; typed amounts/dates and valid security actions. |
| Alert draft | /alerts/translate, /alerts/drafts/{id}, /alerts/drafts/{id}/confirm | Prefill, submission, readiness and confirmation are distinct. |

The earlier [activity API audit](UX-ACTIVITY-REFERENCE-2026-09-28.md) observed five-day delayed public access at that time. It does not certify current authenticated freshness. Preserve each response's actual access/coverage: readable archives alone do not prove current collection.

## Sources and exact repetitions

Collation is deterministic presentation. Stable author/record identity, explicit ticker scope, both language titles and attributed-opinion source receipts are required. Every semantic field must match after excluding a narrow named set of receipt fields. Unknown fields, differing qualifications/horizon/action/stance/source semantics or bilingual wording keep claims separate. Missing/ambiguous identity, unsupported providers, unsafe links, withdrawn/superseded records and mentions cannot qualify. Current grouping conservatively accepts matching source-bound YouTube opinions.

The lead is an original card; expansion retains every other original record. Existing multi-source map nodes stay whole. Exact post/point links, excerpts and timestamps remain reachable. Counts describe records; repeat notices reject independent-support meaning. No semantic inference, support-score change, performance claim or historical foresight is added. See [creator/source preservation](CREATOR-UX-INTEGRATION-2026-09-28.md).

Activity retains Form 4 trade versus filing/publication dates, 13F period versus filing/execution, political ranges and company effective dates versus observation. Joint owners do not multiply one transaction value. Options/unresolved securities do not create invalid equity actions. No amount ranking or complete-market count is inferred.

## Integration findings corrected

| Finding | Correction | Evidence at this checkpoint |
|---|---|---|
| Alert prefill did not set actual textarea value | Set input value, explicit above/below, no submission on entry | Focused stock tests passed. |
| Accepted snapshot could appear empty-successful | Visible pending and retry; no invented readings | Focused stock tests passed. |
| Denial could leave other tabs or late results readable | Clear protected panels and reject late snapshot/bar/history | Focused stock tests passed. |
| Reference deep link lacked destination focus | Consume supported focus for this entry; ignore unknown targets | Focused stock/router tests passed. |
| Return context lost activity origin or account boundary | Per-entry origin, valid internal routes including activity, epoch binding | Focused router tests passed. |
| Repeats consumed the map preview | One slot per eligible group, every original expandable | Preservation/map tests passed; grouping performs no fetch. |
| No-follow creator entry and long author walls | Discovery entry, compact main views, full archive retained | Actual mount tests passed. |

## Validation so far

| Check | Result | Boundary |
|---|---|---|
| Creator suite: node --test tests/creator*.test.js tests/evidence-source-navigation.test.js tests/evidence-grouping.test.js tests/workspace-ux.test.js | 132 passed, 0 failed, 0 skipped | Production modules with mocked HTTP. Run preceded canonical locale merge; final build verifies integrated copy. |
| Map suite: node --test tests/evidence-repeat-groups.test.js tests/evidence-grouping.test.js tests/evidence-topics.test.js tests/evidence.test.js | 42 passed, 0 failed, 0 skipped | Dates/IDs, exact links/focus, changed/opposed/missing identity, zero-fetch grouping. Overlaps above; do not sum totals. |
| tests/stock-workspace.test.js | 7 passed | Integrating-agent report; focused pending/denial/prefill cases. |
| tests/router-workspace.test.js | 4 passed | Integrating-agent report; focused context/focus cases. |
| Creator/map syntax and diff checks | Passed | Complete candidate checks pending. |
| Browser: 390 px Chinese dark Stock Metrics and Watchlist | Initial dimensions check passed | Subsequently compacted selection toolbar/map header; final recheck and full matrix pending. |
| Browser: 390 × 650 Chinese dark evidence map | Exact repeat expansion and green support/red risk confirmed | Integrating-agent browser check; full route/locale/theme matrix still ongoing. |
| First combined npm test | 795 passed, 5 failed, 0 skipped; 800 total | Historical failed run: two stale creator layout/route expectations and three Radar failures. Corrected before the passing rerun below. |
| Creator compatibility: node --test tests/free-experience.test.js tests/login-return.test.js | 13 passed, 0 failed, 0 skipped | Asserts directly visible conditions, original timestamp/source and missing-English state; login enters Discover without automatic subscription. Existing unsafe-return checks retained. |
| Combined npm test after fixes | 805 passed, 0 failed | Reported by the integrating agent. This replaces the earlier baseline/failed-run status; final committed-candidate receipt remains to be added. |
| Final build and copy/link lint | Passed | 14 Python data/export tests; 4 asset-isolation tests passed, 1 expected bounded-history skip. Copy and internal-link checks passed. |
| Candidate commit, merge, release, live content | Not recorded; not deployed | Authorization/available access is not deployment. |

## Final phone density acceptance

The owner requested a more compact phone layout during final review. Mobile headings, spacing,
card padding and repeated introductory copy were reduced. Inputs remain 16px and frequent actions
retain 44px hit areas. Existing source qualifications stay complete; full list summaries expand.
Creator ticker chips now open the common stock workspace with their origin retained.

Measured Chrome viewport simulation (not touch emulation or physical-device testing):

| Surface | Viewport | Measured result |
|---|---|---|
| Explore, Chinese light | 390 × 650 | First company at y=296; row height 117px. Two complete rows plus the third company's summary fit. |
| Explore, English dark | 320 × 640 | First company at y=297, previously y=374. Two complete companies fit. |
| Watchlist List, Chinese light | 390 × 650 | First row y=378, previously about y=433; rows 112–127px. Fixed stock+price columns free 48px for the overview. Each stock action remains at least 44 × 44px. |
| Stock Metrics, English light | 320 × 640 | First metric y=284, previously y=490 before compacting. All six metric values fit above navigation; all four tabs retain 44px height. |
| App reading area | 390 × 650 / 320 × 640 | 544px / 534px after header and navigation. |

A final 52-route sweep covered Watchlist, Explore, Stock Metrics/Map, Creators, Radar, Calendar,
Briefing, Chart, Today, Alerts, Profile and the existing disabled-billing→Profile path across
Chinese/English and light/dark combinations at 320/390px. No document-level horizontal overflow.
Visual checks included dense list/overview, Explore, metrics, author claims and conditions,
empty-watchlist actions, green/red evidence cards and expanded repeats. Desktop evidence retained
three columns at 1440 × 900. The final browser error log was empty. Local records were explicitly
synthetic; none of these checks claim real notification delivery or complete upstream coverage.

The last boundary review also fixed source dialogs surviving authoritative 403/410 withdrawal,
snapshot request state preventing a retry after permission recovery, and late responses overtaking
new reads. Regression tests cover each. Source views, return context and scroll remain account-bound.

## Prototype exclusions

Fictional authors, sample prices/views, nine-stock fixtures, six activity records, handmade entry bounds and the scenario selector remain in prototypes/ux-lab. Prototype Explore comparison/theme filters, shared view bookmarks, My watch plans and synthetic liquidity comparison are not claimed as integrated. Production comparison remains in Watchlist; Explore names per-stock Metrics. New saved-view or reference-range services need separate contracts and acceptance.

Retained historical reports: [initial](UX-REDESIGN-2026-09-28.md), [metrics](UX-METRICS-RESTORATION-2026-09-28.md), [activity](UX-ACTIVITY-REFERENCE-2026-09-28.md), [journeys](UX-JOURNEYS-2026-09-28.md). Their screenshots/tests prove only those dated prototype revisions.

## Release handoff

Append final source SHA, complete gate, final browser matrix, actual merge/deployment identifiers and post-release readable-source/route checks. Verify allowed and denied access without recording account data. Update the [register](../docs/ux/change-register.md), [journeys](../docs/ux/user-journeys.md) and central private status from that receipt. Keep missing range, source coverage and alert delivery limitations explicit. Deployment alone does not prove every upstream source is current.

## Production release receipt

- Reviewed frontend PR: https://github.com/ssurmic/ducky-site/pull/104 (merged).
- Production source: `0c904fa35a04466d4896a3aa8bb5b9b529811f26`; UI candidate: `8d6ade2b8bb4c2582467d139dfdd917242a07734`.
- Hosted build-and-lint passed in 2m7s. The exact merged tip was then released with `scripts/deploy_pages.sh`, which reran all 809 Node tests, 14 Python tests, copy/link lint and landing checks.
- Pages deployment: https://697e48fc.ducky-site.pages.dev . Production: https://duckybot.app .
- `config.js` returned `VERSION: 0c904fa3` at 2026-09-28 19:05:25 UTC; CSP remained present.
- Authenticated production browser reads confirmed the new Explore candidates and direct routes, then real stock metrics, dated option walls, 20-session range and source clocks. IV gaps and insufficient attention samples remained explicit rather than becoming zero.
- Public Radar returned HTTP 200 with 40 records and its existing five-day delayed-access envelope. This does not certify current coverage of every source.

The release uses real production modules and data. The local synthetic preview is not deployed as the app.
No stock subscriptions or alerts were created by the acceptance pass. No backend runtime change, paid
inference, backfill or producer restart was performed. Roll back UI code by reverting PR #104 through
the standard reviewed-main Pages release process; no data rollback is required.

This documentation receipt is a later, documentation-only revision. It does not change the deployed
UI artifact or its version.
