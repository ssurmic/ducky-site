# Creator and detection price snapshots — 2026-09-08

Status: local candidate; awaiting coordinated backend publication.

The owner narrowed creator research to publication time and twenty sessions. The main
card now shows publication reference, latest recorded close with dates, change to date,
reviewed directional stance and any condition. Existing prices remain visible while
the twentieth session is pending. Historical controls and recorded-time selectors are
removed from the main UI; sources and stored timestamps remain under details.

The new backend publication_20 uses the same reference as change to date: the last
completed regular close at publication. Counting starts with the first close strictly
after publication. Existing archived windows are not rewritten. API keyset pages are
loaded explicitly, scoped to the selected creator, with retries and stale-request guards.

The shared component also reads social item.price_snapshot on current cards and history.
Those prices are labeled detection reference and twenty sessions after detection. An
overheated state gets a separate risk badge and does not manufacture bearish sentiment.

Validation: 424 frontend tests passed; focused tests cover pagination, conditional
views, losses/zero, incomplete windows with known prices, stance enums, and detection
versus publication labeling. Actual browser fixture review covered 320/393-pixel English
light mode and Chinese dark mode; prices, dates, stance and conditional text remain
readable. Fixture data is explicitly synthetic. Production acceptance remains pending
backend candidate availability; the earlier stock navigation release is already live.
