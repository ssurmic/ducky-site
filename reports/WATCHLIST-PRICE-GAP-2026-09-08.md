# Watchlist saved-close availability — 2026-09-08

The owner's 18:53 PT screenshot showed missing closes for NVDA, GOOGL, META and MU while
AVGO remained visible. Read-only backend evidence showed earlier accepted September 8
closes followed by later receipts with NaN Close/Adj Close. The current watchlist selected
only the latest receipt, hiding already accepted values. No frontend networking change
can repair that projection on its own.

The companion backend retains an accepted **same-session** close only for a subsequent
blank-close update. Latest research/historical quarantine is unchanged. This UI labels
retained values “Saved close”, exposes the original date/time in methodology and keeps
actual missing prices and actual zero returns distinct. List and heatmap use the same rows.
The shared header is shorter so the failure note does not take over the phone viewport.

Validation: 481 frontend tests passed; copy lint and 1,352 links passed. Synthetic browser
fixtures cover 320/393px at 650px high × English/Chinese × light/dark × list/heatmap:
16 combinations, all 50 stocks accessible, no horizontal overflow. Four 1200px desktop
language/theme combinations also passed. Phone first rows/tiles begin at about 373–401px;
the real production app header and browser chrome are separately verified after deployment.
Artifacts in `watchlist-price-gap-20260908/` are synthetic, not user account data.

The backend companion passed 4,162 tests / 6 skips with ALL GREEN and architecture lint
0/0. A read-only preview against the production store took 0.165 seconds for 54 shared
watched tickers: 48 retained, 5 current, 1 still missing. That is a backend preview, not a
claim of production publication or a live-feed SLA. Publication receipts follow after deploy.
