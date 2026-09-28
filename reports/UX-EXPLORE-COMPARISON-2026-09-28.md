# Explore discussion comparison

Date: 2026-09-28. Status: local candidate from frontend `cb0d3405`; not deployed.

## Problem and design decision

The owner rejected the long single-column discussion list: it showed only six companies, repeated
an uninformative overview fallback, and gave every row four equally weighted actions. The integrating
agent's production check at 390 × 700 saw two complete rows and part of a third. The response already
contained more ranked companies; the frontend's six-item cap hid them.

The candidate uses a comparison grid: six columns on a wide desktop, four on a narrower desktop,
and two on phones. It shows the first 12 valid, distinct, source-ranked stocks by default. Show all
appears only if the saved response contains additional rows; it makes no extra request. A stock's
main area opens its research workspace, with lighter Metrics and Map entries beneath it. Company
activity remains reachable through the shared stock workspace and Explore's primary activity link.

The existing visual system stays intact: dark background `#0b0f14`, surface `#121821`, reading text
`#e6edf3` and action orange `#ff9000`, plus the existing light-theme tokens. System sans-serif text
and tabular numerals keep labels and measurements aligned. The design uses one bordered comparison
grid instead of separate decorated cards. Rank indicates the actual source order. Change percentages
use neutral text; rising discussion is not styled as bullish support or a price gain.

The date/source and measurement explanation appear once above the grid. Per-row placeholder prose,
duplicated Overview buttons and the generic research-question introduction are removed. Existing
nonempty summaries remain complete inside one optional disclosure, without truncating conditions or
inventing a fallback. Available company names remain in the link's accessible name and title even
when the compact visual label ellipsizes. The installed Frontend Design skill informed this focused
comparison layout; no new branding, hero or animation was introduced.

## Contract and state preservation

- Existing authenticated GET `/radar/social.json` remains the sole ranking read. No new endpoint,
  follow, producer, model call or per-stock acquisition is added.
- API rank, mention count, previous-day percentage and collection time retain their meanings.
  Actual zero stays zero; missing values show a dash with a named accessible explanation. Attention
  remains separate from bullish/bearish sentiment.
- Existing loading, empty, stale, refresh-failed, access-withdrawn and old-account boundaries remain.
  Withdrawal removes both the tiles and expanded summaries. A failed ordinary refresh retains the
  preceding dated response.
- The typed query, Show all state and summary/feed disclosure state survive the same-account return.
  Account changes clear them. Refresh restores the focused tile or summary link without scrolling.
  The weekly feed remains an explicit, bounded read on expansion.
- The primary tile has an explicit Research ticker accessible name and a description containing both
  measurements. Metric/map actions retain 44px minimum targets; input text remains 16px.

## Validation

- `tests/explore-ux.test.js` plus `tests/product-focus.test.js`: **44 passed, zero failed or skipped**.
  Tests cover source ordering, valid/missing/zero values, default 12, expansion without new reads,
  complete long summaries, hidden controls for short responses, refresh focus, state restoration,
  epoch isolation, denied-source removal and the retained stock/metric/map paths.
- The bilingual build passed using the existing Python 3.12 environment. The default system Python
  lacked Jinja; using the already installed environment resolved the toolchain issue without changing
  repository requirements.
- The loopback fixture case `explore-grid` provides 14 synthetic schema-valid records, a long company
  name, actual zero, missing values and a full qualified summary. It is test-only and is not copied
  into production data. The integrating agent owns the actual 320/390px and desktop browser pass.
- Copy lint passed; all 2,103 internal links passed. Whitespace and module syntax checks passed.
- The integrating agent's Chrome viewport check at **390 × 700** confirmed **six complete stocks**
  in the first screen, with the sixth tile ending at **y=616.74**, above the bottom navigation.
  No horizontal document overflow was observed. At **1728px desktop width**, all 12 default stocks
  were fully visible. These observations used the synthetic loopback fixture; 1440/320px and
  remaining English/light behavior checks continue in the integrating branch.
- No production content, physical-device, live-write or release acceptance is claimed for this
  candidate. The full combined gate belongs to the integrating agent.

Focused log: `/tmp/ducky-explore-compare-focused.log`. Preview:
`http://127.0.0.1:8941/qa-frame?lang=zh&theme=dark&case=explore-grid#/explore`.
Use `lang=en` and `theme=light` for the alternate language/theme. This branch changes Explore only;
the integrating agent's separate Today work is outside this report.
