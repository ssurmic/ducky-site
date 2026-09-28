# Today: independent market and close-note clocks

Status: deployed through PR #109 / Pages `dc10d45f`, production version `9ab95315`
verified on 2026-09-28 at 22:40:24 UTC. Merged source: `9ab9531545fcd3294614318b3b04ff52b499a9be`. The original candidate was based on frontend `cb0d340`; its
focused and pre-publication evidence below remains separate from the final release receipt.

## Observed problem

On September 28, the owner could read newer macro values and research records while the Today
first screen still presented the complete September 25 close note. Its next-session section
retained wording about “tomorrow” for September 28. The previous heading did name the session,
but the large old note dominated current content and made the site appear stalled. The retained
“over 40 hours” label is a wall-clock age, including weekends, not proof of producer failure.
The runtime owner independently confirmed that the scheduled service was operating; this UI
change does not change its publication schedule or completeness requirements.

## Implementation

- A same-New-York-date note keeps the existing complete four-part presentation. A note for any
  other date is preserved in a native, keyboard-operable disclosure above the macro tiles, after
  the market-reading heading. No saved paragraphs are truncated, rewritten or removed.
- Older notes carry the complete saved generation date and time in Eastern Time. The outlook
  names the original `next_session`; visible context binds relative “tomorrow” wording to when
  the note was written. Original stale status remains visible inside the note.
- The top QQQ/SPY row uses adjacent observed rows from the existing document, with its source
  date and live/close label. Missing intermediate values are not bridged or changed to zero.
  A newer observed date can explain why a market reading is newer than the note. The requested
  quote session, request time and snapshot date cannot establish a new trading session.
- Compact bilingual copy says market data, research and the close note update separately.
  A different calendar date alone never implies a late note, open exchange or failed producer.
  The liquidity score displays its own saved date, independently of the market-index row.
- An unsuccessful macro GET has an explicit retry. It does not claim that the saved note is
  missing or generation failed. Retry is the same read endpoint; abort and account-epoch guards
  prevent a departed view from being repainted.

The existing macro charts, numerical values, source footer, research feeds and count shortcuts
remain. There are no new endpoints, account writes, automatic refresh loops, model requests,
publication estimates or hardcoded operational times.

## Checks and boundary

`node --test tests/today-macro.test.js tests/newcomer-workflow.test.js`: **22 passed**.
The checks cover the Friday-note/Monday-reading case; complete old content and its expansion;
same-day presentation; New York midnight; weekends; missing/invalid dates; a requested quote
session that does not establish observed data; actual zero and missing comparisons; missing
notes versus missing macro data; and GET retry, abort and account-epoch behavior. Existing chart
keyboard controls and Today jump/focus behavior also pass.

`/tmp/qa-venv/bin/python build.py`: passed, 30 pages and bilingual key parity.
`/tmp/qa-venv/bin/python scripts/lint_copy.py`: passed, 4,206 files, no violations.
`git diff --check`: passed. The generated calendar export is excluded from this candidate.

Browser viewport, touch emulation,
physical-device, merge, deployment and production acceptance are not claimed by these tests.
The subsequent combined gate and viewport checks are recorded separately below.

## Independent follow-up review

The review found one bounded return-state defect: Today saved the new archive disclosure key,
but restored disclosures only in research sections. The macro read now applies the existing
saved disclosure state after its asynchronous render, with disposal, route-abort and account-epoch
guards. A mounted Today → Stock → Today regression delays that read and verifies the open note
is restored; another account and another note session both start collapsed. No other Today state
or macro request policy changes.

The remaining date/return checks found no release blocker: index changes retain observed dates,
no expected trading day is inferred, and a failed GET is distinct from missing saved content.
The existing one-read-per-mount policy remains; relative same-day headings are evaluated when
mounted, not through a new midnight refresh loop.

For integrated browser acceptance, `case=today-freshness&route=today` now supplies a separate,
fixed-date synthetic fixture: September 25 note, September 26 generation time, September 28
original outlook and observed market rows. Its values and paragraphs are labelled synthetic;
the default fixture is unchanged, account writes and external traffic remain blocked. A Node VM
check verified its source dates, QQQ/SPY changes, default-case isolation and those traffic guards.


## Integrated acceptance (before publication)

The combined Today/Explore candidate passed **831/831 Node tests**, 14 Python export/home
checks, and four app-asset checks (one additional local environment case skipped), bilingual
build, copy lint and 2,103 internal links. The generated calendar export was excluded.

Browser acceptance used Chrome viewport overrides, not a physical phone. Explore showed all
12 default entries at 1440 x 900, six complete entries at 390 x 700 and four complete entries
at 320 x 600; no horizontal overflow was observed. The 14-entry expansion, return to 12,
complete related views and Metrics-to-Explore route were exercised. English/light and
Chinese/dark layouts were inspected.

Today was inspected at 390 x 700 (Chinese/dark), 320 x 600 (English/light) and 1440 x 900
(English/light). The dated September 28 readings precede the September 25 disclosure. The full
saved note, original writing time and original next-session context remain accessible.
Expanding the note, leaving Today and returning preserves expansion. The two review findings
(disclosure restoration and refresh-error preservation during local ranking expansion) are
fixed and covered by regressions.

The fixed-date browser data was synthetic and had no production API connection. This
pre-publication check did not claim deployment or live-source acceptance. The subsequent receipt
below records those separate observations; no producer schedule or backend write changed.

## Production release receipt

Released through [PR #109](https://github.com/ssurmic/ducky-site/pull/109), merged at
2026-09-28 22:39:29 UTC as `9ab9531545fcd3294614318b3b04ff52b499a9be`.
The publisher reran **831 Node tests**, **14 Python tests**, bilingual build, copy lint
(**4,104 files**) and **2,103 internal links**, all passing, before publishing
[Pages `dc10d45f`](https://dc10d45f.ducky-site.pages.dev). Production `VERSION=9ab95315`
and CSP were verified at **22:40:24 UTC**. The first edge read still returned the prior version;
the second confirmed the new version. The hosted PR check had passed in 1m41s.

Authenticated production browser reads at **22:40–22:43 UTC**, in Chinese/dark at
**390 × 700**, showed September 28 QQQ **−1.07%**, SPY **−0.74%** and liquidity **50** in the
first screen, ahead of the collapsed September 25 note. Expanding it preserved the complete
saved text, the original September 26 **00:34 ET** writing time and the original next-session
context for September 28. These are the inspected readings, not a claim that every field or
research source had updated. The old note was not silently rewritten as a current analysis.
At **22:44 UTC**, the live Today → Explore → Today return restored the expanded archive after
its asynchronous read. At **1440 × 900**, the September 28 heading, September 25 disclosure and
four existing macro tiles were readable without horizontal overflow. The note was then collapsed
back to the normal first screen.

This scoped acceptance used desktop-browser viewport overrides, not physical devices. It did
not perform account writes, alert activation, notification sends, producer activation or model
requests. Source semantic fidelity and completeness remain separate from successful rendering.
The previous `7fb28406` deployment remains the rollback reference; this receipt adds no backend
release claim. Documentation-only follow-ups do not require another runtime deployment.
