# Chart reference help and saved quote timing — 2026-09-08

Call wall, Put wall and Gamma flip now have a small visible question mark beside their labels in the right reference rail. The whole label is a keyboard-accessible, at least 44px-high button; the explanation opens in the existing focus-managed dialog. The current selected expiry is shown, with definitions, possible support/resistance role reversal, gamma hedging behavior, conditional expiry pinning and data/source disclosures. Sources link to OIC, CME and SpotGamma education. Gamma flip is explicitly distinct from a prediction of share-price reversal. No new API request or option calculation occurs on help, disclosure, theme or zoom interactions.

A saved provider quote is not called a verified close. A present price with missing/invalid timing remains visible with “Price time needs checking”; truly absent/nonpositive/nonfinite prices remain unavailable. The source note distinguishes quote time from Ducky's recording time. The backend companion fixes the 16:00–16:30 regular-close interval and early-close equivalent without changing finalized daily-bar boundaries.

The empty chart route now uses a compact stock-chart heading, a shorter search placeholder and a consistent watchlist grid. Tickers omit the decorative dollar prefix. All 50 fixture stocks remain reachable; company/business autocomplete and chart routes retain the existing behavior. This entry change was coordinated with the UI owner, including their explicit-ticker creator-link repair `25aa39c`.

## Validation

- Full integrated build/JS suite: **437 passed**.
- Python asset tests: **7 passed, 1 optional skipped** (using the project's dependency environment). System Python lacked Jinja2, so that environment error was corrected before acceptance.
- Copy and local-link checks run against the built artifact.
- Real browser, synthetic local data: chart render at 320/390/900/1200px × English/Chinese × light/dark = **16 layouts**, all with five painted series, no application horizontal overflow and no console errors.
- Interaction checks: 320px English/light, 390px Chinese/dark, 1200px English/dark. Call/Put/Gamma help opens, selected monthly expiry propagates, expansion shows break/pinning explanations, close works; zoom in/out/reset preserve chart behavior. Automated interaction test also checks Escape/focus restoration and no additional fetches.
- Empty route at 393px Chinese/dark: 50 distinct stock links, 48px-high targets, no horizontal overflow. The same 50-symbol entry also renders at desktop width; live acceptance is recorded below.

Artifacts in `chart-help-20260908/` contain synthetic fixtures and layout metrics only. No production paid data or account credentials are included. Production evidence below is separate from these synthetic local checks.


## Production acceptance

- Deployed frontend `666ee9ffa0c9ce72616d4b9726f0928ee788c2cf` to Cloudflare Pages deployment `41cfa73e`; exact-head CI run `34276253044` succeeded. Production HTML reported `666ee9ff` and app graph `1433ae2b8888f7714da0`. The three deployed chart/help/quote JavaScript files matched the built files byte-for-byte.
- Real authenticated production browser at measured 393 CSS pixels: no document horizontal overflow, each reference help button 44px high. Call/Put help opened and closed; support/resistance and pinning sections expanded. Selecting the September 18 monthly expiry changed the help scope to that expiry. Render inspected directly.
- COIN information-map price now reads “已记录报价” with its recorded date. Its detail preserves the amount and 20-session range and explains that Ducky recording time does not supply an unknown provider quote time.
- Empty chart route: real NOK autocomplete returned the company and optical/IP/mobile-network classification; choosing it opened the NOK chart successfully. All current watchlist entries remained available. No subscriptions, notifications or watchlist writes were used for this check.
- The chart-to-related-creators route exposed a separate pre-existing asynchronous lookup-restore issue: a restored prior lookup could replace the explicit ticker route with discovery. Exact reproduction was handed to the creator UI owner for their already coordinated follow-up release; it is not claimed as passed by this chart receipt.
- The backend close-epoch correction is included in deployed `da0bcd153ab9029803f118ce91e604dee7a5cc44`, verified by read-only host HEAD. A new paid market feed and the separate monitoring candidate are not part of this frontend release.
