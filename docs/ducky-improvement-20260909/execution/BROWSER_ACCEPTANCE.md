# Browser acceptance · 2026-09-09

All browser interactions used the Codex CUA browser surface. These are browser viewport tests,
not physical iOS/Android or production account tests. All business fetches were replaced by
explicit local fixtures. Fixtures are outside public/ and are not copied into the site build.

## Responsive and visual checks

| Viewport | Language | Actual theme | First record y | Errors | Overflow | Initial reads |
|---|---|---|---:|---:|---:|---:|
| 390×650 | en | light | 334.8px | 0 | 0 | 2 |
| 390×650 | zh | dark | 334.8px | 0 | 0 | 2 |
| 390×650 | zh | light | 334.8px | 0 | 0 | 2 |
| 390×650 | en | dark | 334.8px | 0 | 0 | 2 |
| 320×650 | en | light | 345.2px | 0 | 0 | 2 |
| 320×650 | zh | dark | 334.8px | 0 | 0 | 2 |
| 320×650 | zh | light | 334.8px | 0 | 0 | 2 |
| 320×650 | en | dark | 345.2px | 0 | 0 | 2 |
| 1280×850 | en | light | 360.6px | 0 | 0 | 2 |
| 1280×850 | zh | dark | 360.6px | 0 | 0 | 2 |
| 1280×850 | zh | light | 360.6px | 0 | 0 | 2 |
| 1280×850 | en | dark | 360.6px | 0 | 0 | 2 |

Screenshots: `brief-{en,zh}-{light,dark}-{320,390,1280}.png`; raw DOM-derived measurements:
`browser-matrix.json`. Mobile main content has 520px available at 650px height. Primary controls
are at least 44px high; inputs use 16px text. The first substantive view appears without opening
a disclosure. Long original conditions can extend below the first screen; they remain intact.
Desktop has adjacent record and discussion columns; phone has one content column.
Reduced motion is supported through the route-scoped media rule. Physical pointer/touch and
browser preference toggles were not separately emulated.

## Interactions and failure states

- Search narrowed to two bearish records without new API reads. Source details retained exact excerpt,
  publication/observation/recording clocks and an explicit unknown processing time. Original links
  include exact offset zero; source/history URL construction also has focused regression coverage.
- Leaving the view removed its stylesheet. Returning revalidated data and restored search/detail state.
- Ticker GLW + All accessible research returned three records and three matching overview records.
- Keyboard select-all + Backspace restored the filtered records after clearing text. CUA `fill('')`
  proved a no-op in this session, so an earlier zero-match sample is retained and labelled as a tool
  interaction artifact, not a product filtering failure. See `browser-interactions.json`.
- Normal empty, no watchlist, failed watchlist, complete research failure, and failed next page were
  exercised. A failed next page retained prior records and exposed retry. See `browser-states.json`.
- 100 fixed records made exactly two initial GETs; only 20 cards entered the initial DOM. No card
  performs a remote read. Pagination is explicit and bounded to five 100-study pages.
- Existing calendar, chart, briefing, alerts, creators, boards, profile, evidence and login routes
  opened with no fixture script errors, overflow or Research Brief asset load. Each fixture has only
  bounded sample/empty data; this does not prove live data or real authentication.
  `legacy-route-smoke.json` records the actual requests and resources.
- New original/source/history targets are validated by adapter/router tests. This local synthetic
  harness does not establish successful resolution of real current source pages.

## Five-run performance investigation

The first 15 interleaved baseline/off/on runs had mixed warm cache and conditional revalidation.
All retained runs still show identical old watchlist business requests and no new Brief assets,
but their timing comparison was invalid. A no-store retry on the same origins also inherited
previously cached images. Both raw attempts are retained (`legacy-five-run.json` and
`legacy-five-run-no-cache.json`). The `/tmp` macOS canonical-path fixture issue was fixed before
collecting valid baseline runs; its blank load is excluded.

Final comparison uses two previously unused loopback origins, the same fixture/viewport, no-store
responses and disabled conditional requests. Each side has five measurements. Fonts are shared
by the browser after the first run; that first cold run is retained on both sides. Resource durations
below are the SUM of Resource Timing entries, not page-load latency, LCP, API response time or p95.

| Build | Resource counts | Median summed duration | Slowest summed duration | Warm-run transfer bytes |
|---|---|---:|---:|---:|
| baseline | 37, 35, 35, 35, 35 | 191.9ms | 222.9ms | 3,134,339 |
| after-off | 37, 35, 35, 35, 35 | 201.9ms | 250.7ms | 3,135,105 |

Final median difference is +5.2%; transfer difference is +766 bytes / +0.024%. The first cold
slow sample is +12.5% (+27.8ms summed parallel resource durations), which triggered inspection:
no new request/module was present, added bytes are limited to route/login guards, and subsequent
paired samples vary around the baseline. This small local sample does not establish a production
latency budget; keep the cold slow sample visible and repeat on the deployment target before release.
All five old-page runs use exactly one GET `/watchlist`; no new business or model calls.
`legacy-five-run-fresh-origins.json` retains every sample and resource entry.

The actual default-off generated config, absent nav/CSS and static dependency closure were
separately verified from the real build in `REGRESSION_FINAL.md`, rather than inferred from fixtures.
