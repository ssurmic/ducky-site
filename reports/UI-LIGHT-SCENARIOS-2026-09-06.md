# Light-mode scenario audit — 2026-09-06

The owner confirmed that the phone screenshot's dark appearance was acceptable
and requested agents to test varied UI scenarios, especially the white/light
appearance. Three independent agents audited stock lookup states, public pages,
and the App. The parent verified integration, keyboard focus and glossary UI.

## Fixes

- Kept bright orange for brand/button fills; added theme-aware foreground and
  focus colors. Light mode now has darker orange, green and yellow text that
  remains readable on the page, white cards and tinted surfaces.
- Corrected homepage step numbers, emphasized navigation, glossary markers and
  the glossary's example label. The latter was pale green on white; its contrast
  is now 5.35:1. Keyboard focus around the stock action now uses a visible dark
  orange outline in light mode.
- Long stock issuer names wrap inside the result card. Market responses with no
  usable source links show the existing unavailable-content explanation instead
  of an update timestamp and topic labels without headlines. A valid later
  headline is not lost because earlier entries have unusable links.
- App disclosures, status labels and highlighted text use the readable foreground
  token. Seasonality and macro colors now handle automatic browser light mode
  without requiring an explicit `data-theme` attribute.
- The long English radar action wraps at 320px. The full nine-item desktop App
  navigation starts at 1000px so tablet widths retain the compact More menu.

## Evidence and scope

- [Public-page audit](LIGHT-PUBLIC-AUDIT-2026-09-06.md): four routes × two
  languages × 320/390px × light/dark = 32 mobile combinations, plus four desktop
  light samples and automatic-light verification. All final sampled text/layout
  checks passed. Examples: orange step text 2.27→5.43:1, green opened-state badge
  4.07→4.82:1. Details, FAQ, pricing, tables and chart controls were exercised.
- Stock and App agents use explicitly synthetic, local-only state fixtures for
  scenarios that should not be triggered against real accounts. Reports identify
  each matrix and its limits. The harnesses are not part of the deployed site.
- The parent loaded three real public NVDA records in Chinese at 390px after
  the CSS/state changes. [Light phone screenshot](ui-light-scenarios-2026-09-06/zh-light-stock-390.png).
- These are Chrome responsive/browser tests. There is no claim of physical iOS
  Safari/Android coverage, payment completion or notification delivery.

No research values, strategies, entitlements or backend data are changed.

## Final validation

- [Stock-state audit](LIGHT-STOCK-SCENARIOS-2026-09-06.md): 64 final observations
  across Chinese/English, actual 320/390/430/1440px widths and eight states.
  Sampled text contrast and scoped overflow checks pass; loading, rapid ticker
  replacement, edit/cancel, dark control and keyboard focus were checked too.
  The report distinguishes durable JSON evidence from tool-observation records.
- [App audit](LIGHT-APP-AUDIT-2026-09-06.md): actual view modules with local
  fixtures for login/register/watchlist/radar/calendar and semantic components,
  natural light/dark phone widths, plus 900/1000/1280px navigation checks.
- Final integrated suite: **198 passed**. Module-graph tests: **4 passed,
  1 optional skipped**. Build: **20 pages**. Copy lint: **1,593 files**.
  Internal links: **728**, no warnings. Backend selftest: ALL GREEN,
  including **783 pytest tests**.
- The eight semantic light foreground colors also pass 4.5:1 against all four
  standard light surfaces: **32 pairs**, minimum **4.594:1**.
  [Palette calculations](ui-light-scenarios-2026-09-06/palette-contrast.json)
  supplement actual browser checks; they do not substitute for them.

## Production verification

Published source `8e2984ad`, Cloudflare Pages `42a97277`. Both homepage languages
and both App shells reference the new version. The live `site.css`, `app.css`,
`radar.css` and `home-demo.js` match the committed files byte for byte. A live
390px Chrome check loaded three public NVDA records with no horizontal overflow
in the browser's dark preference. Light-mode evidence is the automatic/explicit
local browser matrix above; no OS setting or private account was changed.
