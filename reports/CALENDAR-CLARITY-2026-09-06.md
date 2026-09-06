# Calendar clarity · 2026-09-06

Calendar defaults to an agenda with collapsed event research. NYSE holidays and early closes remain visible through filters, in the agenda and on narrow grids. Labor Day September7,2026 explicitly says US markets closed, with the next regular open September8 at09:30ET. Impact disclosures explain long-call/put time decay, pricing-in of holidays (no fixed daily-Theta loss claim), inability to close on those exchanges, reopening gaps, short-option assignment risk and contract/broker deadlines. Other markets can follow different schedules.

Sources: [NYSE official hours/calendar](https://www.nyse.com/trade/hours-calendars), [OIC Theta](https://www.optionseducation.org/advancedconcepts/theta). Published2026–2028 coverage has29 full holidays and5 early closes. July3,2026 is a full closure; December31,2027 is not a New Year’s observed closure. No inference beyond published schedule coverage.

The historical panel leads with a plain explanation, then two named ETF cards. September2000–2025: SPY mean−1.2%,14 up/12 down; QQQ mean−1.9%,12 up/14 down. SPY's negative average despite more up years is explicitly explained as losses outweighing gains. All26 years, worst/best dates and source methods remain available. Decade selection and oldest/newest ordering replace the horizontal chart. Small nonzero changes never read as 'up0.0%'.

All320 existing monthly observations are unchanged. Only completed windows enter the46 month×cycle×period cohorts. Each saved explanation includes its exact per-year signature and fact/language/version hash. A mismatched signature is never displayed. No price fetch, model inference, notification or algorithm change occurs on a visitor request.

Local-model production: initial free-form small-model cohort interpretations contained factual errors and were rejected, never published. The configured local deep model drafted reusable explanation patterns through `bin/llm.py`, with180s timeout and no retry. This GPT session edited and checked each pattern against the deterministic predicate. The reviewed language is versioned in `watchlist/seasonality-language-v1.json`; numerical cohort binding is offline and deterministic. Repeated exports are identical and require zero additional model calls. A model syntax check alone is not described as factual verification.

Regeneration:

```bash
python bin/market_sessions.py --export <site>/public/market-sessions.json
python bin/seasonality_readings.py --input <site>/public/seasonality.json --output <site>/public/seasonality.json
```

To change wording, create a new local-model draft with `scripts/draft_seasonality_language.py --output <new-path>`, review against the predicate, and version the approved language before exporting. A monthly price refresh must rebind explanations; old text fails closed if the cohort changed.

Validation and deployment receipts are appended after final checks. Local UI fixtures use actual rendered components and static public data, with synthetic membership state; they are not a real-user login test. Private evidence responses remain separately covered by the existing API tests.

## Final acceptance

- Code: backend `6cbef19`, frontend `57ea497`; final Pages `8b9f92ef`. Both include the concurrent creator updates (`de90fb8` / `9f12dbc`). Production calendar API returns35 events including Labor Day; the site static feed also contains the closure. Both holiday resources are byte-identical (SHA256 prefix `e9ad35481f04b7f9`).
- Production `seasonality.json` equals the committed enriched artifact, with all320 original observations byte-for-value unchanged and46 matching bilingual readings. September summary and early-year loss records were checked in the browser.
- Local backend1019 passed; final frontend131 passed;5 build-asset tests, copy lint and718 links passed. DGX1018 passed/1 skipped and selftest ALL GREEN with real model transport disabled and an isolated temporary test directory. The first DGX gate encountered a pre-existing test-harness issue: a mocked HTTP test still contended for the live local-model mutex. The isolated rerun retained the test's lock/budget logic without contending with live research. No production lock was removed or bypassed.
- Native browser QA:390px Chinese dark,320px English light,1280px desktop. Direct decade selection, oldest/newest order, month/midterm/year-end changes and empty December remainder tested. No horizontal page overflow. Actual existing production Pro session confirmed the holiday disclosure, saved September explanation and on-demand PPI history with loss/missing records. No new login, credential change or private-data publication was required.
- Release correction: an initial shell sequence continued to deploy previously built assets after a concurrent rebase conflict interrupted the next build. That intermediate deployment (`392724fa`) was superseded by the fully merged, freshly built and tested `8b9f92ef`. Final production checks include the creator additions and new calendar. No demo resources were edited.

No trading rules, weights, original price records or notifications were changed. Exchange schedule coverage ends in2028; monthly data remains dated2026-08-31. Raw-source revisions or new complete years require the offline binder to regenerate only the affected explanation artifacts.
