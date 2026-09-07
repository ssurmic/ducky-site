# Mobile experience — 2026-09-07

Owner goal: make the existing website comfortable on portrait phones, keep its interactions usable, and verify light and dark appearance. Worktree: `ducky-site-mobile-20260907`.

**Final status: deployed and independently checked.** Production `https://duckybot.app/app/` serves release `797f51f6`, Pages `81dc329f`, app graph `fe4bc95159e9ea2d4bf0`. This goal's changes were integrated with the calendar density work and the concurrent application updates; this local branch is historical evidence, not a newer deploy candidate. The final production receipt is below.

## Changes

- Compact portrait spacing and headings; body text remains readable, inputs use 16px and primary controls have at least a 44px target. The coordinated final calendar uses 18px date numbers, 12px event/weekday labels and 68px minimum quiet-day cards.
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

At this stage the patch was ready for release and awaited confirmation under the repository Safety rule. It was later integrated and published by the calendar task under that task's existing authorization. The local fixture at port8876 was temporary and is closed after acceptance.

## Follow-up before publication

At this stage the live application still excluded the mobile commits. A subsequent Chrome DevTools iPhone 12 Pro preview rendered the portrait radar at 390×844, but the automation connection timed out on DOM inspection/input while device emulation was enabled. Its attempted tap did not establish a successful category interaction. This failed attempt is **not** counted as touch validation. The successful native-input run below resolved that verification gap.

The subsequent homepage positioning changes were integrated through `origin/main` at `1cfe072`. The rebased application commits are `16267a5` and `803895a`. Integration verification again passed: 245 frontend tests, 4 asset graph checks with 1 unavailable historical fixture skipped, 1,783 copy files and 774 internal links. The generated calendar timestamps were restored again. Before approved publication, check for any newer main-branch changes; do not deploy over concurrent work.

Publication and reliable touch evidence were initially outstanding; neither was inferred from passing layout or mouse/keyboard checks. Both were subsequently completed as recorded below.

## Coordinated density follow-up

The calendar task received a new owner phone screenshot requesting smaller calendar text and less space above the dates. That task integrated `16267a5` and `803895a`, owned subsequent density changes and publication under its existing authorization, and returned its final commit and acceptance results. This task performed the independent checks without duplicating deployment or editing those product files concurrently.

The fixture now accepts `height=650` to account for a shorter browser viewport. Read-only checks at 320/390px in both themes found the English chart starts 365/363px below the main content top, exposing only 155/157px of the 400px price canvas in the 520px main area. This is a density defect despite zero horizontal overflow; it was sent to the calendar task for the coordinated fix. At 320×650 in both themes, the More menu fits at y=300–574 with five 48px links; More → Me correctly opens Profile, closes the menu and restores focus to More. These checks remain browser mouse/keyboard evidence.

### Successful touch simulation and chart follow-up

The earlier input limitation was resolved using native Chrome DevTools coordinate clicks/drags instead of browser automation input while device mode was active. A test-only badge in an isolated fixture recorded actual `touchend` events with `navigator.maxTouchPoints=1` and `(pointer:coarse)=true` under the iPhone 12 Pro 390×844 profile. Verified: dark Chinese radar category disclosure, vertical swipes and social-category navigation; More → Profile with menu dismissal and focus restoration; light English and dark Chinese September 7 dialogs opened and closed by touch with focus returned to the original date; light English chart 3M selection; and a vertical swipe starting on the canvas that scrolled the surrounding page to the legend/company context. Device mode and DevTools were disabled afterward. This is Chrome touch emulation, not physical iOS/Android or the Safari engine.

Independent review of the coordinated density work found the RSI pane had collapsed to 25.5px. After the calendar task moved related links below the chart, removed empty symbol-status spacing, and applied all pane proportions after series creation, all four 320/390×650 light/dark checks show chart top 231.26px and visible chart height 288.74px, with no horizontal overflow. Pane heights are price 212.5px, RSI 85px, MACD 70.5px and time axis 28px; period changes and a live inherited light→dark change preserve these sizes and correctly recolor the legend. Pane sizing uses the supported [Lightweight Charts pane interface](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IPaneApi).

## Final production receipt

The current HTML was fetched independently and identifies graph `fe4bc95159e9ea2d4bf0` and `workspace.css?v=797f51f6`. Live workspace CSS and the chart, theme, boards and router modules each match the final density worktree byte for byte. The final integrated release test log `/private/tmp/ducky-density-release-tests.log` was read directly: 276 passed, 0 failed. The deployment owner also reported the separate account-country correction passed its 276-test run before release.

The existing signed-in Chrome session was checked at390×650 with no account or notification writes. Calendar main content is520px high; dates are18px, the first date starts267.8px below the main top, six full date cards are visible and horizontal overflow is0. The September7 holiday dialog is366px wide, fits at y89–561, and has a44px close button. Closing restores the original date focus. More→Profile opens the correct route, closes the menu, restores focus to the summary, and has no main overflow. After refreshing the final country release, a browser-inspection timeout was resolved with the native accessibility view, which showed the account page loaded normally. Temporary browser viewport and device overrides were reset.

The broader density report and explicit remaining layout opportunities are in the deployed worktree's `reports/MOBILE-CALENDAR-DENSITY-2026-09-07.md` and `reports/UI-MOBILE-DENSITY-AUDIT-2026-09-07.md`. Physical Safari/Android, payments and real notification delivery are outside this browser UI acceptance. A separately added Telegram account-link flow has a known OAuth domain-configuration error and remains with the notification/backend tasks; it is not counted as successful end-to-end linking by this report.
