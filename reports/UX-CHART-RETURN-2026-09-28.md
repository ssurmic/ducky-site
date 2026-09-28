# Chart return preserves the research entry

Status: deployed as `7fb28406` through PR #107; exact Chart return chain passed authenticated
production verification at 2026-09-28 20:25:30 UTC. The original failure and pre-release checks
below remain evidence; the [release receipt](#production-release-receipt) records the final result.

The production check of frontend `e22240f3` found that Creators → selected author → stock →
K-line → Stock page returned to a generic stock route. The selected author and original stock
page tab were lost, and the stock breadcrumb then defaulted to Watchlist.

The chart now saves its exact incoming stock URL and that stock's validated research origin in
browser history. This context is bound to the current account epoch, chart history entry and
stock ticker, using the same validation rules as alert drafts. Its existing Stock page link
returns to the original tab; the stock breadcrumb then returns to the selected author or other
original research entry. Refreshing the same chart entry preserves the context. A generic stock
entry, changed chart ticker, different history entry or new account does not inherit it.

The view separately validates the return as a local stock route for the displayed ticker.
External, unsupported and mismatched destinations fall back to that stock's default page.
The change adds no API calls, writes, account actions, source changes or chart data changes.

## Pre-release validation

- Focused mounted-route tests: 13 passed across `router-workspace.test.js` and
  `newcomer-workflow.test.js`.
- The full Creator → MU → History → K-line → History → selected-author regression checks the
  exact route, selected stock tab, original author, focus and scroll restoration.
- Negative checks cover an external URL, script URL, extra path, mismatched ticker, wrong history
  entry, prior epoch, an actual epoch change, invalid nested origin, generic stock navigation,
  changed chart symbols and switching back without resurrecting an old entry.
- Full Python discovery: 19 tests ran, 18 passed and one existing test was skipped. One malformed home-proof fixture
  intentionally emits a validation error while its rejection test passes.
- Full frontend gate: 823 Node tests passed, with no failures or skips. Bilingual build, copy lint and 2,103 internal links passed. The incidental calendar export was restored.
- `node --check` and `git diff --check` passed. The integrating agent reviewed the bounded source/test diff without a blocking finding.
- A loopback-only synthetic browser fixture was available for integrating-agent confirmation. At this pre-release stage, production and physical-device confirmation were still pending; the later production check is recorded separately below.

Frontend baseline: `a4a356b0`, including the `e22240f3` production receipt from PR #106. This is a navigation-only change; it does not change backend APIs
or require a backend release. These candidate checks did not establish live or physical-device
acceptance; the integrating agent subsequently supplied the scoped receipt below.

## Production release receipt

- [PR #107](https://github.com/ssurmic/ducky-site/pull/107) passed CI and merged into `main` at
  **2026-09-28 20:23:34 UTC** as `7fb28406cc89ac363309392599f945f0ab931e0a`.
- The existing publisher reran its complete prescribed gate: **823 Node tests and 14 Python tests
  passed**, with build, copy lint and **2,103 internal links** passing. The publisher exited 0;
  no failure was waived. Log: `/tmp/ducky-ux-chart-production-deploy.log`.
- The publisher released [Pages deployment `809bdbf9`](https://809bdbf9.ducky-site.pages.dev).
  At **20:24:20 UTC**, production `https://duckybot.app` served `VERSION=7fb28406`, and CSP was
  verified. The earlier `e22240f3` receipt remains unchanged as evidence for that version.
- At **20:25:30 UTC**, the integrating agent tested the actual authenticated production app at
  **390 × 700, Chinese/dark**: Creators → 投资TALK君 → Research MU → History → K-line → Stock page
  returned to `#/stock/MU?from=creators&tab=history`; the creator breadcrumb then returned to
  `#/creators?creator=touzi-talk`. The final author heading was 投资TALK君, keyboard focus returned
  to Research MU, and there was no document overflow. This verifies the previously failing full
  return chain with real reads, not only a fixture or a correctly formed link.

This is scoped desktop-browser viewport acceptance, not a physical-device test, live account-write
test or semantic review of source claims. It does not certify every creator, chart or source as
current. The navigation fix adds no reads, account actions or backend work; warning and missing-data
states retain their existing meanings. This documentation receipt is published separately and does
not trigger another frontend deployment.
