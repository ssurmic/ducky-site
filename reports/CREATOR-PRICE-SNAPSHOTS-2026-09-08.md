# Creator and detection price snapshots — 2026-09-08

Status: frontend published as d498cd66; Pages b618a4d7. Backend 9946396 is live.
Source-specific NKE correction remains a separate unfinished acceptance item.

The owner narrowed creator research to publication time and twenty sessions. The main
card now shows publication reference, latest recorded close with dates, change to date,
reviewed directional stance and any condition. Existing prices remain visible while
the twentieth session is pending. Historical controls and recorded-time selectors are
removed from the main UI; sources and stored timestamps remain under details.

The new backend publication_20 uses the same reference as change to date: the last
completed regular close at publication. Counting starts with the first close strictly
after publication. Existing archived windows are not rewritten. API keyset pages are
loaded explicitly, scoped to the selected creator, with retries and stale-request guards.

The shared component also reads social item.price_snapshot on current cards and history.
Those prices are labeled detection reference and twenty sessions after detection. An
overheated state gets a separate risk badge and does not manufacture bearish sentiment.

Validation: 424 frontend tests passed; focused tests cover pagination, conditional
views, losses/zero, incomplete windows with known prices, stance enums, and detection
versus publication labeling. Actual browser fixture review covered 320/393-pixel English
light mode and Chinese dark mode; prices, dates, stance and conditional text remain
readable. Fixture data is explicitly synthetic. Production acceptance remains pending
backend candidate availability; the earlier stock navigation release is already live.

Final audit correction: an absent price snapshot is awaiting calculation, rather than
automatically labeled missing prices. Known publication time, price coverage and window
maturity are distinct states. The coverage line explicitly counts loaded views only;
it is not a complete creator-history count. A regression loads an older mature losing
view after an uncomputed first page and verifies that both remain visible. Focused
creator UI tests: 9 passed. The backend supplies explicit returned-page pagination
metadata and keeps missing prices separate from missing publication timestamps.

The creator overview also labels its bounded channel sample and signals earlier
records when the backend reports truncation. The archive entry says “Browse indexed
videos” instead of suggesting a partial count is all channel videos. Chart evidence
labels recorded_at as the opinion-version timestamp, not first_seen_at.
Final local frontend suite after merging the tutorial release: 430 passed.
Exact-head CI run 34273615424 passed. The final two label changes explicitly say
“最新已记录收盘” / “Latest recorded close”. Pages was deployed manually after a normal
push to main; the repository's automatic Pages job is intentionally skipped.

## Actual production acceptance, 2026-09-08 20:14–20:23 UTC

The existing backend producer warmed canonical studies for posts 127, 166, 211 and
462 with no model/provider call. Nine accepted points were delivered to nine studies
with zero missing or mismatched records. The same four posts' map delivery checked
22 points across 11 tickers with zero missing or mismatched records. This measures
accepted-point delivery, not complete source extraction: NKE has no newly accepted
canonical opinion yet and its conditional source repair remains open.

Actual Chrome viewport width and document scroll width both measured 393 pixels
for Chinese and English creator-price and social-history screens. AVGO's accepted
bullish point claim:75b2c484c5bc6622e1a45ec5 displays the green stance separately
from the red -2.5% price change: publication reference $367.24 on September 2,
latest recorded close $357.90 on September 4. Its 20-session window is pending.
The main UI has no recorded-time, history-version or alternative-window selectors.

MU's saved social reading at 19:00 UTC displays detection reference and latest close
from September 4 ($1,016.59, compactly formatted $1,017), actual 0.0% change and a
separate red overheating-risk badge. The 20:00 reading has a September 8 reference
awaiting finalized prices. It remains missing; no earlier date is substituted.
The backend release coordinator owns the separate preceding-close context fix.

Saved production PNGs under `/tmp/ducky-evidence-validation-20260907/`:

- `creator-price-zh-393-production-20260908.png`
- `creator-price-en-393-production-20260908.png`
- `social-price-zh-393-production-20260908.png`
- `social-price-en-393-production-20260908.png`

The release coordinator receives these for independent OCR. The source-bound JSON
receipt is `/tmp/ducky-stock-navigation-qa/production-delivery-20260908.json`.
Some older legacy research snapshots initially lacked the new price context; their
views remained visible with “awaiting calculation”. The natural producer subsequently
populated the third legacy AVGO row without a manual source review or record rewrite.

Follow-up entry audit found that chart/watchlist `#/creators?ticker=AVGO` links lost
their ticker during initial state setup. Explicit stock links now filter the existing
related-content feed across creators and preserve the stock in language and research
navigation. The legacy implicit watchlist scope still shows the full people-first
feed, and name lookup clears the stock tag. Exact-source links keep their source.
Seventeen focused navigation, people-search and research tests pass, including a
real mount regression that retains an unfollowed AVGO creator and excludes TSLA.
This follow-up is queued for the next coordinated frontend release.

## Grouped research view

The owner requested one collapsed card per creator and stock. Its header uses the
newest publication; within one video at the same publication time, later source
seconds come first, followed by stable point identity. It shows that exact view's
stance, short text and price context, without averaging returns or voting on direction.
Different stances at the same publication time are explicitly flagged. Conditional
views have a visible condition marker and retain their full condition inside.

Expansion lists every distinct current view with its own publication, source point,
reference and result. Only matching source-point/study identities collapse; the old
topic-cluster fallback no longer swallows different points or conditions. Repeated
keyset rows do not duplicate cards, additional pages merge into existing groups,
and opened groups stay open. A point link opens its matching group when that point
is loaded; it does not trigger an unbounded search through all pages.

