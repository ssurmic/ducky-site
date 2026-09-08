# Briefing and price-detail copy — 2026-09-08

Actual recording inspection found implementation details in the briefing's default
paragraph and an unformatted fractional-second ISO timestamp in the information
map's price detail. The bilingual briefing now retains only the two daily update
times and source-date disclosure. The price detail reuses the source dialog's UTC
minute formatting, extracted to the shared UI helper. Original timestamp values,
price-session validity, saved-quote labels and the refresh schedule are unchanged.

The existing saved-quote test covers the actual six-digit fractional timestamp and
keeps quote validity distinct from display formatting. Thirty-three focused checks,
all 442 frontend tests, bilingual build, copy lint and 1,352 internal links pass.
Production deployment and actual-page receipts follow below.
