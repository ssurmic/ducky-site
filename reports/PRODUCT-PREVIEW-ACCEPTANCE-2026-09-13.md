# Homepage research positioning and current product previews · 2026-09-13

Status: implemented and locally tested; merge and production receipts are recorded in the owner's local handoff after release.

The owner asked to keep “一只股票的所有信号，一页看完”, explain AI aggregation and detailed creator analysis, replace outdated walkthrough posters with the current interface, show bullish and bearish views separately, and remove simulation from the homepage positioning. “Four real screens” and descriptions of what appears after login were explicitly rejected.

## Product behavior

- The original Chinese and English hero headlines remain. The introduction explains aggregation of creator analysis, filings, institutional holdings and insider transactions by stock, with reasoning, source passages and timestamps. Time saving describes fewer searches and context switches; no measured time reduction or unsupported “most complete” claim is asserted.
- Research tools and creator analysis precede historical price outcomes. Creator cards show the attributed analysis first; dated subsequent prices and their original calculation basis remain available on expansion. The existing loss-inclusive historical records remain intact.
- The roster displays the 34 creators verified against the canonical active registry. No additional recorded creator was found; “And more is coming” is a separate future-facing statement, not an inflated coverage count.
- The homepage's fictional portfolio-lab link is replaced with creator analysis. Existing application features and archived research are not deleted.
- Four bilingual, same-origin previews use current application renderers. Tabs, captions and tool-specific actions remain outside each frame. Buttons are not overlaid on a promotional poster.

## Preview data and boundaries

| Preview | Current renderer and permitted input | Behavior |
|---|---|---|
| Research Map | `mapView`, selected NVDA rows already in `public/home-signals.json` | Five source-linked records: two bullish, one bearish, two 13F context records. Desktop places bullish views left and bearish views right; narrow screens stack labeled groups and expose a filter. Original 2026-09-11 close and publication/filing dates remain. No invented approval, acquisition coverage, source hash or creator identity. Sharing is disabled for this limited selection; application sharing remains unchanged. |
| Creator analysis | `renderCreatorPage`, existing `public/examples/video-summary.json` | Wall Street Millennial's 2026-09-04 video, with three attributed summary sections at 0:03, 5:49 and 11:40. These are summaries, not fabricated direct quotations. Original source links remain. |
| Screener | `mountScreen`, explicit `localOnly:true` | Existing editor, presets, field validation, reset and a readable selected-criteria summary. No facets fetch, saved screens, match query, account write, fabricated results or coverage. Opening the application does not transfer the local criteria. Normal application mode defaults to its existing behavior. |
| Market context | `renderMacroBeta`, complete tracked `scripts/demo/recording/macro-beta.json` | Current chart on the approved historical reconstruction through 2026-09-04, observed 2026-09-06. Full sources, dates, reconstruction basis, missingness and loss-inclusive validation remain. This is not current market data or prospective validation. |

The four standalone shells are noindex and excluded from the sitemap. They load no account bootstrap or inference workflow. Build injects only the selected public data; scripts use the existing content-addressed application module graph. CSP adds only `'self'` to `frame-src`, retaining the Telegram rule and existing script restrictions. Source and application links open outside the iframe.

## Validation

- Immediately before PR, the current production source gate confirmed the creator preview is still readable: `source_post` returns ready and reviewed, with the original publication time, matching source hash and the same three full bilingual paragraphs at 3 / 349 / 700 seconds.
- Full JavaScript suite: **750 passed**. Python suite: **22 run, 21 passed, 1 skipped**. Copy and internal-link gates passed.
- Focused regressions cover source/date/stance preservation, unsafe URLs, actual filters and source dialogs, default application sharing, preview sharing suppression, complete historical-market input retention, and a token-present screener preview with zero API or account/storage writes. Existing application screener behavior remains covered.
- Actual Chrome local browser checks: desktop at its default 1728×902; Chinese phone viewport 393×700 and English narrow viewport 320×650. No outer horizontal overflow; preview tabs retain 44-pixel targets. Verified map filtering and source-dialog opening/closing, creator source timestamps, screener preset selection and criteria review, and the dated market chart. The observed appearance was dark; these checks do not assert a physical-device or light-theme test.
- Production HTML, CSP, module availability and the actual live preview are checked after deployment. The prior production UI is `da912b83` (Pages `0bf0ce1c`) and remains the rollback reference.

## Competitive evidence and durable copy rule

See [the dated competitor comparison](PRODUCT-POSITIONING-COMPETITORS-2026-09-13.md). Direct competitors also offer attributed source quotes, timestamps and stock-level aggregation. Ducky's positioning should explain the combined workflow: bilingual creator reasoning and conditions, opposing views, factual context and non-creator disclosures around a stock. Do not claim competitors have only scores, that sources are exclusive to Ducky, or that a finite archive is complete market coverage.

Future homepage copy should name the user's research task and show the actual interface with dated examples. Do not describe the number of screenshots, login mechanics, capture work or deployment plumbing as the product benefit.
