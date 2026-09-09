# Adopt completed chart history without reloading

The chart could display a current close from a shorter shared daily series while a
longer requested history was prepared in the background. Its per-period browser
cache then retained that response indefinitely. Switching Day/Week reused the
short series, and the generic update notice required a page reload.

The existing scheduled shared reader now lets the mounted chart adopt updated
`/bars/<ticker>?period=...` responses. It updates the matching period cache,
candlesticks, RSI, MACD and price timestamp in place. No chart instance, research
disclosure, selected period, candle interval or focus is replaced. An unzoomed
chart fits the completed history; a zoomed chart retains the same date window
when earlier bars are prepended. Existing session/access gates, hidden-page
suspension, read backoff and disposal remain. There is no new provider call path,
polling timer or per-user backfill.

A completed response can also replace an initial 202 placeholder through the
same reader. Late responses from a superseded draw cannot poison another period
or replace a newer shared-reader result.

## Production coverage inspected read-only

September 9, 2026, 04:39 UTC, VST:

| Store | Count | First date | Last date |
| --- | ---: | --- | --- |
| `cache["bars:VST:2y"]` | 501 daily bars | 2024-09-09 | 2026-09-08 |
| `prices_daily` | 253 non-null closes | 2025-09-05 | 2026-09-08 |

The chart cache was built at 04:35:15 UTC. The latest shared-price receipt at
04:06:28 UTC requested one year from Yahoo Finance via yfinance, receiving 251
accepted bars without quarantine. The two stores have different history coverage;
this diagnosis did not fetch prices or modify either database.

## Validation

- Final build and all 488 Node tests pass; targeted chart/shared-reader/watchlist
  suite: 37 passed. Release isolation: 4 passed, 1 optional retained-history case
  skipped (the screenshot release aged outside bounded history). Public close
  export: 3 passed. Copy lint and 1,352 internal links passed.
- Regressions cover shorter daily fallback → full two-year history with Week
  selected, actual chart-instance retention, focus/disclosure retention, full-range
  expansion, zoomed date preservation, indicator recomputation, cached Day
  aggregation without another request, and 202 completion without another fetch.
- Local browser checks use the real vendored Lightweight Charts and synthetic
  bars, with no provider calls. Chinese and English, light and dark, at 320×700 and
  390×700 iframe viewports, plus desktop width: the chart adopts 501 bars while 2Y
  and Week stay selected. Zoomed windows remain unchanged. DOM width readings
  were 320/320 and 390/390 (client/scroll), with no horizontal overflow. Screenshot
  and accessibility readback verified controls and the expanded timeline.
- These are local viewport simulations, not physical-phone or production
  acceptance. No deployment or push was performed by this workstream.
