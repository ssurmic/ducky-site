# Experienced-investor workflow review — 2026-09-28

Status: implemented in the local candidate based on frontend `0c904fa3`; not a release receipt. The parent agent owns the final build, full gate, browser acceptance and deployment. No production account changes, backend writes or model calls were made for this review.

This review follows `docs/ux/user-journeys.md`, the frontend repository rules and the installed frontend-design skill. The design criterion is useful company information, readings, opposing views and dates before optional explanations. It is not a new visual identity or a change to the investment calculations.

## Click paths reviewed

| Entry | Concrete path | Required continuity |
| --- | --- | --- |
| Watchlist List | Ticker → Stock Overview; row Metrics → Stock Metrics; row Map → Stock Evidence; row alert → editable alert draft | Keep default List, both long-term and trend perspectives, direct core-tool links and current account access. |
| Watchlist Metrics | Sort a header → named stock Metrics → Overview / Evidence / History → contextual return | Retain the original view, query, sort direction and scroll. Keep missing values distinct from zero. |
| Watchlist Overview | Company / Map / Metrics → the same stock workspace | Map opens directly as the Evidence tab; the full standalone map remains available from the stock workspace. |
| Explore | Candidate Metrics or Map → the same stock workspace → its source / history → Explore | Reading an unwatched company does not add a subscription. Preserve the entry context. |
| Stock disclosures | Insider trades or Fund holdings → that ticker's complete archive → exact record → breadcrumb | Preserve category, ticker and applied filters. Canonical record IDs must not erase return context. |
| Price condition | Stock Metrics → an explicit above/below reference → editable Alerts draft → stock return → original list or Explore | Preserve the full stock tab/from URL and its original source context. Opening a draft must not translate, submit or activate it. |

The record view retains original content and typed provenance. Stock History remains lazy and paginated. Form 4 transactions, filing/publication dates, 13F reporting periods and political amount ranges are not interchangeable. This slice does not reinterpret any of them.

## Findings and bounded fixes

All findings below are P2 workflow or interpretation defects in the candidate. No additional unconfirmed P1 claim is made.

1. **An applied activity filter was absent from the stock return link.** `public/js/app/views/boards.js:243` changed the hash locally without notifying the router, which retained the earlier unfiltered address. It now preserves history state and dispatches `ducky:route-state`. The integrated test applies an officer query, enters two stock tabs, and returns to the exact query and scroll position with only one filter request.

2. **Three same-side citations could make the key-source preview look unanimous.** `public/js/app/views/stock.js:98` now reserves one preview slot for each available support/counter side within the existing important evidence scope. It keeps the earliest cited records where possible and leaves every original inline citation intact. No opposite view or source is invented; unrelated mentions are not promoted to fill a color slot.

3. **Useful older metric values had their state only in hover/ARIA text.** `public/js/app/watchlist-metrics.js:44` now visibly displays the short non-current state and original date beside a retained finite value. Stale, expired and previous-sample readings remain useful, but do not look current on a touch screen. Missing remains missing, actual zero remains zero, and detailed formulas stay in method/help disclosures.

4. **Watchlist Map bypassed the shared stock workspace.** `public/js/app/watchlist-overview.js` now directs row/card Map actions to `#/stock/TICKER?tab=evidence`. This is still one click to the map. Stock tabs, follow state and contextual return remain available; the named full-map route is retained.

5. **Metrics mode initially showed the same narrative columns as List.** Mobile peer inspection found that a reader could select Metrics yet see no metric until a long horizontal scroll. The comparison table now orders stock/quote, six metrics, five signal groups, market cap, then the complete overview and both perspectives. List remains unchanged. Semantic column classes replace positional sizing so YTD does not inherit the wide narrative cell. Header sorting and values retain the same keys. The desktop action row uses the selection gutter to keep its three minimum-44px actions on one line; this is a layout correction, not a reduction of target size.

6. **Alerts returned to a generic stock metrics page and lost the original source.** `public/js/app/router.js:104` and `public/js/app/views/alerts.js` now keep the exact stock URL and its source return in account-epoch, history-entry and ticker-bound state. The return link preserves tab/from/focus; following that exact link restores the original source. The inherited source is validated separately. A generic unrelated stock link does not inherit the draft's context.

7. **Record canonicalization erased archive context.** `public/js/app/router.js:115` and `public/js/app/views/record.js` now preserve a bounded boards/reports return through alias-to-canonical ID replacement. Breadcrumbs return to the applied ticker, query and direction rather than a generic archive. History context is validated against epoch, entry address and record ID. External URLs and unsupported path suffixes are rejected.

8. **The new complete-disclosure link unnecessarily expanded seven advanced fields.** `public/js/app/views/boards.js:200` treated `purchases=all` and `content=all` as reasons to expand. Those broad scopes now start compact, with keyword search and the explicit filter toggle available. The parent's final phone inspection caught a legacy CSS rule that hides the editable ticker field in this compact state; the exact active ticker now appears as a labelled, clearable scope chip beside the result count, including zero-result and loading states. Its target is at least 44px high, it clears only the ticker and retains the other filters, and focus moves to keyword search. Sector, cap, direction, date bounds, special purchase categories, missing-content filters and non-default recent-day limits still expose their active controls.

