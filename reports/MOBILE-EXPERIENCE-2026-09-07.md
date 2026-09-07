# Mobile experience — 2026-09-07

Owner goal: make the existing website comfortable on portrait phones, keep its interactions usable, and verify light and dark appearance. Worktree: `ducky-site-mobile-20260907`.

## Changes

- Compact portrait spacing and headings; body text remains readable, inputs use 16px and primary controls have at least a 44px target. Initial calendar sizes were 22px / 14px; the owner’s later phone screenshot superseded those sizes. The integrated release uses 18px dates, 12px event/weekday labels and 68px minimum quiet cards.
- Market topics are vertical rows. Radar categories open as a complete two-column list, show the selected category when collapsed, and return focus after selection. The More navigation menu is vertical on phones; selecting an item does not leave keyboard focus in a hidden panel.
- On phones the price chart precedes the detailed overlay legend. The integrated release moves related links below the chart and allocates price/RSI/MACD panes together.
- Dialogs respect safe-area padding, retain a 44px close button, scroll within the viewport, and restore date focus and the underlying scroll.
- Browser color-scheme changes, explicit theme changes and Telegram theme events repaint the candlesticks, RSI reference lines, MACD histogram/lines, overlay lines and legend from the active application palette. They reuse the already loaded data and do not request new prices or alter research values.

## Validation before integration

237 frontend tests passed, including targeted regressions for theme repaint/no refetch/cleanup and phone category selection/focus. Asset graph checks: 4 passed, 1 unavailable historical fixture skipped. Backend local selftest: ALL GREEN (783 pytest passed); architecture lint: 0 failures and 0 warnings. The DGX-only launcher cannot run at its hardcoded path on this Mac, so the same harness was run directly using the backend's existing Python environment.

Browser UI used a local fixture server at port 8876, with API writes rejected. Synthetic values are layout fixtures, not production evidence. The nine primary pages (watchlist, briefing, chart, calendar, radar, alerts, creators, profile, billing), plus login/register/forgot, were measured in Chinese and English at 320/390px with inherited light/dark appearance: 96 combinations, no main-surface horizontal overflow, no pending spinners or error boxes at measurement. Eight further tablet/desktop checks covered English radar at 768/1024px and Chinese calendar at 768/1440px, both themes. These are layout-state checks, not 104 separate completed account workflows.

Interactive browser checks include category disclosure/selection, chart period changes, vertical More → Profile navigation with focus restoration, a live inherited light→dark chart change, and September 7 holiday dialogs at both phone widths in both themes. Dialog widths were 296/366px; close buttons were 44px. Escape restored the selected date and exactly preserved the opened scroll position (388px at 320px, 344.5px at 390px in this fixture). Screenshots were inspected in the task.

This is Chrome viewport/iframe and mouse/keyboard testing. Physical iOS/Android, real payments, password changes and notification delivery are not claimed. Existing API gates, account data, research rules, source evidence and losses are unchanged.

## Integration and release

Integrated with main2ac32fe (new navigation, discovery pages, notification setup and Telegram account linking), then refined against 600–700px available browser viewports. See [the density acceptance report](MOBILE-CALENDAR-DENSITY-2026-09-07.md) and [independent route audit](UI-MOBILE-DENSITY-AUDIT-2026-09-07.md) for superseding measurements and release evidence.


Final integrated production: `797f51f6` / Pages `81dc329f`, app graph `fe4bc95159e9ea2d4bf0`.276 frontend tests passed. The source task subsequently verified Chrome touch emulation with actual touch/coarse events for menus, calendar dialogs, period selection and vertical chart swipes. Physical Safari/iOS remains untested; this supersedes the earlier mouse-only limitation for Chrome simulation only.
