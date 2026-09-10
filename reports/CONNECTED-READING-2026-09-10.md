# Shared research in the default reading workflow

Owner steering, 2026-09-10: continue implementing the product plan, connect UI and backend, and publish a usable frontend by morning. The default app now uses Today / Watchlist / Explore in both languages. This supersedes the earlier preview-only rollout decision; it does not substitute for the planned human user study.

## Result

- Today, Watchlist, stock detail and Stock briefs use the same saved, source-bound stock analysis. Pending stock summaries still link to the stock page.
- Existing shared GET revalidation now covers `/me/stock-research` and `/stock-research/{ticker}`. One request runs at a time every 30 seconds on focused pages; a two-endpoint stock view checks each endpoint about once per minute, before network latency/backoff. Hidden or offline pages pause. History, searches, account changes and writes are never replayed.
- The mounted view adopts validated responses in place, retaining open reasons, keyboard focus and the visible row. An explicitly inspected price date stays selected; an untouched chart follows the latest available close.
- Source dialogs retain their exact source revision while valid. A withdrawn/changed source closes with a plain-language notice. Previous analyses keep their original sources and date.
- Missing, failed, insufficient and withdrawn summaries have different copy. Pending does not imply that a reviewer is currently running. Quote, closing-price, analysis and source timestamps remain separate.
- Key source cards prioritize the overview's citations and opposing evidence. Numeric source cards show the observation date. Main stock links and citation controls have at least 44px height.
- Advanced destinations remain under Explore or stock details; historical records and old links remain accessible. Billing still follows the existing server-configured access policy.

## Verification

- 609 JS tests passed, including in-place pending→ready, source withdrawal, account epoch changes, preserved search text, focus/expanded reasons and chart dates. Tests verify GET-only reuse and no per-card requests.
- Build, bilingual copy lint, link validation and three export tests run before release. See release addendum for final counts/commit.
- Browser viewport simulation, not physical phones or touch emulation: EN/light 390×650, ZH/dark 320×600, EN/dark 320×600, ZH/light 390×650. Screenshots inspected for Today, stock, Watchlist, Stock briefs and source dialog.
- EN Today 390×650: app content height 520px, first record begins at y≈352; one record's summary and source actions fit above the bottom navigation. ZH stock 320×600: content height 470px, price y≈198, previous summary y≈387; dated saved analysis remains readable. EN Watchlist 320×600: first row y≈245. ZH briefs 390×650: first card y≈172. Inputs measured 16px; citations 44×44px; stock-open links corrected from 36px to 44px height.
- Browser navigation sweep after page initialization: watchlist, briefing, chart/NVDA, calendar, boards/Radar, alerts, creators, profile, billing. ZH/light 390px and EN/dark 320px had no horizontal overflow. Synthetic empty/unavailable ancillary data was not counted as production data acceptance; billing correctly uses Profile while billing is disabled.
- Source dialog Escape restored the citation trigger and preserved the expanded reasons. Actual response adoption/withdrawal is also covered by the DOM integration tests.

## Limits and rollback

- This release does not create new market-data entitlements. A refresh interval is not proof of minute-old exchange data.
- At 08:11:56 UTC the backend's fixed ten-stock acceptance was 8/10 readable. NVDA and MU remained in retry; model usage identifies draft-stage exhaustion/timeouts. The frontend must not display these as accepted reports.
- No X login, model switch, paid data activation, notifications or account edits were performed.
- Human usability interviews, blind content labels and three-trading-day quote freshness acceptance remain outstanding.
- Roll back the Pages deployment for the entire UI change. The existing `product_focus` config flag also permits restoring the prior navigation in a separately built release without changing source records.

Final local gates after the touch-target and reading-anchor fixes: 609/609 JS tests, bilingual build, copy lint 3,225 files with zero failures, 1,266 link checks and 3/3 export tests. Temporary phone viewport overrides were reset after testing; the user's in-app panel itself remains narrow and is not counted as desktop validation.