## Peer challenges and resolutions

- The newcomer reviewer accepted route-state preservation but challenged adding redundant back buttons everywhere. This slice uses the existing stock return and record breadcrumb; the Alerts stock return is the parent's explicitly requested addition.
- The newcomer reviewer challenged selecting any opposite-colored evidence solely to balance the preview. Accepted: the replacement comes only from available important evidence, keeps original inline citations and does not infer a stance.
- Both peers required visible stale states without erasing usable historical values. Accepted. Expiry/date context takes priority over forcing a fixed number of cards into one phone screen.
- The newcomer reviewer required the complete map to remain reachable. Accepted: direct watchlist Map opens the workspace tab, and its full-map link remains.
- The mobile reviewer found the Metrics/List first-screen ambiguity. Accepted: reorder Metrics columns instead of automatically moving horizontal scroll, which could disorient readers. Keep all narrative columns and controls.
- This reviewer rejected calling Today's explicit “Add stocks” primary action a defect merely because it opens Watchlist. That is a valid personal-list action. The separate dated starter-company path should enter the stock workspace; the newcomer owner implemented that bounded correction.
- This reviewer required Creator company navigation to supplement, not replace, the exact original point/source and map. The newcomer owner accepted this. Creator search prose remains in epoch-scoped memory instead of being added to URLs; no full-archive auto-fetch was introduced.
- For Today liquidity, this reviewer supported a short route/jump to research updates while retaining the key regime and its date. Shrinking text or hiding all macro context is not an acceptable shortcut. The other owners handled those files.

## Successful daily workflow

An experienced reader checks Today's dated market/liquidity context, then uses Watchlist List to scan company, price, saved overview and the two independent perspectives. Metrics is the explicit comparison mode: sort one reading, inspect its status/date, then enter that company's exact metric or source. The source map keeps support and risk accessible; history answers what changed. The Insider and 13F actions open the ticker archive directly. A price level can seed either an above or below draft, which still requires the existing review and explicit confirmation. Returning preserves the investigation rather than restarting it.

Long-term and trend readings remain separate perspectives. IV/HV measures implied versus historical volatility, not cheapness. Attention and Degen do not become valuation, directional sentiment or an independent buying recommendation. The actual valuation/technical methodology and options expiry remain available through existing help and method disclosures. No buy range or missing price is manufactured.

## Validation and limitations

- Focused command: `node --test tests/watchlist-overview.test.js tests/watchlist-workspace.test.js tests/product-focus.test.js tests/router-workspace.test.js tests/stock-disclosures.test.js tests/newcomer-workflow.test.js tests/app.test.js tests/radar-activity.test.js`.
- Result: **102 passed, 0 failed, 0 skipped**. Log: `/tmp/ducky-ux-expert-final-tests.log`.
- The two new full-chain router regressions use faithful synthetic read responses and reject every non-GET request. They cover exact alert tab/source return, independent source validation, record alias canonicalization, ticker/query/direction/scroll restoration, compact all-record filters, and invalid external, entry, ticker, record and old-epoch state.
- Existing coverage retains sort/focus/scroll behavior, both opposing-source cases and all inline citations, finite stale values and actual zero, lazy history, denied-source guards, disclosure semantics and newcomer continuity.
- The parent's first complete Node run found three outdated assertions (817 passed of 820): an assumption that Discovery's first link was the original source, a tooltip-only stale-state expectation, and the previous Metrics narrative-first order. Only `tests/free-experience.test.js` and `tests/watchlist-digest.test.js` were updated. They now separately assert the stock and exact timestamped source destinations, visible stale state/date with the retained number, and the distinct List/Metric column orders while preserving both full perspectives. The affected suites then passed **22/22**; no source change was required. Log: `/tmp/ducky-ux-updated-assertions.log`. The parent owns the repeated complete gate.
- After the final phone scope finding, the radar activity, router workspace and stock disclosure suites passed **16/16**, including a new empty-archive test that sees the exact ticker outside the collapsed filters, clears it with a 44px control, preserves query/category/purchase scope, sends only GETs and restores focus. Log: `/tmp/ducky-ux-scope-tests.log`.
- `node --check` on the modified JavaScript and `git diff --check` passed. The final integration build and complete release gates belong to the parent agent.
- This reviewer did not obtain a new accepted desktop browser capture: opening its isolated review tab timed out before any viewport change. No user tab was modified. The parent and mobile reviewer own the actual viewport evidence; their measurements must not be reported as this reviewer's measurements. The final metric column order, gutter layout and return paths require the parent's final browser pass after one stable build. No physical-device test is claimed.

The candidate is ready for integration verification; this report does not certify merged code, deployment or real notification delivery.
