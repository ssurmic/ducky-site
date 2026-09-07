# Calendar two-week default and event categories: independent UI QA

QA completed 2026-09-07 UTC against the current source in `ducky-site-two-week-2026-09-06` (base `a1efb33`; final build identified by the implementation agent as `38f8310528d6ea9bf090`). No remaining blocker was found within the coverage below. This is Chrome responsive browser QA, **not a physical iPhone/Safari or Telegram WebView test**.

## Method and fixture provenance

- Used actual current `calendar.js`, `calendar-event.js`, router, bilingual strings and app/site CSS, served live from this worktree. A loopback-only harness at port 8865 substituted API responses and an in-memory viewer/watchlist. It set no authentication token and wrote no online preferences.
- Frozen fixture clock: `2026-09-07T16:00:00Z`. Twelve explicitly synthetic events cover a full-day closure, early close at 13:00 ET, CPI, FOMC, an unconfirmed-time speech, before/after/unconfirmed earnings, OPEX, quadruple witching, and S&P/month-end rebalances. These dates and descriptions are display tests, not claims about the real market calendar.
- NVDA was the sole watched ticker; AMD was a synthetic related issuer and MSFT an unrelated issuer. Calendar research returned local relation data, empty historical samples and no matching prediction market.
- Loopback fetch interception rejects external business requests and all non-GET requests. Recorded mutation count remained zero. Fixture helpers stay in `/tmp`; they are not part of the product or deployment.
- Light/dark iframe color schemes exercise actual `prefers-color-scheme` inheritance. Every measured frame reported `data-theme` absent, including light mode. This avoids masking natural-browser light-mode bugs with a forced theme attribute.
- Inspected real browser screenshots, rendered DOM, computed styles and element bounds. Overflow checks cover visible calendar descendants against the frame width; intentional seasonality/table scroll containers are excluded.

## Coverage and result

| Check | Coverage | Result |
| --- | --- | --- |
| Default layout | zh/en × light/dark × 320/390/1280 CSS px (12 combinations) | Two weeks selected; 14 dates; current date selected; no horizontal clipping detected; no untranslated category keys, `null` or `undefined` text |
| Refresh and leave/re-enter | English 320 light; switch to Agenda, reload; switch to Agenda, leave through actual router to watchlist, return | Both start again at two weeks with 14 dates |
| Date and period selection | English 320 light | Month → next month selects Oct 1 and shows Oct 1 details; switching to two weeks keeps Oct 1 visible/selected; next period selects Oct 11 and shows its details; Today returns Sep 7 in Sep 6–19 range |
| Category labels and narrow cards | English 320/390 light; Chinese 320 dark; default matrix previews | Text labels, tinted backgrounds and side marks readable; icon/category bounds do not overlap after fix; titles still visible |
| Calendar/list switching | English 320 light; Chinese 320 dark | Agenda shows all 12 fixture events; Chinese list includes 10 brief impacts plus the two session-specific explanations |
| Dense day and short names | September 8 plus other fixture dates | Two previews and “+2” preserve access to all four events in details; closure, early-close, CPI, NVDA, OPEX, Quad, S&P, FOMC and month-end short names render without page overflow |
| Watchlist filtering | English 320 light, Earnings + My watchlist | NVDA and related AMD remain; unrelated MSFT and CPI are removed; unknown-time wording remains; early-close session notice remains accessible under the filter |
| Expanded research | English 320 light, CPI | One default impact brief, zero duplicate expanded hint blocks; no `null`/`undefined`; local relation and missing prediction/history states render; requests rise from 0 to 1 only after expansion |
| Empty feed | English 320 light and 390 dark | Two-week shell retains 14 dates; zero event cards; source-coverage warning explains an empty date is not evidence of no events; no clipping or invalid text |
| API unavailable | Chinese 320 light and 390 dark, fixture HTTP 503 plus empty fallback | Visible source-unavailable warning; no fabricated events; 14-date shell remains usable; no clipping or invalid text |

## Measured category text contrast

WCAG sRGB contrast was calculated from computed foreground and the rendered 8% category tint on the surface. Each measured category exceeds 4.5:1 for small text. Light and dark values are deliberately different.

| Category | Natural light | Natural dark |
| --- | ---: | ---: |
| Session | 5.90:1 | 11.15:1 |
| Macro | 5.68:1 | 9.27:1 |
| Earnings | 6.47:1 | 7.95:1 |
| Expiry | 6.60:1 | 8.11:1 |
| Rebalance | 6.09:1 | 9.14:1 |

The minimum measured ratio is 5.68:1 in light and 7.95:1 in dark. This is a focused category-text measurement, not a claim that every control in the application was contrast-audited in this pass.

## Problems found and retested

1. Two-week paging previously changed the displayed range while leaving details on an out-of-range date. The implementation now selects the new period start; verified with Oct 11 after paging.
2. On narrow screens the absolutely positioned event icon covered the first letters of category labels. The implementation reserves horizontal/vertical room for the label; English 320/390 light and Chinese 320 dark now show full labels with nonintersecting bounds.
3. Month paging previously left selected details in the old month, and returning to two weeks could leave selection outside its range. The implementation now synchronizes month selection and aligns mode ranges to the selection; the Oct 1 sequence above passes.

This QA agent changed no product source. The implementation agent owns the fixes and automated/build validation.

## Limits

Production authentication, real backend response correctness, physical Safari, Telegram custom palettes, keyboard/screen-reader accessibility, and an exhaustive historical/earnings table matrix were not tested in this pass. The fallback “Other event” category was not instantiated by this fixture. Default-layout coverage is the full 12-combination matrix; interactive and error-state coverage is the specific subset listed above, not every permutation. The source-unavailable warning also appears for an entirely empty synthetic feed, so that check establishes safe presentation rather than distinguishing a verified empty coverage interval from an incomplete one.
