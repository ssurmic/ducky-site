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
