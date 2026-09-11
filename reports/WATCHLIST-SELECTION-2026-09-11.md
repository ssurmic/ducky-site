# Watchlist selection and capacity · 2026-09-11

Status: local implementation and regression checks complete; publication receipt to follow.

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
- Viewport simulation only; no physical phone or touch emulation claimed. Real-account QA must stop at selection/clear, since no particular user stock has been chosen for actual deletion.

## Release / rollback

Pending publication. Baseline main before this change: 2853d67; prior production Pages: 2308f071. Reverting this change restores the previous list, retaining server membership.
