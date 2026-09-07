# Vibe Check and shared stock briefs — 2026-09-07

Status: deployed; three checked stock briefs are readable. The initial stock queue is still filling.

## Released behavior

The navigation and homepage expose one Vibe Check. The existing Reddit attention score
remains in a disclosure; a discussion state, next observation, mention change and cached
RSI lead the card. IV/HV, collection time, formula and history remain available underneath.
Legacy Degen links work, including their saved hot filter. A stock card opens its shared brief.

The default summary page now reads one bilingual mini-report per stock, with a short view,
separate observations for nonholders and existing shareholders, four evidence dimensions,
counterevidence, next checks, dated sources and previous editions. It does not infer a position
from a follow. The price session is visible beside the conclusion, separately from evidence
collection and report generation. Original daily/weekly event digests remain available.

At 08:00 and 20:00 America/New_York the background queue starts processing the union of
followed tickers, one job at a time. A report is shared by its followers; requests only read
existing records. The configured local deep model drafts and independently reviews claims.
The queue uses bounded repair, three attempts per slot, 30-minute retry spacing and a
20-minute lease. Each service run is capped at 19 minutes and schedules the next after two
minutes. Publication times depend on queue and model availability, not an exact-time promise.

Evidence revisions, observations, failed drafts, reviews and accepted reports are retained.
Unchanged facts reuse the original assessment with a new check time and explicit reuse label.
Current reports/history have fresh Pro API gates. A source revision or withdrawal withholds
invalid prose immediately. Initial reports and unchanged evidence stay silent. Later material
changes create private pointers for followers through their enabled channels, with watch ID,
current entitlement, source validity and channel consent rechecked at delivery.

## Production acceptance

- Backend implementation: `0a911d9` through `0186716`, deployed to the DGX.
  `ducky-api`, `ducky-sender` and the new ticker-brief timer were restarted/enabled.
- Frontend implementation: `fc7b679` through `a24f18e`; Cloudflare Pages `089d92f3`.
  Rebased over the concurrent Ducky Bot rename and homepage interaction fixes.
- NVDA: `ticker-brief:f3a9fef6af62f297638419e7c6edb0e5`, checked 21:21 UTC.
- TSLA: `ticker-brief:5a213c7344e2bd42abdb24eb8ed62d3d`, checked 21:22 UTC.
  Both completed actual local-model drafting/repair and review. Fresh-input review before
  silent publication took 128 and 97 seconds respectively; earlier full draft/repair runs
  took 233 and 212 seconds. These are measured samples, not a throughput guarantee.
- At the acceptance snapshot, 32 distinct stocks were followed, two had reports, AAPL's
  first attempt was rejected and ALAB was processing. Both published rows had notify=0
  and dispatch_id=silent; ticker-brief fanout count was zero. Bulk coverage remains partial.
- The first unattended AAPL draft incorrectly inferred an IV trend from IV/HV. Review
  rejected it. Prompt version 5 adds a deterministic IV-trend check and tells the reviewer
  to use explicit source relation/coverage fields, not infer relevance from a title.
- Native production browser: authenticated Pro NVDA and TSLA reports, citation expansion
  to the exact option record, history read, old event digest and Degen alias all verified.
  Chinese 390px Vibe shows its action, metrics and brief link. Chinese 390px and English
  320px stock briefs have document width equal to viewport width; the final English search
  field displays the complete ticker. Physical iOS/Android testing is not claimed.
- Final DGX gate: 1,974 tests passed, one skip, selftest ALL GREEN; architecture lint
  0 failures. Local prompt-6 gate: 1,970 tests before the concurrent company-classification
  update, then 31 focused merge checks; the final merged code passed the DGX gate. Frontend: 300 tests, 5 Python asset checks (one pre-existing skip), copy lint and
  934 links. The unauthenticated report endpoint returned 401.

## Evidence and remaining limits

No oversold qualification, strategy weights, entry/exit rules or taxonomy were changed.
These qualitative observations are not a backtested strategy or performance claim.
Historical insider transaction prices are not established support, and code P can include
private purchases. Missing capital records do not establish that no one bought.

Reddit aggregate counts do not establish bullish sentiment, unique traders or specific
communities; X is unavailable. Reviewed creator mentions do not supply a complete opinion.
Current technical/option data can be missing. Option concentrations do not guarantee price
boundaries; IV below HV alone does not establish an equity entry. Aligned sector comparisons
use the same completed sessions, and today's retrieval does not recreate historical knowledge.

An earlier NVDA draft passed the model reviewer but failed manual inspection for citation
meaning, product adoption versus partnership and conflicting RSI timeframes; it was never
published. Those cases now have deterministic checks. Automated review can still miss errors.
Production attempts are immutable in the shared DB. The separate manual QA drafts, including
rejected versions, are archived machine-locally under
`.signals/ticker-brief-validation-20260907/`; current private research is not committed publicly.
Actual notification transport was not exercised with test messages. Delivery eligibility,
consent, deduplication and source correction were tested with isolated fixtures.

## Final unattended run and guard correction

At 21:44:48 UTC, the timer completed AMD without manual drafting or approval:
`ticker-brief:7e54335d6504bbc658b115416525e53b`. Drafting, independent review,
immutable save and silent dispatch all completed through `ticker_brief_worker.run`.
The final production snapshot contains NVDA, TSLA and AMD, all notify=0 / dispatch_id=silent;
ticker-brief fanout remains zero. Other stocks remain in the scheduled queue.

ALAB's first attempt was rejected. Inspection found that an unbounded RSI match also matched
the English word “persists”; prompt version 6 matches indicator tokens and separately requires
relative-performance citations. Regression cases cover both the false rejection and actual
missing sector citations. The rejected ALAB draft also had unsupported sector references,
so it remains unpublished and retryable. No existing report was rewritten to hide a failure.
Final production services and timer are active; viewport overrides and local QA server removed.
