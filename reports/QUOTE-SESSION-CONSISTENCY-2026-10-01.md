# Quote/session consistency — 2026-10-01

Status: implemented candidate, deployment pending.

A newer after-hours quote was hidden whenever a daily close existed for the same
session. Separately, wall distances and digest text could retain an older price.
The shared display selector now requires server exchange-calendar metadata to
admit same-session postmarket trades (including early closes and DST), while
preserving final daily closes against regular-session trades. Old payloads fail
closed. Price/quote clocks remain distinct from dated research inputs.

Digest comparisons, signal cells/dialogs, list counts and sort use the displayed
price. Unknown prices suppress distances. Source activity and reviewed research
are preserved. Quote change copy says "vs previous close"; close copy no longer
calls a retained close "today". No provider requests or inference occur in reads.

Validation: 1,005 Node tests passed, including the final close-copy adjustment;
regressions cover same-day after-hours vs regular trades, stale/future/older data,
early-close metadata, the $228.96 vs $230 wall reproduction, immutable source
references and suppression of old cached price clauses. The final suite is recorded at release. Export/Home unit checks, copy lint and links passed.

Browser: isolated synthetic preview at 320/390×680, EN/ZH, light/dark; actual
production components show $228.96 after-hours, $232.50 call wall 1.5% above and
$230 put wall 0.5% above. MSFT's earlier regular trade cannot replace $512.90 close.
These are viewport simulations, not physical-device or live-data proof. No shared
layout/CSS redesign. Paired API and private release evidence live in the canonical
backend Handoff §61; the public site does not duplicate private architecture.

Rollback: revert this commit through the Pages release script; no data migration.
