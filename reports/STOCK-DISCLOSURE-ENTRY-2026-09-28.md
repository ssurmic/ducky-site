# Direct stock disclosure entry acceptance

Date: 2026-09-28. Status: implemented local candidate, not committed, merged or deployed.

Frontend baseline: `0c904fa35a04466d4896a3aa8bb5b9b529811f26` (`origin/main`).
Backend contract inspected: `a4851d0c861f6356d52abffe2a18a871b2329848`.
Branch: `codex/ux-disclosures-20260928`.

## Problem and resulting path

A reader on Stock Overview or Metrics could not find the stock's insider trades or fund filings
without discovering a generic activity tool. The Watchlist fund dialog also opened the broad
partner category, which mixes strategic investment, stake and 13F records. Its default recent
window could hide quarterly filings.

The stock workspace now places two links immediately below its tabs: Insider trades and Fund
holdings · 13F. They stay visible in Overview, Metrics, Evidence and History. Both use the existing
server-filtered archive with an explicit ticker, category, archive mode, all content and all
transaction amounts. There is no seven-day window or directional filter. The Watchlist insider,
fund and political filing dialogs use the same bounded route helper.

`board=funds` maps to `kind=13f`; `board=insider` maps to `kind=insider,cluster`. Source records,
access checks, pagination, coverage, delayed public access and partial results stay unchanged.
No inline preview, automatic follow, data generation or extra stock-page API request was added.

## Meaning and implementation boundaries

- `public/js/app/stock-disclosures.js` owns the pure route builder and visible links. It accepts
  the app's equity ticker form and uses URLSearchParams; invalid ticker/category input falls back
  to generic activity.
- Stock and Watchlist dialogs reuse that helper. The stock links are outside every tab's hidden
  panel and outside collapsed tools. Mobile links retain two columns and 44px minimum height.
  On phones, the duplicated Metrics section heading is visually hidden but retained for assistive
  heading navigation, and its generic introduction is hidden. Individual metric names, help
  controls, source dates and methods remain intact.
- The existing backend `purchases=open_market` predicate gates insider transaction value at the
  configured minimum. It does not itself filter purchase versus sale direction. Radar therefore
  displays its threshold notice only for the insider category and explicitly leaves direction to
  each record. All-category and all-amount views omit that notice.
- 13F period and filing date retain their existing labels. Reported share changes are not
  described as executed purchases or current holdings. No filtering or source-rendering algorithm
  was changed; this slice improves direct entry and corrects the filter description.

## Validation

- Focused Node run: 40 passed, 0 failed. Covers Stock workspace, new disclosure routes,
  Watchlist signal dialogs, Radar activity and existing Radar behavior.
- New regression cases mount real Stock Overview and Metrics with mocked HTTP and assert visible
  links outside hidden/collapsed containers, no Radar request, only GET reads and no watchlist
  mutation. Archive-path assertions require ticker, exact source kind and `purchases=all` with no
  start date or directional filter. Empty local previews retain archive access.
- Production build, bilingual key parity, copy lint and whitespace check passed.
- Full Node suite passed: 812 tests, 0 failures, 0 skips. Copy lint scanned 4,196 files; internal-link
  checks passed for 2,103 links. This run preceded the separate Today/Calendar density follow-up;
  the final combined gate remains with the integrating agent.
- Initial Chrome viewport simulation at 320 × 640, English light: both links measured 145 × 44px
  at y=207 with no horizontal overflow. That check identified the extra row pushing the last
  metric values below the footer. The duplicate heading/introduction correction above was built
  for recheck; the final viewport result is to be appended by the integrating agent before release.
- The local fixture server uses synthetic records only; it does not make live account requests.
  No physical-device or live-content acceptance is claimed here.

## Release and continuation

The earlier production receipt for version `0c904fa3` is retained in
[UX-PRODUCTION-2026-09-28.md](UX-PRODUCTION-2026-09-28.md). This candidate also carries that
documentation receipt; the receipt does not make the new disclosure links deployed.

Before publishing, record the committed candidate, complete gate and affected 320/390px phone
checks in both languages/themes. Confirm the stock links reach the correct ticker/category and
that the extra row preserves useful first-screen metrics without document overflow. After
deployment, append exact release evidence and limited readable-record checks. Archive access
does not establish source freshness, exhaustive coverage or current ownership. A code rollback
needs no data rollback because this slice changes only frontend navigation, copy and layout.
