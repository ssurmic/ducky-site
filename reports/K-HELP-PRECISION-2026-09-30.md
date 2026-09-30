# K help precision · 2026-09-30

Status: validated candidate; final committed checks and publication pending.

Base: `294675b7115f8beb8f469a3846586c92afe58db6`. During final market-help review,
the two visible input cards were rounded, while K uses their source precision.
Explain this in both languages so users can reconcile the displayed ratio.
The formula, data, layout, and shared help interactions are unchanged.

Validation uses the existing help-dialog browser matrix and release checks.
Phone checks are viewport/touch emulation, not physical-device tests.

The first help matrix failed all 20 cases because the local QA server did not serve
its five imported fixture modules. The professional run was stopped after the
same loading failure was identified. Those failure screenshots/logs are retained.
Fix the loopback QA server with an explicit fixture-module allowlist; the helpers
stay outside public build assets and all business requests remain synthetic.

Validation: 1,000 Node tests, 14 Python tests, copy lint and 2,196 links passed.
After the QA server repair, all 20 help cases and all 20 professional-layout cases
passed. Help cases cover 320×600, 390×700, 820×900, 1440×900 and 700×390, each in
Chinese/English and dark/light. They verify six 44px targets, modal bounds, pointer
and keyboard operation, focus return and the K value above phone navigation.
The layout sweep confirms fixed view/category navigation, compact Indicators,
typography and minimum measured text contrast 4.7408:1. Visually checked the short
Chinese dark phone dialog and English light landscape dialog, including dialog
bounds and visible close controls. No production data or membership writes.

Commands: `npm test`; the release Python/copy/link checks; `node tests/browser/market-help.mjs`
and `node tests/browser/professional-ui.mjs` with the fresh loopback fixture server.
Rollback: revert this copy clarification and QA-only module routing patch.
