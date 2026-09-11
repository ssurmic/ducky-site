# Watchlist selection and capacity · 2026-09-11

Status: deployed and verified in the signed-in production app.

## Problem and behavior

The focused watchlist list had no removal control: only the legacy expanded detail card exposed deletion. A user at 50/50 could reach the add limit without finding a way to make space.

The fixed stock column now contains a native checkbox beside every ticker and a select-visible checkbox in its header. The action bar shows the selected count, an expandable list of selected tickers (including selections hidden by search), Clear selection and Remove selected. Overview and heatmap provide a button back to List for selection. Sorting, expanding sources, filtering and shared quote/research refresh retain selection and their existing reading state. Checking a box sends no request.

The count uses the API's current cap. Full accounts see an explanation before attempting to add, with add actions disabled. A stale-cap rejection updates the displayed cap and reloads membership without raising the unrelated upgrade dialog.

Deletion uses the existing idempotent DELETE endpoint, sequentially and only for selected members. A row and slot disappear only after a valid success response. Processing stops on the first error, preserves all unconfirmed selections for retry, and distinguishes successful from unconfirmed counts. Busy controls and account/route guards prevent duplicate writes or continuing a batch in another account. Existing membership-version fences reject reads that started before removal. No schema, paid-access, research acquisition, scoring, history or alert configuration changes.

## Validation

- Frontend: 694/694 Node tests, including 9 new regression cases for quota, filtered selection, partial failure, idempotency, malformed response, double click, logout/abort and stale reads.
- Build assets: 4 passed, 1 existing fixture skip; research preview configuration and public close export: 3 each passed. Copy and internal links passed.
- Backend: selftest ALL GREEN; 793 pytest cases passed with 1 existing warning. Architecture lint: 0 failures or warnings.
- Isolated browser fixture allows in-memory membership writes only in the explicit watchlist-management case. All other fixtures still reject writes. No production connection or real member changes.
- Browser: 320×650 and 390×650, EN/ZH, light/dark; all 8 layouts show 50/50, 51 checkboxes, no document overflow, 522px app content height, 44×44 checkbox targets and 16px search input. First stock starts at 446px (465px for 320px English); two rows are partly or fully visible before scrolling. Desktop 1440×900 checked.
- Browser interaction: selected 2 → removed 2 → 48/50 → added one back → 49/50. Filtered select-all chose only AMD. Keyboard Space selected a stock; review disclosed its ticker. Native clear-selection restored the empty selection. Phone and desktop screenshots/viewport measurements are local evidence under reports/watchlist-selection-20260911/.
- Route smoke checks at 390×650 covered watchlist, briefing, chart, calendar, oversold radar, alerts, creators, profile and billing (billing-disabled fixture routes to Profile). All rendered their expected heading with zero document overflow; non-watchlist routes had no selection controls. This is layout isolation evidence, not full data-coverage acceptance.
- Viewport simulation only; no physical phone or touch emulation claimed. Real-account QA must stop at selection/clear, since no particular user stock has been chosen for actual deletion.

## Release / rollback

Published via PR42, merge `5c86ada199807308ebb0218a272640a3c2def404`, Pages `b2489ad9`, app graph `e23c9971cde64aa70769`. Final PR CI `34631849510` and exact-main CI `34632038238` passed. Eight production HTTP checks passed: root/EN/ZH app shells match after removing the existing host-injected Cloudflare beacon, and versioned CSS plus changed modules match byte for byte. This change does not configure analytics.

Signed-in EN/ZH production QA confirmed 50/50, 50 stock checkboxes plus select-all, the proactive limit note, and disabled add actions. Individual selection enabled Remove selected (1); select-all displayed Remove selected (50). Both were cleared successfully, leaving membership at 50 and the session intact. At 390×650 there was no document overflow and checkbox targets measured 44×44. No production membership write was made. The language toggle had a normal asynchronous membership read; initial 3-second locator waiting expired, then the completed page passed.

Baseline main before this change: 2853d67; prior production Pages: 2308f071. Reverting this change restores the previous UI, retaining server membership.
