# Web regression audit · 2026-09-07

Status: implemented and verified locally; not pushed or deployed. Branch
`codex/fullstack-audit-20260907`, site base `e3b9e3f`, matching backend base `2ccd161`.
Existing dirty development checkouts were preserved in separate directories.

## Result

- Vibe defaults to all individual stocks, including the old Degen alias. Explicit hot filters
  remain valid. A five-stock leaderboard ranks observed24-hour mentions across watched and
  unwatched stocks; insufficient samples do not receive invented scores. Hot stocks are named
  individually, elevated states can be filtered, and empty filters have a reset button.
- The backend applies current cached security identities before returning the stock projection.
  Funds such as SPY and QQQ are excluded with explicit coverage counts. Raw snapshots, historical
  rows, source ranks and frozen scores are unchanged. Frontend deployment requires this backend
  projection first; this is not historical identity reconstruction.
- Ten detailed cards load initially with an explicit more button; total counts and filtering
  cover all returned stocks. Dates and stale labels remain visible, and async watchlist completion
  cannot resurrect an obsolete render after expiry.
- Optional X counts render separately, retaining true zero, missing and expired evidence even
  when Reddit is unavailable. Counts are selected cashtag posts excluding reposts, not people or
  sentiment. Production access/budget configuration is missing, so X has not been enabled or billed.
- API cancellation/deadlines now cover JSON and binary response bodies; route listeners are
  removed after completion. Broken success JSON is an error, malformed401 responses still
  invalidate the session, and binary reads recheck account changes.
- Shared numeric formatting no longer coerces blank/boolean/invalid values to zero or infinity.
  Real zero and losses remain visible. Radar cards use concise plain previews with full text
  retained on expansion. The calendar's static supplement has a three-second body timeout and
  preserves successful API results when it fails.

## Evidence and scope

Baseline300 frontend tests; final **313 passed**, no failures/skips. Build, copy lint and934
links passed; asset/public-access tests5 passed with1 existing fixture skip. Backend final
**1,986 passed**, selftest ALL GREEN, architecture lint0/0. A one-off comparison matched97
statically identifiable frontend GET/POST/DELETE calls to the backend's130 OpenAPI operations;
this is not exhaustive dynamic-path or body-schema coverage.

Read-only production Chrome checks loaded watchlist, briefing, chart, calendar, alerts, creators,
opportunities, Ducky buys, profile, billing and radar. Pending stock briefs, no live Ducky trades
and the verified-open-market radar filter were checked as data states, not disguised as bugs.
No orders, account changes, alerts, messages or notifications were created.

The new Vibe UI used the real built modules and CSS in a local labelled QA fixture: desktop,
390×844 English/light and320×740 Chinese/dark were visually inspected without horizontal
overflow. A three-hot-stock stress case was synthetic and is not market evidence. No physical
phone or Safari acceptance is claimed. Temporary fixture pages and paid source samples were
removed from dist before delivery and are not versioned or exported.

The actual production sample collected at `2026-09-07T22:00:39+00:00`, replayed in an isolated
scratch DB, yielded79 stocks,14 funds excluded,1 other security and6 unverified identities.
The first five were AGI/DTE/NVDA/BE/NKE at that observation. ApeWisdom provides counts rather
than original posts, so this implementation cannot quote what particular users said.

Complete findings, backend ownership, X budget/configuration requirements, official source
links and rollout plan are recorded in the matching backend repository's
`reports/FULLSTACK-AUDIT-2026-09-07.md`. Release backend first, then this frontend; verify the
actual deployed module graph and Pro views afterward. X stays off pending separate setup.
This audit reports checked behavior and confirmed fixes, not an assertion that every possible
bug has been eliminated.
