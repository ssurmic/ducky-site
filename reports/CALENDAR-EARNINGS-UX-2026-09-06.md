# Earnings context in the calendar

An issuer earnings event now mounts its cached Pro context independently of the
historical event study. The first row compares the previous reported quarter
with next-event expectations. Both fiscal labels and observation dates remain
visible; GAAP and adjusted EPS are separate rows.

The model explanation follows the numbers, with drivers, next checks and
conditional risks. Each block expands its exact supporting excerpt or metric.
Company outlook excerpts remain distinct from analyst estimates. Previous
same-provider actual/estimate comparisons are reconstructed records. Price
changes versus SPY include losses and explicit missing windows.

Basis/retrieval details, longer issuer quotations and coverage expand on demand
to keep the initial comparison readable. Missing source URLs do not render a
broken link or literal null. Unavailable/stale/historical snapshot states are
explicit. A stock link continues into creator coverage.

`GET /earnings/context` is authenticated and Pro-only. The component makes no
private call for Free, deduplicates the exact ticker/date request in the calendar
view, and discards pending responses after logout or disposal. There is no
source-fetch or LLM request fallback in the browser.

Validation:

- Full frontend suite: 98 passed; focused earnings/calendar/market suite: 15 passed.
- Bilingual static build passed; copy lint passed (no banned phrases or missing
  disclaimers). Final small copy/fiscal-label refinements were covered by the
  focused component tests.
- Read-only browser fixture review in English and Chinese; desktop had no
  horizontal overflow. A same-origin iframe at 390 CSS pixels verified stacked
  cards and visible metrics without changing the shared browser viewport.
- Browser fixtures are explicitly fictional and live only under `/tmp`; no mock
  numbers or mock account were added to the deployed product.

The backend contract and LIVE versus LLM design are in the backend report
`reports/EARNINGS-CONTEXT-SYSTEM-2026-09-06.md`. Production acceptance of the first
two issuer snapshots and local model output follows the coordinated deployment.
