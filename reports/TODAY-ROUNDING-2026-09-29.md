# Current Today rounding consistency — 2026-09-29

Status: local frontend candidate based on `1f1b1efa63440ae9ac8480f02620eaeaef0072c0`. Backend publication `37f81fbe` is the reported live source of the accepted current snapshot. This report does not claim the frontend correction is merged, deployed or verified in production.

## Problem and bounded correction

The live snapshot carried the same raw nominal yield, 5.255, into the summary and metric card. The summary producer's fixed-point formatting displayed 5.25%, while the browser's decimal rounding displayed 5.26%. This was a formatting mismatch, not a different source reading.

A small pure formatter decodes the exact binary64 value and performs fixed-point round-to-even with integer arithmetic. It matches the summary producer for values such as 5.255 → 5.25, 5.125 → 5.12 and 16.25 → 16.2. It is applied only within an accepted current snapshot: yield, VIX and funding labels, current quote percentages, and the associated chart legend, tooltip and accessible reading labels. Original summary text is never parsed or rewritten. Missing values remain unavailable. Quote signs and zero behavior are preserved. Gauge labels and accessible values agree without changing the raw needle position or band selection.

Historical rows retain their original numeric values and dates. Their reading labels use the same rounding when displayed alongside the accepted current overview; legacy/non-current views keep their previous localized formatter. An actual trade snapshot can legitimately differ from a separately dated daily-bar record. This correction does not force those independent records to agree, change source selection, or acquire new data.

## Validation

The focused suite passed 51 tests. The formatter is checked against Python fixed-point output for 1,497 combinations of finite values, precisions and values immediately around binary ties, including negative zero, subnormal and extreme finite values. DOM regressions cover summary/card agreement, quote signs, funding text/aria, yield legend/tooltip/aria, unchanged inputs and prose, and the legacy fallback boundary.

The final chart-label candidate passed all 922 Node tests and the bilingual build, copy lint (4,297 files) and 2,109 internal links. Required Python checks passed: 18 passed and one existing local asset-history skip. The generated calendar was restored before commit. Independent review found no blocker in the core formatter, scope or final chart-label follow-up. No account write, backend change, provider/model call, push or deployment is part of this local candidate.

## Production receipt

PR #120 merged as `f9a1575e1d1f22d415cd6d11dee817e0e67644a0` and published to Pages `694c4723`. The official gate passed 922 Node and 14 Python tests, build/copy/link checks. Publisher exited 5 because the bare config URL retained the old version; a selective purge of the six static entry/config URLs through the existing authenticated Cloudflare UI restored the correct version and CSP, verified at 21:46:54 UTC. No permissions or security settings changed. Real authenticated English Today rendered the same 5.25% in summary, macro reading and historical legend for raw 5.255. That browser observation was around 21:44 UTC, without an exact render timestamp.
