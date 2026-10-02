# 「我的提醒」 in the left navigation · 2026-10-02

Owner ask (2026-10-02): 「我的提醒」 is missing from the left column; the navigation should carry 今日 / 自选股 /
发现 / 投资日历 / 财经作者 / 提醒, load earlier events, and format them properly.

## What changed

- **Navigation.** The focus bar has six destinations; 提醒 / Alerts (`#/alerts`, bell icon from the local sprite)
  is the sixth on the sidebar and the phone bottom bar (`templates/app.html`, `product-focus.css` 6 columns).
  `selectNavigation` lights 提醒 for `alerts`, `updates` and `stock?from=alerts`. An unread badge on the link is
  polled from `GET /me/alerts/feed?limit=1` every 90 s while signed in and visible (`alert-badge.js`); it starts
  only in shells that show the link and never holds a process open.
- **Page.** `views/alert-feed.js` renders one shared row per source event for the stocks the reader follows,
  newest first, grouped by day (今天 / 昨天 / date): ticker, event type, insider bought / sold rail (green / red),
  headline and summary in the account language only, signal badges, an expandable note (key facts, context,
  what to watch, notes, source), and links to the stock, the source record and the filing. Type filters
  (全部 / 内部人 / 公告 / 指数 / 宏观) map to `kinds`; "加载更早的提醒" pages with `before=<next_cursor>`; the
  newest item's `observed_at` is posted once to `POST /me/alerts/seen`, which clears the badge. Superseded
  records render as withdrawn without links. Custom price alerts (`views/alerts.js`) are the second tab
  (`?view=custom`), and the stock page's price-draft deep link (`?ticker&price&direction`) opens that tab
  directly, so the existing flow is unchanged. The delivery history (`#/updates`) stays linked.
- **Before the feed route ships** (backend PR #311): a 404 on `/me/alerts/feed` falls back to the account's
  delivery history (`/signals/inbox`, which carries the shared `note` since backend #304), with a one-line
  notice. No unread marker is posted on that path.
- **Copy.** 50 `app.alertfeed.*` keys in `i18n/zh.json` and `i18n/en.json`; no verdict wording (the rails say
  内部人买入 / 内部人卖出, i.e. what the filing reports).

## Validation (local candidate checks)

- `node --test tests/alert-feed.test.js` — 4 tests: rows in the account language with direction, badges,
  note details and links; mount reads `fields=full`, marks seen once, filters and pages; 404 fallback with the
  notice and the custom tab; badge polling and its guard.
- Navigation contracts updated to six destinations: `tests/app.test.js`, `tests/discovery-navigation.test.js`,
  `tests/focus-navigation.test.js`, `tests/product-focus-release.test.js`; `tests/router-workspace.test.js`
  (price-draft return path) passes unchanged.
- Full gate: `DUCKY_TEST_PYTHON=/tmp/qa-venv/bin/python npm test` (build + every node suite) and
  `scripts/lint_copy.py` — see the release receipt below for the counts.
- Playwright on the loopback fixture (`tests/browser/alert-feed.mjs`, server `tests/browser/serve-product-focus.py`,
  case `alert-feed` data in `tests/fixtures/product-focus-browser.js`): 390 and 1440 px × zh / en × light / dark,
  all eight pass — six tappable navigation items on screen, 30 rows in ≥ 3 day groups, buy and sell rails,
  details open with ≥ 4 facts, no horizontal overflow, filter → `kind=insider`, paging beyond 30, custom tab,
  and the fallback notice with `alerts=unavailable`.

Screenshots (synthetic records, loopback only): [phone zh light](alert-feed-ui-20261002/feed-390-zh-light.png),
[phone zh dark](alert-feed-ui-20261002/feed-390-zh-dark.png), [desktop zh](alert-feed-ui-20261002/feed-1440-zh-light.png),
[desktop en dark](alert-feed-ui-20261002/feed-1440-en-dark.png), [custom tab](alert-feed-ui-20261002/custom-390-zh-light.png),
[fallback notice](alert-feed-ui-20261002/fallback-1440-zh-light.png).

## Backend state this page depends on

- Live now (backend `9e14564f`): `/signals/inbox` items carry `note`; insider notes are generated once per
  Form 4 and fanned out to every watcher (ORCL on 2026-10-02 00:23 UTC).
- Pending (backend PR #311, owned by the alert-feed backend slice): `GET /me/alerts/feed`, `POST /me/alerts/seen`,
  `ApiAlertFeedMode=on` on the Lambda. The page switches to it automatically; no frontend release is needed.

## Production release receipt

_To be filled at release: merged revision, gate counts, Pages deployment id, live VERSION._
