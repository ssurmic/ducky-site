# Ducky UX design preview · 2026-09-28

Status: isolated, interactive frontend prototype. Not deployed or connected to a production account.

Run from this worktree:

```sh
python3 prototypes/ux-lab/serve.py
```

Open `http://127.0.0.1:8765/prototypes/ux-lab/#/today`. No build, account, external fonts, or API credentials are needed. A separate local storage namespace holds only prototype interactions. The scenario selector switches between a new user with an empty watchlist and a returning user with six sample stocks. Use the top-right controls for language and theme. New user resets only this preview's saved plans, follows, bookmarks and filters. Desktop also exposes loading and failed-refresh previews.

Review these journeys:

1. Today → Explore → a stock → inspect an opposing view → add to Watchlist.
2. Watchlist → Overview → price reference → edit a local watch plan → My alerts.
3. Creators → read views from several authors → filter by ticker → source drawer → author profile → stock.
4. Calendar → event impact → related stock → price plan.
5. Switch to English/light theme and repeat at 390×650 and 320×600.
6. Watchlist → Metrics → compare long-term/trend views, walls, support and IV/HV20 → select a metric for its meaning → stock metrics → save an editable local price-watch draft.
7. Today → dollar liquidity → compare the three lines → select a date for raw readings → switch the first line to 10-year yield.
8. Explore → Company & money activity → Insider / 13F / political / company categories → source record → the same stock. Compare transaction dates, report periods and publication dates.

The follow-up review restored analytical features omitted from the initial preview. List remains
the default and Overview remains second; Metrics is a visible third option. Degen is labelled
attention, not undervaluation. A separate valuation score has not been invented. The Today chart
uses each series' own ten-session minimum and maximum, so its aligned lines compare shape only.

All prices, dates, opinions, and fictional creators in the prototype are illustrative. No real portfolio, creator subscription, alert, account, financial transaction, or production source is changed. Production request semantics and source validation remain authoritative for future integration.

- [Observed UX audit](ux-audit.md)
- [Three directions and selected design](ux-final-direction.md)
- [User journeys](user-journeys.md)
- [Proposed backend contracts](proposed-backend-changes.md)
- [Acceptance record](../../reports/UX-REDESIGN-2026-09-28.md)
- [Metrics and liquidity follow-up](../../reports/UX-METRICS-RESTORATION-2026-09-28.md)
- [Activity reference and API audit](../../reports/UX-ACTIVITY-REFERENCE-2026-09-28.md)
- [Persistent change and integration register](change-register.md)

Validation:

```sh
npm ci
node --test prototypes/ux-lab/acceptance.test.mjs prototypes/ux-lab/activity-adapter.test.mjs
DUCKY_TEST_PYTHON=/path/to/python-with-jinja2 npm test
python3 scripts/lint_copy.py
python3 scripts/check_links.py
```
