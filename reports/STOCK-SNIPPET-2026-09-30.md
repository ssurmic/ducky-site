# Watchlist commentary presentation · 2026-09-30

Typed daily verdicts repeated three labels and took precedence over the saved research summary. The list now uses its existing reviewed, cited summary instead of this duplicate verdict. Legacy unstructured readings retain their prior behavior.

For disclosure-only investment commentary with insufficient comparable valuation data, show a concise limitation and an accessible “View supporting records” disclosure. The complete bilingual saved prose, dates and qualifications remain unmodified inside it. Research-led commentary and trend commentary remain directly readable. This uses the backend's additive `left_basis` field; older APIs continue rendering the full paragraph.

Validation: 1,003 Node tests passed; 18 Python tests passed with one build-environment skip; copy and link checks passed. Browser fixture acceptance covered Chinese/English × light/dark × 320/390/1440 widths at 650px height. No horizontal overflow; disclosure targets were 44px high. Phone content area was 544px, first heading at 61px; desktop content area was 594px, heading at 76px. Both language disclosures expanded to the complete record text. This is viewport simulation, not a physical-device check. The fixture explicitly labels its synthetic research summary.

Backend counterpart: stock-snippet-latency slice, candidate `61680a43`; source validation, historical retention and admission changes are documented privately with its production diagnosis. This frontend does not generate new research or change source approval. Existing summaries can still require editorial improvement; changing display priority alone does not certify their quality.

Status: candidate tested, deployment pending. Rollback frontend base `0e24b1cb`.
