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

All prices, dates, opinions, and fictional creators in the prototype are illustrative. No real portfolio, creator subscription, alert, account, financial transaction, or production source is changed. Production request semantics and source validation remain authoritative for future integration.

- [Observed UX audit](ux-audit.md)
- [Three directions and selected design](ux-final-direction.md)
- [User journeys](user-journeys.md)
- [Proposed backend contracts](proposed-backend-changes.md)
- [Acceptance record](../../reports/UX-REDESIGN-2026-09-28.md)

Validation:

```sh
npm ci
node --test prototypes/ux-lab/acceptance.test.mjs
DUCKY_TEST_PYTHON=/path/to/python-with-jinja2 npm test
python3 scripts/lint_copy.py
python3 scripts/check_links.py
```
