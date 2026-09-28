# Today: independent market and close-note clocks

Status: implemented candidate; not merged or deployed. Based on frontend `origin/main` at
`cb0d340`. The integrated branch owner performs the full release gate and browser acceptance.

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
The integrating owner owns the combined full gate and actual 320/390px and desktop checks.

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

The fixed-date browser data is synthetic and has no production API connection. Deployment and
live-source acceptance remain a separate step; no producer schedule or backend write changed.
