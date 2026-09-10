# Change log

## 2026-09-10 — Connected stock reading (deployed)

- Make Today, Watchlist and Explore the default navigation in Chinese and English. Keep advanced tools and historical links accessible.
- Read the same saved stock summary in Today, Watchlist, stock detail and Stock briefs. Adopt completed background updates without interrupting reading.
- Preserve open reasons, exact source citations, keyboard focus and inspected chart dates. Withhold withdrawn content and distinguish unavailable states.
- Show dates for numeric source records and retain each older analysis's original date and source snapshot.
- Improve stock/source touch targets to at least 44px and retain 16px phone inputs.
- Validation: 609 JS tests; bilingual build; copy lint (3,225 files, zero failures); link check (1,266 links); three export tests. Mobile viewport and route evidence: [connected-reading report](reports/CONNECTED-READING-2026-09-10.md).
- Limits: not a market-data entitlement upgrade or completed human study. Backend pilot coverage at 08:11:56 UTC was 8/10; two drafts still retried. Publication: PR #3, commit `7cd5f6ab948e89e63b94ed51b68cc273c22c22ec`, Pages `6a399330`; both PR and main CI passed. Public config and signed-in GLW verified. At 08:28 UTC coverage was 9/10; NVDA still retry. Full receipt in the linked report.

## 2026-09-10 — Shared stock briefs and same-origin preview

Published from `4ae19a20b88d9e825e86cb436d2e4bee5faa80cf` in [PR #2](https://github.com/ssurmic/ducky-site/pull/2), Pages deployment `1b394637`. Stock briefs reuse the shared stock analysis rather than a separate half-day narrative; bilingual preview paths use the same API and release asset graph. Validation: 604 JS tests, copy/link/export gates and production browser inspection. The preview-only navigation decision is superseded by the next release at the owner's request.
