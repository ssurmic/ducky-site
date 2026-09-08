# Chart reference help and saved quote timing — 2026-09-08

Call wall, Put wall and Gamma flip now have a small visible question mark beside their labels in the right reference rail. The whole label is a keyboard-accessible, at least 44px-high button; the explanation opens in the existing focus-managed dialog. The current selected expiry is shown, with definitions, possible support/resistance role reversal, gamma hedging behavior, conditional expiry pinning and data/source disclosures. Sources link to OIC, CME and SpotGamma education. Gamma flip is explicitly distinct from a prediction of share-price reversal. No new API request or option calculation occurs on help, disclosure, theme or zoom interactions.

A saved provider quote is not called a verified close. A present price with missing/invalid timing remains visible with “Price time needs checking”; truly absent/nonpositive/nonfinite prices remain unavailable. The source note distinguishes quote time from Ducky's recording time. The backend companion fixes the 16:00–16:30 regular-close interval and early-close equivalent without changing finalized daily-bar boundaries.

The empty chart route now uses a compact stock-chart heading, a shorter search placeholder and a consistent watchlist grid. Tickers omit the decorative dollar prefix. All 50 fixture stocks remain reachable; company/business autocomplete and chart routes retain the existing behavior. This entry change was coordinated with the UI owner, including their explicit-ticker creator-link repair `25aa39c`.

## Validation

- Full integrated build/JS suite: **432 passed**.
- Python asset tests: **7 passed, 1 optional skipped** (using the project's dependency environment). System Python lacked Jinja2, so that environment error was corrected before acceptance.
- Copy and local-link checks run against the built artifact.
- Real browser, synthetic local data: chart render at 320/390/900/1200px × English/Chinese × light/dark = **16 layouts**, all with five painted series, no application horizontal overflow and no console errors.
- Interaction checks: 320px English/light, 390px Chinese/dark, 1200px English/dark. Call/Put/Gamma help opens, selected monthly expiry propagates, expansion shows break/pinning explanations, close works; zoom in/out/reset preserve chart behavior. Automated interaction test also checks Escape/focus restoration and no additional fetches.
- Empty route at 393px Chinese/dark: 50 distinct stock links, 48px-high targets, no horizontal overflow. Desktop rendering and live acceptance are recorded below when complete.

Artifacts in `chart-help-20260908/` contain synthetic fixtures and layout metrics only. No production paid data or account credentials are included. Production publication and real-page verification remain separate from these local checks.
