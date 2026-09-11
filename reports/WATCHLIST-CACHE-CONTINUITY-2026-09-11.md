# Shared summaries survive watchlist navigation

Status: deployed to production as a3c16e71 / Pages d67bd897; bounded acceptance below passed.

The owner asked for one shared generated result per stock/evidence version, incremental
production, and immediate reuse when following or refreshing. This change repairs the
existing browser read cache; it does not add a database, model call, provider or queue.

## Reproduced failures and fix

Five new regression tests failed against the previous code and now pass:

- A first-time follower had a saved stock graph but no saved watchlist-research response.
  Membership projection now derives its overview from that actual read, retaining the
  graph's original expiry, analysis date and citations. It cannot invent a missing summary.
- The first watchlist showed a spinner despite having a readable saved overview. It now
  renders that overview and the map entry while prices and the fresh read are pending.
- Adding an already-read stock inside the watchlist did not transfer its saved overview
  into the mounted list. The membership listener now adds those missing local rows.
- Successful follow/unfollow now fences older membership-dependent GET responses before
  cache writes, read observers and view callbacks. Late reads cannot restore old membership
  or erase saved summaries. Cancellation uses the existing bounded read diagnostics.
- A stock-specific 404/410 used to clear every private preview. It now invalidates that
  stock's graph and overview only. Authentication/access failures still clear all previews;
  authoritative source withdrawals still replace the affected paragraph.

Memory remains bounded to 32 entries / 8 MiB / five minutes in the current authenticated
session. No private research is written to browser disk. New sessions and expired reads
fetch existing server projections. That HTTP read is not an LLM generation request.

## Existing backend contract verified

The backend's `supporting_analysis.job_for` hashes the stock's selected evidence and
analysis contract into a shared job identity. `supporting_store` owns deduplicated jobs,
leases, attempts/results and saved graph projections. User watch membership is separate.
No-change projections reuse the accepted result or existing job. Changes to cited sources,
conditions or opposing evidence create a new identity; unrelated coverage/quote updates do
not. A failed unfinished job may use its existing bounded retry allowance even without new
evidence. Successful unchanged work is not regenerated for each viewer or refresh.

The already merged backend PR57 fixes contradictory writer/repair output contracts and
retains source-validated sections when only the overview is missing. Full independent
review still gates the final publication. Frozen QCOM/UBER sections are reusable; frozen
NVDA sections remain ineligible. This does not claim all three production results recovered.

## Verification

- Red: five newly added regression tests failed with the previous implementation.
- Green: 42 cache/product-flow tests passed in 4.19 seconds.
- Frontend full suite: 682 passed in 16.05 seconds; bilingual build passed.
- Backend unchanged-input, coverage identity, restoration, partial draft and read-snapshot
  checks: 72 passed in 1.44 seconds. These use isolated inputs, not production inference.
- Final full suite after the network-failure edge fix: 682 passed in 15.87 seconds.

The actual isolated-browser first-follow scenario passed with both list GETs held open:
EN desktop and ZH 390 px displayed the cached dated overview and direct map link before
either GET completed. Releasing after the network deadline exposed a further first-entry
edge: the membership error path retained only a cached price list, not a cached summary.
It now retains either on ordinary read failure; the strengthened regression asserts the
summary and map link remain after the failure as well. Access denial still clears them.

## Rollback and scope

Frontend rollback baseline: main `960ebb021b25258a29e24d31c8108d7d410ff7ce`.
No frontend schema or config migration. DGX PR57 has its separate existing release gate.
No model switch, prompt-budget change, bulk backfill or new workstream is part of this fix.

## Production delivery · 2026-09-11 06:14–06:18 UTC

PR39 and PR40 merged. Exact main `a3c16e71e07f79f3d83f52253b2f7cd41aa9278a`
passed [CI](https://github.com/ssurmic/ducky-site/actions/runs/34568738082), then was
published to Pages `d67bd897`. Public release and all three changed modules match the
built bytes, graph `637968b1378ba16af9e3`.
[Asset receipt](cache-continuity-20260911/pages-verification.json).

Authenticated EN production: watchlist → AAPL map (one click) → watchlist → Refresh
retained the same readable summary and Sep 10 16:38 PDT analysis date. The ZH page's
fresh server read returned the corresponding Chinese summary with the same date.
Prices displayed the Sep 10 session. The 50-row list contained 46 literal `Analysis as of`
labels; this count excludes previous-analysis labels and is not a completeness claim.
[Browser observations](cache-continuity-20260911/browser-verification.json).

A real MSFT follow was rejected by the account's 50/50 cap; no membership was changed.
We did not remove the owner's stocks or bypass quota. The successful first-follow path
and the delayed/failing-read path are covered by the isolated browser checks above,
not claimed as a successful production addition. The raw `watch_limit` error wording is
an existing remaining UX issue to include in the bounded follow-up, not a quota bypass.

Backend cbba847d is deployed with healthy API and 75 active timers. At 06:13:58 UTC,
NVDA/QCOM/UBER remained in bounded retry. UBER used the new repair revision, but the
single overview call exhausted 9,650 generated tokens (1,553 input tokens, 166.42s wall)
without a final answer. Thus the cache/display fixes are delivered; model final-output
reliability remains open. This release does not claim three restored new summaries or
zero-latency cold-session reads.
