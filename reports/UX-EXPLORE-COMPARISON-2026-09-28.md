# Explore discussion comparison

Date: 2026-09-28. Status: deployed through PR #109 / Pages `dc10d45f`, production version
`9ab95315` verified at 22:40:24 UTC. Merged source: `9ab9531545fcd3294614318b3b04ff52b499a9be`.
The original isolated candidate was based on frontend `cb0d3405`.

## Problem and design decision

The owner rejected the long single-column discussion list: it showed only six companies, repeated
an uninformative overview fallback, and gave every row four equally weighted actions. The integrating
agent's production check at 390 × 700 saw two complete rows and part of a third. The response already
contained more ranked companies; the frontend's six-item cap hid them.

The implementation uses a comparison grid: six columns on a wide desktop, four on a narrower desktop,
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

## Original isolated validation (before integration)

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
Use `lang=en` and `theme=light` for the alternate language/theme. The original isolated branch changed Explore only; the later combined release includes the
separately documented Today correction.

## Refresh-state follow-up

Read-only review found that expanding or collapsing a retained ranking after an HTTP 503 removed
the refresh-failure notice, even though no new read succeeded. The local presentation render now
leaves read-state notices untouched; only the request flow updates them. The regression starts with
a dated stale ranking, fails a refresh, expands and collapses without another request, verifies the
same failure notice and Retry control remain, then confirms a successful retry clears the failure.
Same-account expansion restoration and account-withdrawal boundaries remain covered by the existing
focused suite. The original 8941 preview service was stopped before combined integration testing.
After this follow-up, the same two focused test files pass **45 tests, zero failed or skipped**;
module syntax and whitespace checks pass. Log: `/tmp/ducky-explore-notice-focused.log`.


## Integrated acceptance (before publication)

The combined Today/Explore candidate passed **831/831 Node tests**, 14 Python export/home
checks, and four app-asset checks (one additional local environment case skipped), bilingual
build, copy lint and 2,103 internal links. The generated calendar export was excluded.

Browser acceptance used Chrome viewport overrides, not a physical phone. Explore showed all
12 default entries at 1440 x 900, six complete entries at 390 x 700 and four complete entries
at 320 x 600; no horizontal overflow was observed. The 14-entry expansion, return to 12,
complete related views and Metrics-to-Explore route were exercised. English/light and
Chinese/dark layouts were inspected.

Today was inspected at 390 x 700 (Chinese/dark), 320 x 600 (English/light) and 1440 x 900
(English/light). The dated September 28 readings precede the September 25 disclosure. The full
saved note, original writing time and original next-session context remain accessible.
Expanding the note, leaving Today and returning preserves expansion. The two review findings
(disclosure restoration and refresh-error preservation during local ranking expansion) are
fixed and covered by regressions.

The fixed-date browser data was synthetic and had no production API connection. This
pre-publication check did not claim deployment or live-source acceptance. The subsequent receipt
below records those separate observations; no producer schedule or backend write changed.

## Production release receipt

Released through [PR #109](https://github.com/ssurmic/ducky-site/pull/109), merged at
2026-09-28 22:39:29 UTC as `9ab9531545fcd3294614318b3b04ff52b499a9be`.
The publisher reran **831 Node tests**, **14 Python tests**, bilingual build, copy lint
(**4,104 files**) and **2,103 internal links**, all passing, before publishing
[Pages `dc10d45f`](https://dc10d45f.ducky-site.pages.dev). Production `VERSION=9ab95315`
and CSP were verified at **22:40:24 UTC**. The first edge read still returned the prior version;
the second confirmed the new version. The hosted PR check had passed in 1m41s.

Authenticated production browser reads at **22:40–22:43 UTC** used Chinese/dark. At
**1440 × 900**, all 12 default companies were complete. The Show all button indicated **100**
available stocks; expanding those production rows was not exercised. The 14-row expansion and
return to 12 described above used the local synthetic fixture. At **390 × 700**, six complete
companies fit above navigation: the sixth tile ended at
**y=643.74**, before the navigation at **y=647**. No horizontal document overflow was observed.
Explore → MU Metrics → Explore returned successfully. MU option walls, price range and IV/HV
were readable, while the six summary metrics above remained dashes. That missing-data boundary
is retained; readable snapshot sections do not certify full metric coverage.

This scoped acceptance used desktop-browser viewport overrides, not physical devices. It did
not perform account writes, alert activation, notification sends, producer activation or model
requests. Source semantic fidelity and completeness remain separate from successful rendering.
The previous `7fb28406` deployment remains the rollback reference; this receipt adds no backend
release claim. Documentation-only follow-ups do not require another runtime deployment.