Full suite: 435 passed; a subsequent focused route regression verifies preservation
of the exact research point through login/language serialization. Local 393-pixel
Chinese dark and English light screenshots show compact closed cards with no
horizontal overflow. Actual production collapsed/expanded and desktop acceptance
is required after the coordinated release.

At 20:38 UTC, after the existing producer's 16:30 New York finalization boundary,
the five required symbols still ended on September 4. One existing `prices.run`
with those five symbols and period=5d accepted 25/25 rows, none quarantined, receipt
`price-run:28ac63a809d74b31a3cef7bad6e4f0eb`. New September 8 closes are AVGO
$368.56, ORCL $162.52, NKE $38.10, MU $1,000.26 and SPY $765.96. Four-post
canonical warm remained 9/9 delivered; map receipt remained 22 points/11 symbols
without missing or mismatched content. AVGO's unchanged September 2 reference
$367.24 now compares to $368.56, +0.3594%. No source/model call was made.

## Production grouping and entry correction

Pages `41cfa73e` serves `666ee9f`. The actual TALK/AVGO view has one collapsed
group with three distinct views. Its latest source position is 16:13 at publication
2026-09-03 03:29 UTC, claim `75b2c484c5bc6622e1a45ec5`: green bullish stance,
September 2 reference $367.24, September 8 recorded close $368.56 and +0.4%.
Opening the group retains each view's separate condition, date and prices.
393-pixel and 1440-pixel viewports have equal document and viewport widths.

Production screenshots in `/tmp/ducky-evidence-validation-20260907/`:

- `creator-group-zh-393-collapsed-production-20260908.png`
- `creator-group-zh-393-expanded-production-20260908.png`
- `creator-group-zh-desktop-production-20260908.png`

That acceptance covers the selected creator's group. A separate all-creator entry
check found that the API paginated before the browser filtered the stock. The
frontend now sends a single selected ticker to `/kol/research?ticker=AVGO` on the
first and every subsequent page, alongside `kol_id` when selected. The API owner
is adding filtering before keyset pagination. Until all pages are exhausted, an
empty filtered page says that this batch has no matches and offers existing manual
pagination; it does not claim there are no opinions or fetch the entire archive.

A second real chart-to-creator reproduction restored an old person lookup and
overwrote the explicit stock context. Stock entries now skip that restoration;
normal person lookup restoration is retained. A mounted regression includes an
old saved lookup and verifies the stock in the feed, language link and research tab.
The full suite passed 440 tests. The subsequent lookup-only poll change reads its
queued result after one second; shared history polling stays at four seconds,
with existing single-flight, visibility and backoff behavior. Thirty focused tests
passed after that change. These entry corrections await coordinated deployment.

Backend `5bc7714` and frontend `43b46ef`/Pages `5350daf0` subsequently went live.
A fresh ordinary `/app/#/creators?tab=research&ticker=AVGO` page immediately shows
one group and all three available AVGO views, with no false empty page or next-page
requirement. Chinese and English 393-pixel views retain the ticker. Actual clicks
from the AVGO chart to related creator content retain nine matching feed posts and
an empty person-search input; switching to research keeps one group/three points
and the language link. All measured mobile scroll widths equal 393 pixels.

Additional production receipts in the same temporary validation directory:

- `creator-avgo-generic-en-393-43b46ef.png`
- `creator-avgo-generic-zh-393-43b46ef.png`
- `creator-chart-related-avgo-zh-393-43b46ef.png`
- `chart-entry-zh-393-production-20260908.png`
- `chart-entry-zh-desktop-production-20260908.png`

The chart entry uses the clearer Stock charts/股票图表 heading, shorter search hint
and a responsive stock-button grid. The 393-pixel production view fits all 21 watched
stocks, with 48-pixel-high buttons. The release's four modified JavaScript modules
and the CSS URL actually referenced by HTML (`?v=43b46ef7`) match built file hashes.
The previously open document retained its older JavaScript until navigation loaded
a new document; final acceptance uses fresh, ordinary production URLs.

### Small recorded price changes

Final production inspection after the shared price worker caught up exposed a
formatting issue: GOOGL's actual -0.0295% change rounded to -0.0%. The event price
snapshot now adds decimal places only when a nonzero recorded move would round
to zero, up to the backend's four decimal places. GOOGL displays -0.03%; ordinary
moves keep one decimal place and actual zero stays neutral at 0.0%. The shared
formatter and return calculations are unchanged. This applies to both creator and
social event snapshots, including their completed 20-session comparison.

Regression checks cover positive and negative small moves, the smallest recorded
precision, ordinary moves, actual zero and unavailable data. All 442 frontend tests,
copy lint and 1,352 internal links pass. Live verification follows deployment.

Released as `8de5232` / Pages `9c317a50`, after exact-commit CI
`34281897694` passed. Fresh ordinary Chinese and English production URLs at
393px show GOOGL's TALK group with six views: September 4 reference $338.46,
September 8 close $338.36, -0.03%. The separate New Money group retains its own
August 14 reference $345.90, the same latest close and -2.2%. Both document widths
match 393px. The HTML's actual module graph `10f8ae45e6eca60daff8` main/snapshot
module and referenced CSS match the deployed build byte-for-byte.

Screenshots: `googl-price-393-8de5232-production.png` and
`googl-price-en-393-8de5232-production.png`; static receipt:
`frontend-8de5232-static-receipt.json`, in the existing temporary validation folder.

NKE's research page separately retains conditional point
`claim:88a3ba071448d10f116eb4d1`, including the post-earnings decline **and**
continued new-product demand conditions. Its reference is September 4 $38.40 and
latest close September 8 $38.10 (-0.8%); the erroneous percentage interpretation
was withdrawn. This research receipt alone is not three-surface acceptance:
at this check the legacy point still lacked a source binding and was absent from
the current source page and information map. Backend binding verification remains
open until a separate receipt closes it.
