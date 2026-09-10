# English website QA · September 10, 2026

Status: implementation and automated checks complete in the isolated
`codex/english-qa-20260910` worktree, based on `a0492756`. Not deployed by this workstream.
The coordinating agent owns production browser acceptance and release decisions.

## Changes

- Revised 128 existing English strings and added five labels, with matching Chinese
  keys. The [copy change record](copy-changes.json) contains every before/after pair.
  Labels and introductions use direct US English. Missing data, source review,
  original dates, losses and incomplete history remain explicit. The owner's
  established **Call history** name is retained.
- Corrected misleading waiting copy: an unrequested summary no longer promises a
  check “soon”; a lost connection does not assert that a task is still running or
  saved. Caption-only wording now covers transcripts from the existing source paths.
- Market report readers select existing bilingual portions where `===CN===` is
  present. Chinese first-party prose on an English report is replaced by an explicit
  missing-English notice. The exact original remains in a labeled disclosure, even
  when only a summary was saved. This is a display guard, not a translation or a
  source-quality approval. Original news wording and attributed names are retained.
- Sub-cent prices retain up to four significant digits instead of rendering as
  `$0.00`. Extremely small values use scientific notation. Actual zero remains
  `$0.00`; unavailable and nonfinite values remain `—`. No quote inputs, screen
  rules, returns, rankings or stock universes changed.
- Calendar labels now say **Options expiration** and **Quarterly expiration**,
  including compact calendar cells. Date, event and impact rules are unchanged.
- English research-log pages prefer a provided English title. When none exists,
  they show a neutral stock-record title and retain the Chinese title in a labeled
  disclosure. Format examples still disclose unverified historical figures and
  never acquire a calculated return. Snapshot clocks show readable UTC minutes and
  retain the exact timestamp in the `time` element. Invalid idea URLs show one empty
  state, with the link back to the log.
- The English track record no longer repeats a Chinese footer disclaimer. When a
  scorecard supplies both languages, the reader selects its existing English
  disclaimer, retaining the complete fees, tax and advice language.

No request-time model calls, new acquisition, account mutations, or translations
were added. Source records and static data exports were not edited. The generated
`public/calendar.json` change was restored after the build.

## Verification

- `DUCKY_TEST_PYTHON=/Users/zizhaozhang/dev/ducky-bot/.venv/bin/python npm test`:
  **642 passed, 0 failed**, including eight new regression cases covering report
  language selection/original retention, nonzero sub-cent prices, idea fallbacks,
  empty states and the scorecard disclaimer. Existing copy assertions were updated
  without relaxing price-direction or source-scope checks.
- Final build: **22 pages**, EN/ZH key parity passed. App module graph:
  `357774de8f9b629452cd` (precommit build).
- Copy lint: **0 banned strings**, **0 implementation/brand terms**; required
  disclaimers present.
- Link check: **1,274 links passed**, no planned-page warnings.
- `git diff --check`: passed.

Automated DOM checks are not browser layout measurements. The new original-title
disclosure has a minimum 44px target in scoped CSS. Desktop, 320/390px short-viewport
EN/ZH light/dark checks, touch emulation, and physical-device checks must be recorded
separately by the coordinating browser walkthrough; none are claimed here.

## Remaining content work

Chinese-only reports still need a reviewed English version from their existing
background producer. The reader now tells the user that version is missing.
The Chinese-prose display guard is conservative and is not a general language
classifier. Generated stock research still has some repetitive attribution such as
“Recorded data:” and “The creator says…”. Those passages belong to the shared
evidence and review contract; this change does not strip them with display regexes.
Original creator names, video titles, research-log notes and quotations may remain
in their source language with the source-language notice.

The coordinating production walkthrough identified these issues. This workstream
implemented and tested fixes against the saved code and fixtures; it did not repeat
the production browser session, send a test notification, or claim deployment.
