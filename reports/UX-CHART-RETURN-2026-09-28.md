# Chart return preserves the research entry

Status: local candidate verified; independent source review passed; production release pending.

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

## Validation

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
- A loopback-only synthetic browser fixture is available for integrating-agent confirmation; production and physical-device confirmation remain pending.

Frontend baseline: `a4a356b0`, including the `e22240f3` production receipt from PR #106. This is a navigation-only change; it does not change backend APIs
or require a backend release. The integrating agent owns production browser confirmation and
the final release receipt. No live or physical-device acceptance is claimed here.
