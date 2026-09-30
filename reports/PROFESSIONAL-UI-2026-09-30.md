# Professional reading system and persistent navigation · 2026-09-30

Status: local acceptance passed; release verification pending. Base: frontend `5cb29008`.
The owner authorized this deeper UI/UX pass, installed skill, mandatory phone/desktop ×
dark/light acceptance and frontend publication. This follows the earlier density release.

## Result

- One paired slate palette, self-hosted Manrope/platform Chinese fallbacks, consistent
  titles/subtitles, tabular numbers and neutral stock identifiers across application,
  public pages and four embedded public previews. Semantic gain/loss, stance, source
  dates, amounts, unknowns and complete source access retain their existing meaning.
- Four Watchlist choices stay at the top of the existing scrollport; content scrolls
  underneath. Four disclosure categories, stock tabs and Explore destinations also
  remain available. No second vertical scroll window. Each Watchlist view retains its
  own position during the visit, including horizontal table position; a new query
  clears obsolete saved positions. List still opens first, Overview second.
- Desktop navigation choices shrink from 78/88px targets to 64px; phone targets remain
  44px. Input text remains 16px. Fixed stock identity columns and direct map/metric/alert
  access remain. Repair a desktop action-wrap that unnecessarily doubled the action row.
- Quieter panel borders/radii, compact source records, aligned historical-return columns,
  smaller market charts with complete legends/clocks, and compact public introduction
  statistics. Preserve the approved duck and brand orange; no generated investment claims.
- First-load/route-refresh counts now say Loading until a response arrives; failures show
  a read error rather than zero. An actual empty response still reports zero. Existing query,
  account and disposal fences remain intact. Wide data workspaces can use 1640px.
- Indicators now has 14 comparison columns, with no repeated overall/long-term/trend prose.
  Those complete readings remain in List and Overview. Prices, six indicators, five disclosure/
  level columns, market cap, individual clocks, sorting and stock actions remain. Compact rows
  retain financial values and do not replace missing values with zero. Column labels wrap fully.
  Post-release screenshot review found that the inherited one-line badge style still cropped
  net amounts and add/trim counts; the [bounded follow-up](INDICATOR-VALUES-2026-09-30.md)
  repairs that remaining presentation defect.
- English navigation uses Indicators consistently across Watchlist, Stock and Explore. Clarify
  Stock / company, daily change, Support levels, Long-term view and Trend view. Pending/stale
  explanations are plain English without promising that replacement analysis is forthcoming.
- Desktop Insider direction, market-cap chips and search share a compact toolbar; narrower
  desktop layouts put search on the next row. At 1728×903 the first synthetic record begins
  around y=405, with all seven cap choices visible. Mobile keeps its compact arrangement.

[Design rationale and palette](../docs/ux/professional-reading-system.md) records the
UI/UX Pro Max searches, rejected sales-template guidance, adaptations to this stack and
reviewed hierarchy. The skill is installed on the owner's machine; no third-party script,
font service, framework, backend or data calculation was introduced.

## Acceptance

- 995 Node tests; Python 19 cases with one expected skip. The fixture rejection printed
  by the Python tests is intentional validation of malformed homepage statistics.
- Complete application layout matrix: 24 routes × four widths (320/390/820/1440) × two
  languages × two themes: **384 passed**. Public/template matrix: 13 routes × three widths
  × languages × themes: **156 passed**. Follow-up checks of changed routes passed as well;
  visible reading/heading/control text uses the shared Manrope/platform fallback stack.
  Additional wide layouts (1920/2560 × seven routes × languages/themes): **56 passed**;
  phone landscape (844×390 × eight routes × languages/themes): **32 passed**. No page
  overflow or unhandled JavaScript errors in these matrices. Short landscape content remains
  scrollable below persistent categories; it is not claimed to show a record before scrolling.
- New-user and existing workflow suite expanded to both themes: empty membership,
  explicit first-stock add, all four stock tabs, real local candles and timeframe controls,
  chart help/Escape/return, all Watchlist modes, calendar modes/dialog focus/history cohort
  controls, empty creator Following/Discover, invalid profile field and empty Today guidance.
  **444 workflow assertions passed** in 12 width/language/theme combinations. Writes only
  affect in-memory synthetic membership; no production account was created.
- Dedicated long-list tests in 20 viewport/language/theme combinations cover visible initial
  titles, fixed navigation hit targets, view return positions, horizontal scrolling, keyboard
  focus clearance, activity categories and paired semantic-color contrast. Lowest measured
  normal-text contrast across page/surface/raised backgrounds: **4.74:1**. Control boundary
  contrast is checked separately at 3:1.
  The comparison checks also require 14 columns without narrative cells, compact fixture rows,
  readable column headings and all columns fitting the 1920px desktop without horizontal scroll.
- **48 discoverability cases passed**. In the Insider fixture, first-screen record space is
  198.6px at 320×600 and 298.6px at 390×700, after header and primary navigation. The latter
  shows two records. All four choices are visible together and retain 44px phone targets.
- Direct browser inspection covers mobile light company records before/after scrolling,
  desktop dark market overview and phone public navigation. Screenshot artifacts are local,
  with fixture data explicitly labelled synthetic. No physical-device claim.
- Eight browser cases cover clearing an existing search, submitting a ticker before the search
  debounce, and applying direction/cap with pending text. A separate direct keyboard check
  confirmed clearing a keyword removes its URL parameter while retaining the ticker. No
  application workaround was added for an automation tool's ineffective empty-string fill.

## Issues found and resolved during review

A broad palette selector lost to older workspace theme selectors; the obsolete definitions
were removed. An initial negative shadow obscured page titles; sticky offsets now derive
from actual scrollport padding, and initial title visibility is checked. Preserve safe-area
padding in the compact top bar. Locator auto-scrolling can move a sticky button toward its
original document position; the long-list regression uses the actual visible pointer target,
then separately checks keyboard navigation. This distinction does not mask a product failure.

The final density regression caught desktop filter padding overriding the phone rules;
phone padding and date spacing are now explicitly scoped, restoring the measured record
space without reducing tap targets. A delayed-read regression covers initial loading,
route refresh, genuine empty responses and failed filters; stale-response tests still pass.

## Release and rollback

PR [#129](https://github.com/ssurmic/ducky-site/pull/129) merged as
`d4935d8ba92cc5bb6e05abecb9bc48ba87cce6e6`. The official publisher completed deployment
`e6140f5d` and verified canonical `VERSION=d4935d8b` and the expected CSP at
**2026-09-30T07:28:20Z**. It reran all 995 Node tests and checked 2196 links. The
badge-wrapping follow-up has its own candidate and release receipt. Rollback baseline:
`5cb2900841786e9cea0001ab9b5ae76a774e5865`. This is frontend presentation/navigation only;
no backend deployment, migrations, provider calls, notifications or account permissions.
Shared engineering status will be integrated through the already coordinated documentation
workstream, keeping prior release and runtime evidence intact.
