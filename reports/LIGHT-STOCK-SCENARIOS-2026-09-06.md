# Stock lookup light-mode scenario audit — 2026-09-06

Independent QA worktree: `/Users/zizhaozhang/dev/ducky-site-stock-scenarios-2026-09-06`, base `d0824785b2b34c920e06dd312310bb7c809ac7bc`. Browser actions used CUA Chrome, dedicated tab and localhost port 8841. No account changes, external messages, or deploys. The final retest imported only the parent's revised `public/css/site.css` and `public/js/home-demo.js`; those copies are not this report's proposed production changes.

## Findings and verified fixes

1. **Long company names clipped beyond the card and viewport.** On the original build, a synthetic unbroken `issuer_name` made `.demo-record h3` scroll width 2,056 px inside a 308 px content area at a real 390 px viewport (238 px at 320). Paragraphs already wrapped. Reproduce `/auto/light/en/long/`, then **View records**. Parent added `overflow-wrap:anywhere` to the heading. Final checks found no heading overflow in either language at 320, 390, 430 or 1440 px.
2. **Market preview could silently show no evidence.** A response with a nonempty evidence array but missing source URLs displayed Updated, topic chips and the sample note, with no headline or unavailable message. Reproduce `/auto/light/en/missing/`, then **View headlines**. Stock records correctly labeled missing sources. Parent now filters valid evidence before choosing the ready state and slicing. Final checks display **No recent news preview is available.** / **暂无可展示的近期新闻资料。** in all eight language/width combinations.
3. **Parent's focus and light palette changes independently verified.** At 390 px, keyboard Tab from the input focused View records with `:focus-visible=true`, 2 px solid `rgb(181, 71, 0)` outline and 2 px offset. Sampled stock section text contrast improved from a minimum 4.82:1 to **5.19:1**; no sampled text pair below 4.5:1 remained.

## Final matrix

All data-bearing scenarios below use **explicit synthetic fixtures**, never live production records. No fixture is copied into `dist/`; the local-only harness at `/Users/zizhaozhang/dev/ducky-site-stock-scenarios-2026-09-06/reports/qa-stock-scenarios/server.py` injects only local response content and is intentionally excluded from the production report copy. Examples are labeled SYNTHETIC QA FIXTURE / 测试数据.

| State | zh widths | en widths | Final result |
|---|---|---|---|
| Ready before a lookup | 320 / 390 / 430 / 1440 | 320 / 390 / 430 / 1440 | Readable input, examples and initial status |
| Three stock records | Same four | Same four | Dates, source links and action links readable; no overflow |
| Market results | Same four | Same four | Headlines, topics and date readable |
| Empty stock / market data | Same four | Same four | Explicit empty state; no misleading zero-price substitute |
| HTTP 503 | Same four | Same four | Explicit unavailable state; action controls remain present |
| Missing source URLs | Same four | Same four | Stock missing-source labels; market unavailable state |
| Stale market response | Same four | Same four | Older source snapshot label retained |
| Long company name / summary / headline | Same four | Same four | Fixed title wraps; paragraphs and headlines remain inside cards |

**64 final state/language/width observations**, all with actual child viewport widths verified, natural light preference `matchMedia('(prefers-color-scheme:light)').matches === true`, and no `data-theme` attribute. The local parent iframe uses `color-scheme:light`, allowing the child's normal CSS media query behavior to run. This is separate from the initially checked explicit `[data-theme=light]` route.

Additional exercised interactions:

- **Loading at 390 px, English:** a delayed response displays Loading records…; no old results remain.
- **Rapid NVDA → ORCL:** delayed NVDA (12 s) followed by ORCL (1 s) ends with three ORCL records and all four action links pointing to ORCL after the older response time has passed.
- **Editing during a pending response:** type GLW while NVDA is pending; ready text remains, with zero result cards and no action links after the old response would have returned.
- **Automatic dark control, zh 390 px:** no `data-theme`, dark preference, black surfaces and readable records; sampled minimum contrast 7.40:1. Parent changes do not alter dark palette values.
- **Keyboard focus:** final light-mode button outline visibly distinct at 390 px, as detailed above.

## Evidence

- [Original long-title clipping](qa-stock-scenarios/en-auto-light-390-long-failure.png)
- [Long-title fix](qa-stock-scenarios/en-auto-light-390-long-fixed.png)
- [Final Chinese mobile results](qa-stock-scenarios/zh-auto-light-390-final-results.png)
- [Final Chinese mobile keyboard focus](qa-stock-scenarios/zh-auto-light-390-final-focus.png)
- [Loading state](qa-stock-scenarios/en-auto-light-390-loading.png)
- [Dark control](qa-stock-scenarios/zh-auto-dark-390-control.png)
- [Desktop layout before the final minor palette change](qa-stock-scenarios/en-auto-light-1440-results-market.png)
- [Detailed final 430 px observations](qa-stock-scenarios/final-430.json), [1440 px observations](qa-stock-scenarios/final-1440.json), [complete matrix summary](qa-stock-scenarios/matrix-summary.json)

The 320/390 final batch completed and returned all 32 result rows with no failures; its in-memory row detail was lost in a later browser-run timeout. Their observed totals and minimum contrast are preserved in the summary. The subsequent 430/1440 retest saves full row detail to disk after each width. No interrupted or wrong-width attempts are counted in the final matrix.

## Limits and reproduction

This is Chrome responsive rendering, **not iOS Safari or a physical iPhone test**. No claim is made about iOS input zoom, virtual keyboard, browser chrome, OS theme transitions or accessibility assistive technology. Contrast is measured on rendered stock-section text against its nearest opaque CSS background; focus was visually inspected separately. Screenshots inspect selected key views, not every scroll position in all 64 combinations. This agent's data-state matrix is synthetic; the parent's separate production checks establish live behavior.

No remaining failure was observed in the scoped final matrix. The deliberately extreme issuer name produces a tall card after wrapping, with all text retained.

Build and start the local-only harness from the independent QA worktree named above:

```sh
/Users/zizhaozhang/dev/ducky-bot/.venv/bin/python build.py
python3 reports/qa-stock-scenarios/server.py
```

Navigate to `http://localhost:8841/auto/light/zh/normal/` or `/auto/light/en/{empty,error,missing,stale,long,slow}/`. Set the browser's explicit viewport and confirm the child `innerWidth`; changing a different active tab's viewport is not evidence for this page. The automatic dark route is `/auto/dark/zh/normal/`. Reset viewport overrides after testing.
