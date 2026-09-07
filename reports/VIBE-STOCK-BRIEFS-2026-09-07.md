# Vibe Check and shared stock briefs — 2026-09-07

Status: implementation and local UI accepted; real-model quality and production acceptance in progress.

The owner requested one Vibe Check feature and a shared stock-level mini-report twice a day.
The existing attention score is retained in the details; one discussion state and next check
lead the interface. Cached daily RSI and IV/HV provide context, without turning attention
into a trading score. Legacy Degen links and the old daily/weekly event digest remain usable.

Each Eastern 08:00/20:00 slot has one leased job per followed stock. The background worker
reuses shared facts, warms the shared chart cache, compares exactly matching completed
sessions, drafts bilingual research using the configured local deep model, and separately
checks every claim against its citations. It gives different conditional observations for
nonholders and shareholders, not personalized orders. Missing evidence and counterevidence
remain visible. All accepted reports, source packets, reviews and failed attempts persist.

Current research/history require a fresh Pro entitlement at the API. No provider or model
work occurs on a request. Source revisions/withdrawals withhold affected prose immediately.
New information produces a durable private pointer for followers through enabled channels;
initial captures and unchanged evidence are silent. The original watch ID, current tier,
source validity and transport consent are rechecked before delivery. The user never receives
an unreviewed draft. No oversold qualification, trading weights, taxonomy or entry/exit rules
were changed; the existing strategy comparison baseline remains authoritative.

## Validation so far

- Frontend: 294 tests, 5 Python asset tests (one pre-existing skip), copy and 932-link checks.
  After moving low-frequency controls below the reading, 18 targeted UI tests passed.
- Backend: 60 targeted tests; full selftest ALL GREEN. The sender test fixture now freezes
  device-registration time alongside message time, fixing an existing afternoon-only failure.
- Native browser: Chinese 390px Vibe displays the action and summary metrics in the first
  screen; English 320px stock brief has document width 320px and retains conditional actions.
  Desktop 1280px uses a two-column action block; evidence remains accessible by citation.
- Initial real NVDA/TSLA drafts failed reference/format checks and were not published.
  The prompt now honors the calendar-aware validity of closed-session prices; the packet
  includes aligned stock/sector and SOXX/QQQ comparisons. Local-model draft/review budgets
  and bounded repair are being measured against the configured Qwen model.

## Practical coverage limits

Reddit provider aggregates do not establish bullish sentiment, unique traders or specific
communities; X is unavailable. Absence of an insider filing is not proof of no insider buying.
Form 4 code P includes private purchases and unadjusted historical transaction prices cannot
be declared support. IV/HV and option concentrations do not guarantee an equity entry or
price boundary. Current taxonomy and freshly retrieved historical prices do not recreate
past knowledge. A separate model review can still miss errors, so the app retains evidence,
coverage and dated previous editions.


## Grounding checks from the real-model audit

One earlier NVDA draft passed the local review but manual inspection found that it called
product adoption a partnership, described technicals without the corresponding citation,
ignored divergent RSI timeframes, and questioned an already reviewed ticker mention based
on the video title alone. That draft was not published. Prompt version 2 adds explicit
source-meaning requirements and deterministic regression checks for these cases. Uncovered
dimensions use program-owned bilingual missing-data text. Repairs preserve the original
draft; no discarded analysis fields are served in the report API.

The accepted payload is whitelisted at every text object. Model input omits duplicated
storage metadata while the immutable source packet retains it. Re-observation timestamps
alone do not cause a new thesis or repeated model call; a source revision, freshness change
or material evidence change does. Reused assessments retain their original generation time
and receive an explicit unchanged-evidence label. Notifications open the ticker brief and
use the account language without further model calls.
