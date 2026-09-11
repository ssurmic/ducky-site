# Saved YTD after a missing close update · 2026-09-10

Status: deployed; exact CI and browser acceptance complete for this change.

YTD now renders the backend's explicitly retained same-session calculation with
Saved return / 上次计算 and its original session. Expand metric details
for the original saved time and a concise explanation. Retained YTD remains sortable
along with zero and losses; unrelated stale/unknown metrics remain last. There is
no new request, inference, store or synthetic price. Research validity is unchanged.

Backend contract and read-only real-data audit:
https://github.com/ssurmic/ducky-bot/blob/codex/creator-history-scope-20260910/reports/YTD-EMPTY-CLOSE-2026-09-10.md

Local tests after merging current main: 667 passed, including independent English/Chinese module renders,
original clocks and retained sorting. Exact merged checks, Pages release and browser
acceptance are recorded below. This change does not establish
complete provider coverage or all-summary semantic quality.

Narrow-column visual review shortened English to Saved return and gives the original
session its own unbroken line. The CSS change is presentation only.

## Release and acceptance

PR 34 / main `0cd9fa23db369213b24099dc31ce9579098c78f0` / Pages `2811c752` /
app graph `cbf27fb06405291137d5`. PR CI `34555547008` and exact main CI
`34555709510` passed. Local 667 tests, copy checks and 1,878 links passed.
The release manifest, changed JS and CSS byte-match production. EN/ZH HTML matches
after removing the existing Cloudflare edge-injected Insights beacon; raw HTML
byte equality is not claimed. [Asset receipt](ytd-retention-20260910/pages-verification.json).

Signed-in production EN and ZH watchlists retained all 48 existing subscriptions:
List first/default, Overview second and five navigation entries. The 9/10 closes
were NVDA $218.36 and GOOGL $332.60; YTD displayed +17.4% and +6.5%. These are dated
acceptance observations. YTD header clicks sorted descending; refresh preserved the
original NVDA summary and analysis date. No watchlist mutations were needed.
The normal provider timer had recovered valid data before release, so live YTD was
ready (60 of 62 globally watched stocks); the two missing year-end anchors were
CBRS/HONA. This must not be attributed to retained values from the new code.

A separately labeled synthetic preview exercised 393px phone and 1100px desktop,
EN/light and ZH/dark. It confirmed compact labels, unbroken dates and phone sorting
of positive, zero and negative saved returns. These were browser viewports, not
physical iPhones. No failed state was injected into production, and cold first-load
latency was not measured. Existing English-default/SEO changes remain in this release.

Backend runtime `a6553595` passed exact CI (5,216 tests / 7 skips, ALL GREEN,
HTTP 13/13); API and 74/74 timers were healthy after release. This development
conversation is not the production scheduler. Full content semantic quality and
multi-session quote freshness remain separate open acceptance items.
