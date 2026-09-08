# Evidence map — phone layout revision

The owner rejected the previous phone view: ticker entry, watchlist chips, summary status
and search consumed the top of the screen, followed by a long stack of large cards.
Showing one complete point on a short screen was an inadequate acceptance criterion.

The phone view now presents stock → supporting/opposing/context branch → concise points.
The stock root opens the existing-stock picker; header search opens its controls only when
requested. Pending summary status shares the root instead of consuming a separate row.
Each point keeps its title, author where present, full date and source action. Branch text
and counts accompany colors. Zero-count types remain inspectable in the filter selector.
Conditions stay visible; the full original source and historical records remain available.

One set of node elements supports both layouts. Desktop uses the existing two-sided map;
phones group the same nodes by their existing stance. Balanced first six, opposition,
source passage indexing, summary citations, search and show-more retain their data meaning.
No account/watchlist writes, data acquisition, summaries, scores or investment rules change.

## Validation

333 frontend tests passed; bilingual build, copy lint and 1,332 internal links passed;
asset isolation 4 passed / 1 existing fixture skip. Added tests for full group counts,
retained opposition/conditions, no duplicated nodes on expansion, phone picker focus,
search disclosure/clear and no added API requests or watchlist writes.

Production-derived AVGO/ORCL data was rendered locally with a synthetic Pro account and
a twelve-stock watchlist. Chrome viewport simulations covered Chinese/English and
light/dark at 320×600 and 390/393×650 (eight combinations). Available content height is
470px or 520px after app chrome. First point begins at y=235, versus y=380.6 in the previous
revision. Three points fit fully at 320×600; four fit at 390/393×650 for both tested stocks.
No horizontal overflow. Search/select use 16px type and 44px or larger control heights.

Verified stock picker → ORCL, source dialog and exact video link, author search, closing
search while retaining the filter, clearing the filter, empty opposing results, keyboard
Escape/focus restoration, and desktop 1280×720 with six nodes and six curved connectors.
These are viewport simulations, not physical Safari or touch-device tests.

## Older-page diagnosis

The owner's screenshot contains the old long pending sentence and `$AVGO` root, matching
code `0e76ddc`, not the previously released `4f2e912` layout. Current public app HTML returns
`Cache-Control: no-cache, must-revalidate` and `cf-cache-status: DYNAMIC`. A still-open SPA
can retain its loaded module graph; the screenshot alone cannot identify whether Safari
restored that document or retained it in memory. A release-specific page query provides a
full-page navigation, without changing sign-in or private API authorization.

Final production release and signed-in checks are recorded below after deployment.

## Production receipt

Code `2edbb01` is deployed to Pages `f48861a3` and duckybot.app. Public feature CSS and
`app-assets/aae7ac97d54b3f650f49/views/evidence.js` match the release build byte for byte.
The actual signed-in Pro page was opened at
`/app/?release=2edbb01#/evidence/AVGO` in a 320×600 viewport. It reports CSS `2edbb010`
and the new module graph, has no always-visible ticker form/watchlist bar/search input,
and renders the stock picker, twelve recorded points and the grouped background branch.
Real first point y=235, content height 470px, three points fully visible, page width 320.
The dated Reddit source dialog opens and closes correctly. No user settings were changed.
