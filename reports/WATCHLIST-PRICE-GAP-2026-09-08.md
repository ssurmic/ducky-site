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
claim of production publication or a live-feed SLA.

Production release completed: backend `84e30a1e16ddbd40e5e105a878a39c94247f552d`, frontend
`cfc646f2200c5b9c519fe76ba25e460cfc99321b`, Pages `9f8a6fb7`. Exact backend CI 34301894195
and frontend CI 34302073166 passed. The original backend release wrapper verified recovery
backup `recovery-20260909T021612768502Z-3c44b560`, passed API health and restored timers.
The existing company-context producer rebuilt the shared overview without provider/model
work. UBER lacked an accepted same-day close; one retry after the existing deadline returned
21 accepted bars, including September 8 close 73.13, and the producer republished it.

Actual production account verification: all 36 watchlist entries and heatmap tiles have
prices, including NVDA 225.73, GOOGL 338.36, META 613.48 and UBER 73.13. Chinese/English
393px mobile layouts and English 1200px desktop showed no horizontal overflow or browser
errors. Production screenshots were inspected but are not committed as synthetic fixtures.
The full 54-ticker shared watched scope also has prices; 41 retained / 13 ready at the later
check, with ordinary background retries continuing. No user watchlist was changed.
