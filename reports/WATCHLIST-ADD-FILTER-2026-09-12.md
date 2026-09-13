# Watchlist add keeps the whole list visible · 2026-09-12

Status: deployed. PR #58 merged as main `c0d27904`; Pages deployment `8aaa50a6` at 2026-09-13 01:58 UTC; the live
`config.js` serves VERSION `c0d27904`. Signed-in production verification by the owner is still pending.

## Problem and behavior

The owner reported that adding a stock made the watchlist "load only the new one". The screenshot showed
"3/50 stocks" with a single row and the search box still holding the new ticker. The cause was in the view,
not in the data: selecting a search result writes the ticker into the search box, and after a successful
"Add to watchlist" the view reset the result dropdown but kept the search text and its filter, so the table
kept showing only rows matching that ticker while the count already said 4/50. All earlier stocks were still
on the server and in the session; only the filter hid them.

After this change a successful add clears the search box, its filter and the pending offer, then reloads
membership as before. The new row is scrolled into view (a long list sorted by market cap can place it
below the fold). When the add came from the search offer, whose button disappears with the offer, focus
moves onto the new row's stock name so keyboard and screen-reader users land on what they just added; an
add from the Add form keeps focus in that form for the next ticker. A rejected add (limit, network, session
change) leaves the search text in place for a deliberate retry. No API, membership, cap, research or
notification behavior changes.

## Validation

- Node: `npm test` (build + tests) 738/738 with the new regression. Against the previous view the regression
  failed with the table holding `['COIN']` instead of `['AAA','BBB','CCC','COIN']`, and the earlier
  search-offer case lost its NVDA row.
- Copy lint: 3,614 files, OK. Internal links: 1,890 checked, OK. Export, build-asset and research-config unit
  tests: 3 + 5 (1 existing skip) + 3, OK.
- Synthetic browser fixture (`scripts/research_brief_qa.py --product-focus`, case `watchlist-add`: three
  stocks, in-memory membership writes, no production connection), driven by `tests/browser/watchlist-add.mjs`
  at 1440×900 EN dark and 390×760 ZH light. Before the change both layouts ended at "4/50" with rows
  `[COIN]`, search "COIN" and focus on the document body. After the change: rows `[NVDA, AVGO, AMD, COIN]`,
  search empty, offer hidden, focus on `COIN:name`. Exactly one `POST /watchlist` per add and no page errors.
  Screenshots and `browser-results.json` are under `reports/watchlist-add-filter-20260912/{before,after}/`.
- The same fixture was also walked by hand in a desktop browser before and after the change with matching
  results (before: count 4/50, one row, search "COIN", filtered state set; after: full table).
- Not verified: the signed-in production app, which needs the owner's account. No production membership
  write was made. Viewport emulation only; no physical phone.

## Release / rollback

Published via PR #58, merge `c0d27904`, Pages `8aaa50a6`, app graph `0c4f6a07d80bcceb26c9`; PR CI (`check`)
passed, and `scripts/deploy_pages.sh` verified the live VERSION after publishing. Baseline main `21c68785`; the
previous production entry in the change log is main `1858a406` → Pages `7a563a0a`. Republishing that tip through
the same script, or reverting the single view change, restores the previous behavior; server membership is
unaffected either way.
