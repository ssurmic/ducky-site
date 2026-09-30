# Desktop and phone workspace review · September 30, 2026

Status: implemented and locally checked for the owner's authorized frontend publication in PR #128. The deployment receipt will be attached to that PR; local evidence is not a production receipt.

## Result

The owner asked for a full desktop/phone review, consistent type and spacing, more useful content per screen, and a complete zero-watchlist walkthrough. This extends the [discoverability changes](DISCOVERABLE-VIEWS-2026-09-29.md).

- A shared app scale sets page headings to 24px desktop / 18px phone, section headings to 16px / 14px, subtitles to 13px / 12px, and normal reading text to 14px / 13px. Existing specialized chart and data labels retain their roles. Editable phone controls stay at 16px; common touch targets stay at least 44px. Account/auth subtitles no longer inherit a more-specific 15px rule.
- Common page edges, panel padding, section gaps and heading spacing are aligned. Today, Explore and individual-stock workspaces use the available desktop width. Navigation still exposes all five destinations.
- Calendar historical returns use one SPY/QQQ comparison table for average return, up/down years, worst year and best year. The giant metric cards and the rule forcing every sentence fragment onto a separate line are gone from this component. Full interpretation, all annual returns and calculation methods remain expandable. Complete-cohort checks, actual losses/zero, sample size, as-of date and source downloads remain unchanged.
- The stock-page membership action and K-line entry align together at the right on desktop. Profile optional fields participate in the same grid as the email field; empty verification/password containers do not create blank separators.
- The English record count uses “Matching records: 5 · Stocks: 1”, avoiding the previous singular/plural error. The inherited Insider controls, metrics and query/account fences from #127 remain intact.

No API, saved facts, financial calculations, authentication, notification settings or model behavior changes. Billing is currently disabled; its route correctly presents Profile. Tests do not create a production account, send a notification or make a purchase.

## Validation

- Full Node suite: 994 passed. Python: 19 cases, one expected skip. Bilingual build, copy lint and 2,151 internal links passed.
- Route sweep: 24 destinations × 320×600, 390×700, 820×900 and 1440×900 × Chinese/English × light/dark = 384 cases, without document overflow or JavaScript errors. Routes include the five main destinations, Stock, Map, Chart, Briefing, Research, Reports, Alerts, Profile, disabled Billing, Login, Register, Recovery, Opportunities, Vibe, Macro, Screens, Updates and a source record. Auth callbacks and outbound mail/payment delivery are not simulated as successful transactions.
- Discoverability regression: 48/48 cases passed. Four primary source/view choices fit one phone row and preserve minimum reading space, keyboard focus, search state and existing data reuse.
- Functional first-use suites: six combinations (320, 390 and 1440; both languages), 37 checks each, 222 passed. Start at zero stocks, read dated discovery, open NVDA, explicitly add it, visit all four stock tabs, render real candle canvases, change all chart periods/intervals, open/close help, zoom/reset, return to the same tab and retain membership. Calendar checks cover three modes, date dialog/focus, history focus, month/end-of-year/midterm filtering, decade/sort, full interpretation and source methods. With no followed creators, the page defaults to discovery; Following has an explicit empty state and a working discovery return. Invalid profile email stays focused without sending a write. Empty Today retains a research starting point.
- Final account/auth subtitle sweep: 80/80 passed after the high-specificity CSS correction.

The fixtures use local synthetic shared data and in-memory membership. Phone contexts enable touch emulation; no physical-phone or screen-reader claim is made. The harness now includes the vendored chart library and complete OHLCV bars: checking only an empty chart container had been a coverage gap. Notification/profile and empty creator responses use their real response shapes.

Failed iterations are retained in local logs: the first functional test checked tab state before asynchronous navigation rendered, used an obsolete calendar mode name and assumed empty creators defaulted to Following. These were corrected to actual UI behavior. One run overlapped build output replacement and received empty HTTP responses; the complete run was repeated after build completion. A stricter subtitle assertion caught the old account/auth selector winning over the new scale; that obsolete rule was removed. These failed runs are not passing acceptance.

Reproduce with `tests/browser/serve-product-focus.py --port 8953`, then `workspace-audit.mjs`, `workspace-flows.mjs` and `discoverable-views.mjs`. Evidence directories: `/tmp/ducky-workspace-matrix`, `/tmp/ducky-workspace-extra`, `/tmp/ducky-workspace-subtitles-final`, `/tmp/ducky-workspace-flows-final-pass`, `/tmp/ducky-workspace-entries`.

## Publication boundary

Base: frontend `0de3829e0812d9d91f7afe5babcefa1cf2111d15` (released Insider #127). Review and merge the combined PR #128, then use `scripts/deploy_pages.sh` from the exact reviewed `origin/main` tip. Verify canonical VERSION/CSP and browser routes. Rollback is a frontend revert and normal publication; no data migration is involved. Shared private architecture/status records are updated in the paired backend documentation PR #285, which remains separate from frontend publication.
