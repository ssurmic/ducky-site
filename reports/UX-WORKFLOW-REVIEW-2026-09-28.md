# Integrated workflow review · 2026-09-28

Status: follow-up candidate after production `0c904fa3`. Three independent persona reviews and root integration are complete. Final candidate gate and release receipts are recorded separately; local fixture success does not establish production data freshness or physical-device acceptance.

## Review roles and decisions

The owner asked reviewers to challenge each other's proposals, including actual click destinations, return paths, information density and visual comfort. The newcomer reviewer covered first use and attributed creator views; the experienced-user reviewer covered comparisons, source balance and disclosures; the mobile reviewer measured reading positions and controls. Root reviewed their conflicts, implemented shared corrections, and owns final browser and release checks.

- [Newcomer review](UX-WORKFLOW-NEWCOMER-2026-09-28.md): four concrete continuity fixes, with accepted and rejected peer challenges.
- [Experienced-user review](UX-WORKFLOW-EXPERT-2026-09-28.md): stock workspace, filters, historical metric states, opposing sources and return context.
- [Mobile review](UX-WORKFLOW-MOBILE-2026-09-28.md): measured 320/390px layouts and five actionable density/accessibility findings.

The installed [Frontend Design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design) supplements those reviews. The existing Ducky visual system remains: dark background `#0b0f14`, surface `#121821`, text `#e6edf3`, action orange `#ff9000`, support green `#3fb950` and risk red `#f85149`, with existing light-theme counterparts. Existing sans-serif reading text and tabular numerical treatment keep their roles. Phone titles are 21–22px, main research text 13px with comfortable line spacing, metadata 11px, inputs 16px and frequent controls at least 44px. Content is left aligned; related readings compare in rows or columns. No new hero, decorative animation, invented score or marketing preamble is added.

The largest tradeoff was resolved explicitly: the owner's useful daily digest and USD liquidity/QQQ/SPY comparison stay open. Existing Today counts become jumps to personal research. The review also rejected removing historical qualifiers, truncating conditions, counting repeated author records as independent support, treating an empty Sunday as a layout failure, and putting private creator search text into shared URLs.

## Workflow coverage

| Reader goal | Click sequence | Expected continuity |
|---|---|---|
| First stock research, no watchlist | Today dated starter or Explore search → stock Overview → supporting/risk source → Metrics/Evidence → explicit Follow | Reading requires no follow. The same stock workspace is used; return keeps the entry page. Follow remains an explicit existing account action. |
| Research an author's argument | Creators Discover/Following → principal view → exact source → named stock research | Exact post/point map and original source stay accessible. Returning restores author, query, stance/scope, expansion, focus and scroll within the account epoch. |
| Compare familiar stocks | Watchlist List/Overview → Metrics | Metrics starts with fixed stock/price, then six metrics and five disclosure/price-reference columns. Narrative columns remain, and List retains its own ordering. Stale/expired historical numbers carry visible state/date. |
| Inspect insider/fund activity | Stock tabs or Watchlist filing dialog → ticker-scoped Insider trades/Fund holdings archive → original record or stock | Complete stored archive avoids an arbitrary seven-day window. Form 4 transaction dates/amounts and 13F reporting periods preserve their meanings. Applied scopes and return routes are retained. |
| Inspect price references | Stock Metrics → option wall/support details → explicit above/below alert draft → stock | No fabricated entry range. Opening the form does not submit it. Saved draft readiness and final confirmation remain separate backend states. |
| Read today's market and own changes | Today digest → liquidity/QQQ/SPY chart, or existing count jump → research changes/latest analyses | All daily paragraphs remain. The jump focuses the target heading. Chart dates can be selected by touch, pointer or keyboard; missing readings remain missing. |
| Plan around a date | Calendar default two weeks → event detail or ticker → stock; Historical returns → SPY/QQQ comparison | Timezone and closure/early-close/unconfirmed status remain explicit. Repeated introduction moves into the existing phone filter disclosure. Historical losses and sample counts remain visible. |
| Manage the account/notifications | Existing account/profile and notification settings; disabled billing routes to Profile | Existing validation, access, retry and submission/delivery states remain. Review did not submit account changes, notifications, payments or real alerts. Existing regression coverage is distinct from live write acceptance. |

