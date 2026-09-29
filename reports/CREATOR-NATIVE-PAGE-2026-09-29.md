# Native views on the selected creator page — 2026-09-29

Status: implemented; complete local frontend gate and synthetic visual acceptance passed. Not yet merged or deployed. This bounded follow-up closes the author-link gap in PR114; production publication and authenticated source acceptance remain separate receipts.

## Behavior

An author name in a qualified video-view card leads to that creator's page. The page now renders the same compact, attributed views immediately below the author heading, ahead of historical batch progress. It requests the existing `/kol/opinions` preview with the exact selected creator and any explicit ticker scope. No follow, model call, source request or account mutation is needed. Existing transcript views, research, archives and their access rules remain intact. An exact original-source route continues to show that source rather than adding an unrelated author-wide feed.

The reader validates the creator filter, echoed selection, every point and every grouped original record. Creator identity is part of saved disclosure/show-more state and the request URL. Switching creators or leaving the feed disposes the previous reader; late replies cannot paint into another author. Repainting existing transcript/page material for the same creator reuses the native reader and its expanded sources. The same shared account/revision, withdrawal and visible-only refresh guards remain in use.

Historical counts retain their original dates and values. A visible “Historical summary batch” label and scoped pause message replace the misleading statement that no new videos are being collected. The UI does not infer that new-upload processing is active, paused or complete from that historical response.

## Validation

- Focused creator/native/progress/legacy tests: **20 passed**, including creator mismatch, nested source identity, empty selection mismatch, creator-specific reading state, late switch responses, disposal, non-followed preview access and exact-source isolation.
- First full run exposed an actual compatibility issue: an invalid legacy catalog ID threw while mounting the additive reader and interrupted the existing creator page. The reader now refuses that request with its normal unavailable state without throwing or issuing an unfiltered read. The full gate was restarted after this fix; no failed result is claimed as a pass.
- Independent loopback Chromium: **12 combinations passed** at 320×700, 390×700 and 1440×900, both languages and themes. Each follows Explore → author, verifies the same view, checks source expansion/refresh, and retains historical batch dates. No outbound calls, horizontal overflow or runtime errors. Frequent native controls are at least 44px; claim text remains 13px on phones and 14px on desktop. Phone first-view top is approximately 275px (291px in English at 320px).
- The next full run exposed an obsolete assertion that selecting an author issues no requests at all. The test now permits exactly one creator-filtered preview GET, still forbids a duplicate page request or analysis POST, and always disposes its reader. The focused compatibility group passed **28 tests**.
- Final complete frontend gate: **864 Node tests passed**, **14 Python export/home tests passed**, and the asset gate passed **4 tests with 1 expected local skip**. Build, copy checks and **2,109 internal links** passed. No production account mutation or paid call is part of this frontend slice.

## Reproduce the synthetic visual check

```sh
DUCKY_TEST_PYTHON=/path/to/python npm test
python3 tests/browser/serve-product-focus.py --port 8951
QA_BASE=http://127.0.0.1:8951 node tests/browser/creator-native-page.mjs
```

The fixture is `case=native-creator`; start at `#/explore` and follow the author, or open `#/creators?creator=sample-creator`. It contains synthetic records only and never proxies production API traffic. The browser runner writes screenshots and measurements to its configurable local output directory.

## Retained boundaries

The compact component supplies qualified native points on the author page; it does not turn them into transcript evidence, supporting stock calls, verified performance or a completed historical backfill. Legacy exact-source rendering stays unchanged. Actual native content and end-to-end timing require the separately authorized single real case. No full historical backfill or new monitor is activated by this UI change.
