# Mobile experience — 2026-09-07

Owner goal: make the existing website comfortable on portrait phones, keep its interactions usable, and verify light and dark appearance. Worktree: `ducky-site-mobile-20260907`.

## Changes

- Compact portrait spacing and headings; body text remains readable, inputs use 16px and primary controls have at least a 44px target. Calendar date numbers stay 22px and event/weekday labels 14px.
- Market topics are vertical rows. Radar categories open as a complete two-column list, show the selected category when collapsed, and return focus after selection. The More navigation menu is vertical on phones; selecting an item does not leave keyboard focus in a hidden panel.
- On phones the price chart precedes the detailed overlay legend. Related links wrap compactly, while desktop order is preserved.
- Dialogs respect safe-area padding, retain a 44px close button, scroll within the viewport, and restore date focus and the underlying scroll.
- Browser color-scheme changes, explicit theme changes and Telegram theme events repaint the candlesticks, RSI reference lines, MACD histogram/lines, overlay lines and legend from the active application palette. They reuse the already loaded data and do not request new prices or alter research values.

## Validation before integration

237 frontend tests passed, including targeted regressions for theme repaint/no refetch/cleanup and phone category selection/focus. Asset graph checks: 4 passed, 1 unavailable historical fixture skipped. Backend local selftest: ALL GREEN (783 pytest passed); architecture lint: 0 failures and 0 warnings. The DGX-only launcher cannot run at its hardcoded path on this Mac, so the same harness was run directly using the backend's existing Python environment.

Browser UI used a local fixture server at port 8876, with API writes rejected. Synthetic values are layout fixtures, not production evidence. The nine primary pages (watchlist, briefing, chart, calendar, radar, alerts, creators, profile, billing), plus login/register/forgot, were measured in Chinese and English at 320/390px with inherited light/dark appearance: 96 combinations, no main-surface horizontal overflow, no pending spinners or error boxes at measurement. Eight further tablet/desktop checks covered English radar at 768/1024px and Chinese calendar at 768/1440px, both themes. These are layout-state checks, not 104 separate completed account workflows.

Interactive browser checks include category disclosure/selection, chart period changes, vertical More → Profile navigation with focus restoration, a live inherited light→dark chart change, and September 7 holiday dialogs at both phone widths in both themes. Dialog widths were 296/366px; close buttons were 44px. Escape restored the selected date and exactly preserved the opened scroll position (388px at 320px, 344.5px at 390px in this fixture). Screenshots were inspected in the task.

This is Chrome viewport/iframe and mouse/keyboard testing. Physical iOS/Android, real payments, password changes and notification delivery are not claimed. Existing API gates, account data, research rules, source evidence and losses are unchanged.

## Integration and release

Integrated the latest watchlist/font release (`79a991a`) and homepage comparison release (`ca2d9d3`). Final application code commits: `c39d8df` and `9e04609`. The post-font browser recheck covered radar (EN), chart (ZH), watchlist (EN), calendar (ZH), each at 320/390px in both themes: 16 further checks passed.

Final gates: 245 frontend tests passed; 4 asset graph tests passed / 1 unavailable old fixture skipped; bilingual build produced 20 pages; copy lint covered 1,783 files; 774 internal links passed; git diff check passed. The generated calendar timestamp was restored so this frontend patch does not alter committed event data. No secrets or test fixtures are included in the change.

Ready for release, awaiting the owner’s explicit confirmation for GitHub push and public deployment under the repository Safety rule. No production update has been performed by this task. Browser-only fixture preview: `http://127.0.0.1:8876/qa?route=boards&lang=zh&widths=390&themes=light,dark`.

## Follow-up before publication

The live application asset references still exclude these mobile commits. A subsequent Chrome DevTools iPhone 12 Pro preview rendered the portrait radar at 390×844, but the automation connection timed out on DOM inspection/input while device emulation was enabled. Its attempted tap did not establish a successful category interaction. This run is **not** counted as touch validation; the successful interaction evidence above remains mouse/keyboard testing. Device emulation and DevTools were closed, and the two-theme fixture preview restored.

The subsequent homepage positioning changes were integrated through `origin/main` at `1cfe072`. The rebased application commits are `16267a5` and `803895a`. Integration verification again passed: 245 frontend tests, 4 asset graph checks with 1 unavailable historical fixture skipped, 1,783 copy files and 774 internal links. The generated calendar timestamps were restored again. Before approved publication, check for any newer main-branch changes; do not deploy over concurrent work.

The goal remains incomplete: publication confirmation is unanswered, and reliable touch-device interaction evidence is unavailable in this session. Neither is inferred from the passing layout and mouse/keyboard checks. The local implementation and release evidence are preserved while these outstanding conditions are resolved.

## Coordinated density follow-up

The calendar task received a new owner phone screenshot requesting smaller calendar text and less space above the dates. That task is integrating `16267a5` and `803895a`, owns subsequent density changes and publication under its existing authorization, and will return its final commit and acceptance results. This task will not duplicate the deployment or edit those product files concurrently.

The fixture now accepts `height=650` to account for a shorter browser viewport. Read-only checks at 320/390px in both themes found the English chart starts 365/363px below the main content top, exposing only 155/157px of the 400px price canvas in the 520px main area. This is a density defect despite zero horizontal overflow; it was sent to the calendar task for the coordinated fix. At 320×650 in both themes, the More menu fits at y=300–574 with five 48px links; More → Me correctly opens Profile, closes the menu and restores focus to More. These checks remain browser mouse/keyboard evidence.