## Root browser observations

- 1440 × 900, Chinese/dark: Today digest uses three reading columns and the existing macro references; Watchlist → Metrics shows numeric columns first; Stock Metrics keeps six readings and visible Insider/Fund entries. No document horizontal overflow. The wide comparison table scrolls locally.
- 320 × 640, Chinese/dark, after adding Today jump controls: full four-part dated digest occupies y=175.9–561.2, above primary navigation at y=587. Both jumps are 44px high. Activating the new-record count focuses “研究动态” at y=68.8. No document overflow.
- The USD liquidity help target measures 44px. Keyboard Home selects 09/08, ArrowRight selects 09/09, and the accessible reading changes all three series with the selected date. An unavailable first-day daily change remains “—”.
- Calendar at 320 × 640 after the phone filter-stack correction: the first week heading starts at y=256.7, and the complete current-day tile fits around y=418–535 above navigation. The timezone, all category legend labels and two-week structure remain visible. No document overflow.
- Calendar at 390 × 844, English/dark: the first week heading also starts at y=256.7. The Historical returns jump shows both SPY/QQQ cards side by side, each 164.5 × 180.8px, with average losses, up/down counts and extreme years visible in one screen.
- Actual click chain: Explore → NVDA Metrics → Put-wall below-price draft (215) → exact NVDA Metrics with `from=explore` → Explore. The draft contained the below condition and no submission occurred.
- Actual click chain: Stock → Insider archive → keyword NVDA → record → breadcrumb. The return retained archive mode, insider category, NVDA ticker, NVDA query and all-record scopes. This also exposed a hidden active ticker on phones; the final correction adds a clearable exact-ticker scope chip even for zero matches.
- Desktop Metrics after the action-row correction: all three stock actions share y=426.7 with heights of 44px and widths 48/44/44px. The first row is 129.2px high, reduced from the previously wrapped 160px row. The six metrics precede disclosure and narrative columns. No document overflow.

Browser business data is explicitly synthetic on the local QA server, except the built public seasonality asset. One navigation during a local rebuild encountered the expected stale-module recovery screen; its refresh action loaded the current candidate. This is not a production route failure. No account write was performed. Original agent reports retain their first-pass measurements, so later corrections are not misrepresented as already present in that audit.

## Integration and scope

Existing API families, source gates and account ownership remain unchanged. This is a presentation/continuity follow-up. The separate private backend release repairs the observed AWS creator-cache and chart-metadata failures; those engineering and deployment receipts belong in the shared root `handoff.md`, `design-current-status.md`, `continuation.md` and `SYSTEMDESIGN.md`, not a competing public architecture document.

No new acquisition, semantic inference, price recommendation, verified performance or notification delivery is claimed. Final live acceptance must distinguish UI visibility from source correctness and current coverage.

## Combined candidate acceptance

Final stable source build: **821 Node tests passed, 0 failed or skipped**. The three export/home Python suites passed **14 tests**. Copy lint passed across 4,196 files; link checking passed 2,103 links with no planned-page warning; `git diff --check` passed. The first combined run exposed three obsolete UI expectations (old metric column order, hover-only stale state, first-link source assumption); their replacements explicitly check both List and Metrics, visible original dates, and independent stock/source links. No failures were waived.

After the final source freeze, a 390px English browser check confirmed the exact NVDA scope chip remains visible with zero matches while advanced filters remain collapsed. Clearing that chip removed only the ticker, retained the keyword/category/archive scopes and restored focus to search. Temporary viewport overrides were reset.

Logs: `/tmp/ducky-ux-workflow-final-tests.log`; individual review logs are named in their reports. These are candidate checks, not a production release receipt.
