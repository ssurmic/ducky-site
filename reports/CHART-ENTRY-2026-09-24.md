# K-line entry points · 2026-09-24

Status: deployed. PR #97 merged as main `daca0a76`, Pages `af56316b` (2026-09-25 01:37 UTC); the feature-cuts release `855b14b3` / Pages `3000617b` (01:42 UTC) carries the same change. Owner verification in the signed-in app is still pending.

## Problem

The owner could not find the K-line. The audit of 2026-09-24 measured: from a watchlist row, two taps
through the research map's "Open chart"; via the stock page, three taps because the chart sat inside
the collapsed "Keep researching" block at the bottom; from Today, three to four. The chart page had no
way back to the stock page, and a bare `$TICKER` link opened the stock page on Today/Watchlist/Explore
but the chart on about twenty-five other link sites.

## Change

- Stock page heading tools: Research Map · Chart · History · Creators · Calendar · Alerts (six one-tap
  ghost buttons; two columns on phones per the existing `.stock-core-actions` grid). The price-history
  section links "Open the K-line and option walls". The collapsed block keeps only the past-briefs link.
- Watchlist rows: the price cell is a link to the chart (`.watch-price-link`, `data-reading-key
  <T>:chart`, aria-label "Open the <T> chart"). The map pill is unchanged; no new column, the phone's
  fixed stock column is untouched.
- Chart page: "← Stock page" (`.chart-back`) above the ticker when a ticker is loaded.
- Ticker links unified to `#/stock/<T>` in briefing.js, social-ranking.js, alerts.js, calendar-event.js,
  company-context.js (peers and related), signal-screen.js. Explicit chart buttons (research.js,
  boards.js, creators.js, evidence.js, evidence-context.js) still open the chart.
- Today macro strip: "Macro details →" to `#/macro`.
- Keys (zh/en): `focus.chart_short`, `focus.alert_short`, `focus.open_kline`, `chart.back_to_stock`,
  `watch.open_chart`, `today.macro_more`. CSS in `product-focus.css` only.

Taps to the K-line after this change: watchlist row → 1 (price); stock page → 1 (heading or price
section); Today → 2 (stock card, then heading).

## Validation

- `npm test` (build + Node tests): 800/800. Copy lint OK (4,158 files). Internal links OK (2,037).
- Synthetic fixture walk in a desktop browser: stock page heading shows the six tools and the price
  section link; the watchlist price opens `#/chart/<T>`; the chart page shows the back link; Today's
  macro strip shows the macro link. (Recorded in the PR.)
- Not verified: the signed-in production app (owner's account).

## Rollback

Revert the PR; baseline main `f1b63bf7`. No API or data change.
