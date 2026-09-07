# App light-mode UI audit — 2026-09-06

Base: `origin/main` at `d0824785b2b34c920e06dd312310bb7c809ac7bc`.
Scope: `/app/` CSS, with light mode as the primary case and dark mode as a control. The homepage audit and shared `site.css` changes are handled separately.

## Findings and fixes

1. **Brand orange was used as small text on white surfaces.** Company evidence disclosures, calendar filters and closure labels, event/research disclosures, selected controls and other app selectors used `--accent` (`#ff9000`). This color has 2.27:1 contrast on white. App text now uses the shared `--accent-text` token; the corresponding light value `#b54700` has 5.43:1 on white and 4.81:1 on the darker light background `#f3f1ea`. Button fills and decorative brand surfaces still use `--accent`. Focus outlines and focused input borders use `--focus-ring`.
2. **Natural browser light mode missed the macro and seasonal chart palettes.** `tg.js` only sets `data-theme` in Telegram. The original light overrides for `.macro-beta`, `.season-spy` and `.season-qqq` required that attribute. Added guarded `prefers-color-scheme: light` rules, retaining explicit dark precedence. Browser-computed natural-light colors are macro green `#147443`, macro blue `#345da6`, seasonal SPY `#945000`, seasonal QQQ `#255ca4`; their white-surface contrasts are 5.82, 6.44, 6.16 and 6.68:1 respectively.
3. **The English Pelosi history button clipped at 320 px, in both themes.** Its text inherited the generic button's no-wrap behavior. It now wraps within `max-width:100%`. Browser bounds checks no longer report this overflow, and the full label is visible.
4. **The nine-item desktop navigation clipped Billing at 900 px.** Measured client width 866 px versus scroll width 925 px. The app now retains the compact navigation with More below 1000 px. Recheck: 900 px navigation client/scroll = 900/900 with More visible; 1000 px = 840/840 and 1280 px = 930/930 with all desktop destinations visible.
5. The explicit app light palette now agrees with shared light foreground changes: green `#187b35`, orange `#b54700`, yellow `#8c5b00`. Dark palette values are unchanged.

The component audit also confirmed that shared `.warn` was `#f0b429` on white (1.86:1); this was reported to the parent for its `site.css` fix. `.cr-call` is already overridden by app.css to `--surface-2` plus `--text`, and did not need an app change.

## Browser method and data provenance

Actual Chrome rendering was controlled through CUA. A loopback-only server on `127.0.0.1:8863` loaded the real app HTML shell, CSS and source view modules in 320 and 390 px iframe viewports. Each width had a light and dark frame. The iframe's inherited `color-scheme` produces actual `prefers-color-scheme` matches: the visible audit readout reported light=true with **no `data-theme` attribute** in natural-light frames, and light=false in dark frames. This deliberately avoids hiding the natural-theme bug behind an explicit attribute.

The local harness mounted actual login/register/watchlist/calendar/radar view modules. It used synthetic in-memory profile/watchlist/snapshot/radar values labelled LOCAL FIXTURE, not any real account, token, user's saved session or production API response. All fixture API non-GET requests returned 403. Calendar used the repository's dated static calendar/seasonality artifacts, while the simulated API calendar contribution was empty. No purchase, registration, notification or real account mutation was performed. The harness and fixtures are outside the repository and are not part of the commit or release.

During agent-local verification, the shared semantic colors being added by the parent were previewed in a local-only stylesheet (`--accent-text`, `--focus-ring`, green/orange). Integration must retain the corresponding actual `site.css` changes. This report does not claim a production deployment.

## Coverage actually exercised

| Surface | Scenarios | Evidence |
|---|---|---|
| Login | Chinese and English, 320/390 px, natural light and dark | Chinese screenshot inspection; bilingual DOM/layout checks. Labels, Google control, method tabs and fields present/readable; no account submitted. |
| Register | Chinese and English, same mobile matrix | English screenshot inspection; bilingual DOM/layout checks. Fields and button remain within cards. |
| Watchlist | Loaded synthetic snapshots, empty list, pending snapshots, failed list; both languages | Loaded English and pending Chinese/error English screenshot inspection; complementary language/empty DOM checks. Long metric labels and values wrap. English 320 px metric grids have client width = scroll width = 256 px. |
| Radar | Loaded archive, empty archive, pending archive and unavailable archive | English loaded/expanded screenshot inspection, Chinese loaded and empty/pending/error DOM checks. Expanded synthetic record retains `+2.0%`, `-8.0%` and missing `—` across +1/+5/+20 periods. |
| Calendar | Chinese and English static fallback; Chinese holiday/closure state and seasonal overview | Chinese screenshots and English DOM/layout checks. Closure text and filter disclosures use readable light text; partial-source state remains explicit. |
| Semantic components | Macro/seasonal legends, gain/loss, source disclosure, input, unavailable box and billing warning class | Real computed colors plus screenshots at 320/390 px, light/dark. This is component coverage, not a live billing workflow. |
| Tablet/desktop | English Radar at 900, 1000 and 1280 px | Navigation bounds measurements; 900-before and 1280-after screenshots. |

The DOM overflow check inspects rendered view descendants outside the viewport, excluding intentionally scrollable radar categories and seasonal bar collections. After fixes it reported no unexpected view overflow in the checked 320 px cases. This is not a claim that every hidden disclosure, interaction or entire app route was tested.

## Validation

- `build.py`: passed.
- `scripts/lint_copy.py`: passed, 0 banned copy/brand/implementation findings.
- `node --test tests/app.test.js tests/radar.test.js tests/calendar-features.test.js`: **34 passed, 0 failed**.
- `git diff --check`: passed.
- No new data/algorithm behavior, API contract or production authentication code was changed.

## Limits

No physical iPhone/Safari, Telegram client's custom palette, browser zoom, checkout, profile mutation, real authentication or full app end-to-end audit was performed. The iframe harness exercises CSS viewport widths and native browser theme media queries, not device emulation. Login errors/registration submissions and actual calendar research API loading were not part of this agent's checks. The integrating agent owns shared-theme regression tests and final site/deployment verification.
