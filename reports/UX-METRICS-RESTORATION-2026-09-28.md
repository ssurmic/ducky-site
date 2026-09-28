# Analytical features restored to the UX preview

Status: implemented and checked locally in the existing UX worktree; not connected to production
data, pushed, merged or deployed. Follow-up to `d1a9cdc` and the initial UX acceptance record.

## Owner correction

The initial redesign omitted analytical context the owner uses: left/right perspectives, option
walls, support levels and IV/HV. The owner also asked to preserve Today's dollar-liquidity index
and three-figure comparison. Simplifying presentation must retain these visible capabilities.

## Implemented

- Watchlist keeps List first and Overview second, and adds a visible Metrics comparison.
  Both viewpoints are also visible in List and Overview. Overview has metric shortcuts.
- Every stock has an explicit Metrics and levels tab with Put/Call walls, 20-session closing low,
  50/200-day averages, IV/HV20 components and expiry, and Degen attention. Metric explanations are
  reachable from table cells and accessible info buttons. A level opens an editable local draft.
- Numerical headers sort in either direction, retaining unknown values last, horizontal position
  and keyboard focus. The stock/evidence column stays fixed while the metrics table scrolls.
- Today shows a dollar-liquidity score and ten-session comparison with QQQ and SPY. The first line
  can switch to 10-year yield. Chart selection and keyboard-accessible date slider expose raw
  values, session dates and daily changes. Each line uses its own minimum/maximum.
- All fixtures are explicitly synthetic; TSM retains missing metrics and AAPL partial coverage.
  No production calls, account writes, notification activation or model inference were introduced.

## Definitions checked against the existing implementation

Read-only reference: frontend `public/js/app/stock-reading.js`, `watchlist-signals.js`,
`today-macro.js` and `today-spark.js`, plus their existing bilingual copy. The backend definitions
were checked by a bounded read-only agent; no backend files changed.

- Left/right means long-term/trend perspective, not bullish/bearish stance.
- Walls are modeled Gamma concentration references tied to an options snapshot and expiry;
  they do not guarantee a bounce or rejection.
- IV/HV20 uses near-expiry near-ATM IV divided by annualized 20-session realized volatility.
  A ratio below one does not by itself establish undervaluation or predict direction.
- Degen measures attention, not valuation. The owner's term “低估指数” has not been unambiguously
  mapped to an existing field. Neither Degen nor market K is relabelled as a per-stock valuation score.
- Dollar liquidity is a 0–100 funding score: below 40 tight, 40–59 mixed, 60 or more loose.
  The three independently normalized lines compare shapes, not magnitude or causal influence.

## Validation

- Prototype acceptance: 12 journey cases (13 test nodes including their parent), all pass.
  Added checks cover unknown-last sorting in both directions, retained focus/scroll, expiry and
  missing values, three lines, raw-date readings, yield switch and normalization semantics.
- Existing frontend suite: 773 tests pass. Copy lint: 4,055 files, no violations.
  Internal link check: 2,067 links, no planned-page warnings.
- Browser checks: desktop Chinese/dark, mobile 390×650 Chinese/dark and 320×600 English/light.
  Stock metrics, Watchlist metrics and Today comparison were inspected. A 12px Watchlist overflow
  at 320px was found and fixed by wrapping search/views and using two-column narrow-screen filters.
  Metric dialog closes with Escape and returns focus; date selection returns the expected raw values.

Rollback: the preceding local prototype commit is `d1a9cdc53bd9691f3b482a87c6784f7ad4499933`.
Production integration still requires mapping fixtures to validated shared read models and checking
real source/date/missing/stale cases. The backend integration document records these requirements.
