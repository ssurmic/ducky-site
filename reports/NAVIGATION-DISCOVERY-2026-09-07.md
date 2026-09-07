# Navigation, discovery and homepage integration · 2026-09-07

The outer sidebar now owns Degen Index, Vibe Check, Oversold stocks and Ducky trades. Radar expands into its twelve categories plus market context, macro and saved screens. Briefing no longer appends separate market or macro widgets; Radar no longer loads market context before its records. Mobile keeps the five-item bottom navigation and exposes all destinations in More, with expandable Radar categories. The homepage catalogue and app shell use `product-navigation.json`.

The homepage retains the owner's latest approved research-support positioning and the NOK/GLW/HOOD evidence panels, including negative windows. It adds a fourteen-tool catalogue, visible Free/Pro cards and a $9 monthly entry in the hero. Prices match the existing public billing catalogue: USD9/month, USD90/year, CNY499/year (Chinese copy only). Checkout determines available payment methods. Register/billing links preserve the intended route through sign-in and the latest email setup flow.

Dated NVDA/SPY/NOK daily-close cards use the existing public price API and a separately retrieved immutable fallback (`public/examples/desk-prices-2026-09-07.json`). The fallback was retrieved2026-09-07 for price session2026-09-04. Charts show all returned daily closes; neither the source nor fallback is labeled realtime. There are three bounded public reads, no polling or member-research fetch. The duck evades the mouse by at most14px while its button stays fixed and keyboard accessible. On phones the prices form a fixed row and the duck does not move; reduced motion also disables animation. The hero's existing pause control pauses both sets of animation.

## Discovery contract

`#/opportunities` reads the existing Pro-only `/screens/preview` with `scope=covered, oversold=true`. The covered universe includes stocks beyond a user's watchlist; it is not every US-listed stock. Existing predicate qualification is unchanged (daily RSI≤35 OR approximate weekly RSI≤40 OR approximate monthly RSI≤40). Filters select all covered candidates, outside-watchlist candidates or personal-watchlist candidates. Users can open charts/research/alerts and explicitly customize/save a screen. Visiting the page never creates an alert or subscription.

Peer underperformance is descriptive context, not a new trading rule or threshold. The shared producer projects a dated20-session comparison only when status, dates, horizon, actual constituents and finite reconciled returns validate. Missing/legacy/unaligned comparisons remain unavailable; actual zero is retained. Stale/warming results do not appear as current opportunities. This change does not modify selection, peer taxonomy, weights, entry/exit rules or the frozen `oversold-basket-v1` research.

`#/degen` and `#/vibe` are separate destinations over existing social heat evidence. Degen emphasizes the hot filter, not an invented market-timing score. History and missing collection coverage remain accessible.

`#/ducky` reads the existing public ideas ledger. Only explicitly `book=live` entered/add/trim/closed/invalidated records count as actual trades. Paper and watching-only records do not. Closed, invalidated, losing and incomplete-price records remain present. The existing source has one PAPER SMH example and no real buys, so the real-trade page has an honest empty state and links the complete journal. Owner-provided real transaction facts remain outstanding; no actual buy or return was invented.

## Acceptance

- Frontend266 Node tests pass after integration with notification onboarding at a680afb. Includes new navigation/sign-in, outside-watchlist/unknown/zero, free gate, stale results, session races, paper separation, quote validation, catalogue and motion checks.
- Bilingual build20 pages; copy lint and internal links pass. Python asset isolation4 passed/1 pre-existing skip.
- Backend full selftest1867 tests/5 dependency warnings, ALL GREEN; API remains server-gated and request paths do not rebuild facts.
- Actual local browser checks: Chinese dark1440 desktop homepage/catalogue/pricing and ready oversold, expanded Radar, Degen and Ducky empty page; Chinese390/320 mobile navigation and English light320 opportunities/pricing. Document width remains320 at320px. Narrow candidate filters were stacked after visual inspection.
- Authenticated views used explicit local QA fixtures, not claimed as production member evidence. No real watchlist, alert, payment or notification was mutated for validation. Production checks are recorded below after deployment.

## Production acceptance

Released site `bda03880` as Pages `391fea36` (`https://391fea36.ducky-site.pages.dev`), App graph `5ba4b264bc0fc35c259e`. Chinese/English homepage and App return the deployed assets; pricing and catalogue are present. GitHub CI for bda03880 succeeded. Final source-specific checks20 passed; build20 pages, copy lint1832 files and940 internal links passed. The two corrected brand strings came from newly merged notification recovery copy.

Backend `a63386c` deployed and warmed the existing shared cache. Production contains804 covered tickers,6 qualifying stocks,758 unknown technical rows, and only1 validated dated peer comparison across the full cache. These counts are a2026-09-07 observation, not a coverage guarantee or hardcoded UI values.

The first real Pro browser check caught one old `technical.net_gex_bn=NaN` value causing strict JSON serialization to fail. Backend `2eaf446` treats legacy nonfinite JSON constants as missing before evaluation and serialization, including existing cached documents. Required missing indicators remain unknown; irrelevant missing indicators do not hide a qualified stock. New regression verifies both behaviors. Cache refreshed, API restarted; subsequent live browser check returned all6 candidates without errors. Local full gate1870 passed; DGX1869 passed/1 existing skip/1 warning, ALL GREEN and API active.

Actual signed-in production checks then covered Ducky real-trade empty state, Degen (no currently overheated records), Vibe (real observed history/coverage), outer Radar expansion and Oversold stocks. Selecting outside-watchlist on the signed-in account displayed4 candidates. The390px production viewport retained390px document width, stacked filters and bottom navigation. No account, watchlist, alert, payment or notification was changed for these checks. Earlier local-only test limitations remain in the record rather than being retroactively relabeled live.
