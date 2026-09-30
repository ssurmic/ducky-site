# Creator shelves and signed numerical changes

Status: implemented and locally validated; publication is recorded separately in the shared private handoff. This report concerns presentation only.

## What changes

Following and selected-author pages show up to twelve recent view previews in groups of four: four columns on desktop, two rows of two on phones. Explicit previous/next controls, position and native horizontal scrolling replace the former one-view-per-author default. The full author archive remains directly available. Stable source IDs preserve the reading page after refresh; no autoplay or additional per-author history request is introduced.

Preview cards retain ticker, stance, date, speaker attribution, qualification cues and repeated-record counts. Opening a card retains the complete claim, conditions, horizon, original dated records and source-video navigation. Opposed views and different conditions stay separate. Native video paraphrases retain their existing capability and do not become transcript evidence. Discover uses the actual existing one-view-per-author response in compact columns; it does not invent additional views or request every author's archive.

Structured changes use the shared numeric renderer: increase green, decrease red, zero/missing neutral, with signs retained. This covers attention rankings in Today/Explore/first-use Watchlist, social histories, calendar surprises, seasonality, stock/disclosure comparisons, research returns and macro comparison text. Attention change is not sentiment; yield increases and economic surprises are not automatically good news. Free-form source prose is not scanned or recolored.

The existing lime ticker identity, orange actions, positive/negative stance panels and both theme palettes remain. Phone reading text is 13px; source and page actions retain explicit labels. Full sources are one tap away.

## Research and design decision

[NN/g mobile carousel research](https://www.nngroup.com/articles/mobile-carousels/) describes the cost of sequential access and the need for clear controls and short sequences. The [Apple News guide](https://support.apple.com/en-euro/guide/iphone/iph0a16d1e29/ios) and [Robinhood news description](https://robinhood.com/us/en/newsroom/bringing-you-better-news/) inform source/topic grouping and relevance to watched stocks. Four previews per page is Ducky's tested design decision, not a claim that those apps use this layout. See [the initial plan](CREATOR-RAILS-PLAN-2026-09-29.md).

## Verification

- Complete frontend Node suite: **968 passed**, zero failed. The first full run exposed nine tests bound to the old one-preview/full-inline layout and one lost existing signal style class. Tests now exercise the compact preview → full source flow without weakening source, qualification, membership or read-boundary checks; the signal class was retained.
- Sixteen added cases cover numerical direction/zero/missing and rail identity, full source/repeat clocks, guest attribution, permission withdrawal, modal ownership, focus and no extra Following history reads. Independent review caught and fixed missing Discover reading keys, an unrelated-modal ownership issue, revoked-source focus loss and omitted guest attribution.
- Build, bilingual key parity, Python release checks, copy and internal link checks passed. Exact receipts belong to the candidate/release entry in the shared handoff.
- Real Chrome viewport simulation: EN/ZH × light/dark at 320×600 and 390×700, legacy shelves and native author shelves. No document horizontal overflow. At 390×700 the legacy first four cards end at y608 (ZH) / y623 (EN), before bottom navigation y647; author heading begins around y220. At 320×600, long EN sources require a short vertical scroll to see the second row in full; four fully readable cards are not claimed above the fold at that size.
- Desktop 1440×900: four cards share one row, each about 272.5px wide. Native author cards, discovery columns and full-source dialogs were inspected separately. Next-page → source modal → close restored page 2 and the original trigger. Opposed green/red lanes and explicit conditions remain visible.
- Phone route sweep included populated Watchlist, briefs, chart, Calendar, updates/alerts and profile/billing. Route aliases retain their existing destination. Numeric Explore reads showed +35% green, -10% red and missing neutral; theme-aware colors are retained.

Scope limits: synthetic fixture records are isolated from production. Viewport simulation is not physical-device or touch-gesture acceptance. No backend schema, model, worker, source data, notification or financial-scoring changes are made. Rendering a source does not certify its semantic accuracy or prove video delivery latency.
