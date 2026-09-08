# Mobile navigation and interaction audit — 2026-09-08

The owner asked for Information Map in the third phone tab, alerts under More,
and a mobile rendering/interaction audit including heatmaps, zoom and both themes.

## Changes

- Phone navigation is Watchlist → Calendar → Info Map → Radar → More. Chinese:
  自选股 → 日历 → 信息导图 → 雷达 → 更多. DOM, keyboard and visual order agree.
  The full English accessible label remains Information Map. Desktop destinations
  retain their existing order. Alerts and Updates highlight More correctly.
- At 320px the watchlist display buttons no longer squeeze List into a vertical
  label. Search and sorting get complete rows. Heatmap breadth uses a full row
  instead of wrapping each count beside its area controls. Small-stock entries
  have a minimum 44px target.
- Creator subnavigation exposes all four destinations in a two-column phone
  layout. Tighter surrounding spacing compensates for its extra row.
- Chart zoom out/in/reset buttons work on the existing chart. Reset restores
  both the complete time range and automatic price scaling. Phone chart header
  spacing is reduced. Zoom does not fetch bars or snapshots again.
- Native touch emulation exposed a first-tap bug in heatmaps: focus created the
  hover inspector before click, consuming the tap. Pointer-down now distinguishes
  touch focus from keyboard focus. Mouse hover and keyboard inspectors remain.

No market-cap area formula, research classification, ranking, prices, entitlements,
user watchlists, notification settings or backend runtime changed.

## Browser evidence

The loopback harness in `mobile-ui-20260908/` renders the real built app and modules
with explicitly synthetic data, blocks external requests and API mutations, and
exposes measurements as DOM text. Run `python3 reports/mobile-ui-20260908/serve.py`
after building. `/qa?matrix=1&height=600` runs the route matrix; `/qa?route=watchlist&case=cap`
opens the extreme market-cap fixture. This harness is not copied into the website.

- Matrix: 20 routes × Chinese/English × light/dark × 320/390px = 160 combinations
  at 650px height. A second 160-combination sweep at 600px found no horizontal
  overflow or runtime errors after fixing the creator tabs. Routes: watchlist,
  evidence/NVDA, briefing, chart/NVDA, calendar, boards, alerts, creators, profile,
  billing, opportunities, vibe, market, macro, screens, updates, research/NVDA,
  login, register and forgot. Some routes intentionally receive unavailable or
  empty fixtures; this is layout coverage, not full live data coverage.
- Header 61px and phone navigation 69px leave 520px of content at 650px height,
  470px at 600px. The five common navigation targets are 54px high. First watchlist
  row starts around y=280–354 depending on width/language; heatmap starts at y≈343.
  Filled charts retain a 410px canvas; initial top is around y=423–433. Longer
  content remains vertically scrollable. These are actual CSS viewport measures.
- Visual reviews covered both heatmap modes, missing price, zero change, losses,
  missing market cap, 50 tickers with extreme cap concentration, chart panes,
  evidence branches/source modal, More, calendar, radar, creator navigation,
  billing and profile. The missing-cap stock remains outside the weighted map;
  all 50 remain available in equal tiles. Small-cap NOK opened from the small-stock
  list. No stock was added or removed.
- Kline controls: repeated zoom in, zoom out, reset, and live light/dark switch.
  Candles, RSI and MACD repaint; only the original company/bars/snapshot calls occur.
  Source modal opening/closing and More → Alerts were clicked at 320px.
- Native Chrome page zoom: 125%, 200%, then 75% on a 780×1300 viewport gave CSS
  widths 624, 390 and 1040. Heatmap kept 49 weighted tiles, zero overflow and one
  watchlist request throughout; mobile/desktop navigation switched correctly.
  Local zoom was restored to 100%; the user's production 67% setting was untouched.
- Native DevTools iPhone 12 Pro simulation: 390×844, coarse pointer, one touch
  point. A real coordinate tap emitted `pointerType: touch`. Before the fix it
  opened only the inspector; after the fix one tap opened NVDA details, hid the
  inspector, and made exactly one snapshot request. A native drag scrolled the
  detail panel from scrollTop 1514.5 to 2498. Device emulation was disabled and
  the temporary test tab closed afterward.

This is Chrome browser and touch-emulation evidence. No physical iPhone/Android,
Safari, native Telegram WebView or physical two-finger pinch test is claimed.
No payments, account edits, real alerts or notifications were submitted.

## Validation and release

Released frontend `cea733ec773542943b56c69f9d0f487cb7ea176f`, Cloudflare Pages
`a8295c51` to https://duckybot.app. App module graph `d3e3771b5fe99d72fe38`.

Final frontend suite: **366 passed**. Touch-specific regression and existing
heatmap tests: 11 passed. Asset isolation: 4 passed, one existing missing legacy
fixture skipped. Backend clean `origin/web` selftest: ALL GREEN, 2244 pytest checks,
five warnings; architecture lint 0 failures/0 warnings. Copy lint scanned 2423
files; 1314 internal links passed. Release CI succeeded:
https://github.com/ssurmic/ducky-site/actions/runs/34210392376.

The final merged build repeated the 650px matrix: 160 combinations, zero overflow
or runtime errors. Production at an actual 390×649 CSS viewport showed the new
five-item bottom navigation and the real 16-stock heatmap. CIEN opened its detail
and all 15 chart canvases; zoom in/out/reset were clicked successfully. The third
tab opened six information-map nodes, marked Information Map current, and did not
mark More. More → Alerts closed its menu and correctly marked More. The loaded
production module graph matches the final local build. No account/notification/
payment changes were submitted.

Later upstream commits merged before the report update only change a separate
demo source-review report, with no published UI/module differences.
