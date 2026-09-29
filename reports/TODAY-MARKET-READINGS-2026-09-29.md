# Today per-metric reading coherence

Status: frontend candidate approved for release preparation after owner and independent review. Nothing in this report claims
this candidate has been merged or deployed. Frontend base: `4583e4c17c6250806b2b2ecb664a3f443efbff69`.
The prior [compact-preview release](TODAY-CLOSE-PREVIEW-2026-09-28.md) remains separately dated.

## Problem and scope

The same Today page could describe one yield/VIX source in its saved snapshot while a tile
independently selected another field. A later observation time could also be mistaken for
the underlying trading time. The backend owns the source choice; this change consumes its
additive `market_readings` projection on the existing macro response. It adds no endpoint,
provider request, acquisition, generation or account operation.

The known `market-readings/1` envelope carries a selected session and four independently
attributed readings: nominal ten-year yield, VIX, the VIX/VIX3M ratio, and the funding score.
A finite value retains its own date, source, series, basis, live state and optional acquisition
clock. The ratio additionally retains the two same-date components. The frontend does not
repeat the source-selection algorithm or calculate replacements from older fields.

A null, missing or malformed metric in the recognized projection stays unavailable. It
cannot silently fall back to the conflicting legacy quote, observed row, FRED print or
aligned metric. Actual zero is retained, including the funding gauge and its color. Invalid
calendar dates, metric dates after the selected session, nonfinite/string values, unknown
provenance, invalid clocks and incompatible ratio component dates are not presented as
usable canonical readings. An absent or unknown envelope schema retains the legacy path
for compatibility; the paths are never mixed within a recognized projection.

## Meaning and presentation

Each tile shows its reading date and source. Stored observations and latest available prints
use the neutral “Data dated” label: a FRED observation date is not its publication date.
Intraday observations are labelled intraday;
`live=false` is not labelled a final or settled close. A dated funding score retains that
meaning even when the source row has a live flag. Optional observation/acquisition times
are labelled “Recorded,” not quote/trade time. A later recording day is valid for an older
reading and is not reassigned to the original session. Date-only values are not converted
to invented evening clocks.

The ratio shows its own date and both source series rather than borrowing the VIX reading's
clock. The footer no longer gives canonical quotes a blanket FRED date. Existing historical
charts, source-bound digest prose, close-snapshot coverage and compact event previews stay
intact. Historical charts still describe their saved observed rows; this slice does not
rewrite chart history or revise a previously published digest in the browser. Producer
completion/revision and actual API delivery belong to the backend release.

## Local evidence

The focused Today suites passed **34/34** tests. Seven new regression cases exercise conflicting
legacy values, the same saved snapshot/tile numbers, immutable source prose, dated funding
zero, distinct intraday and acquisition clocks, ratio-specific provenance, malformed/null
readings without fallback, and absent/unknown-schema compatibility. The existing tests
retain GET-only refresh, account/access/disposal guards, archive/reading-state continuity,
compact preview and source/date behavior. The current full bilingual build and **849 Node
tests** passed. The initial new empty-gauge assertion was corrected to include the existing
`/100` unit; no product change was made to hide that unit.

An isolated synthetic browser fixture uses canonical 5.24%/16.07 readings while deliberately
supplying different legacy fields. It contains no production account or market response.
Twelve isolated Chromium combinations passed at 320 × 650, 390 × 650 and 1440 × 900,
each in Chinese/English and light/dark; phones used touch emulation. The browser verified
canonical 5.24%/16.1 values against deliberately conflicting legacy inputs, visible funding
zero, source/date labels without a close claim, ratio-specific attribution, full preview
source/Calendar access and refresh continuity. No document overflow, runtime error or
outbound request occurred. Screenshots were captured only after ancestor opacity reached 1.
The first metadata capture inherited body-size text; its font was matched to the existing
11px source metadata and all twelve captures/checks were repeated. The inspected 320px and
390px phone layouts retain the existing two-column tiles, with lower details accessible by
scrolling; no whole-page-above-the-fold or physical-device claim is made.

The remaining Python checks passed 3 export, 8 homepage-proof and 3 creator-source tests;
asset isolation passed 4 with 1 expected local historical-graph skip. Copy lint scanned
4,242 files without violations and 2,103 links passed. The homepage-proof suite deliberately
prints its invalid-fixture diagnostic while succeeding. These are candidate checks; hosted
CI, backend/frontend publication and authenticated canonical-content acceptance remain
outstanding. Independent contract review found no blocker and separately passed 23 focused tests.
The owner approved the code and phone screenshot, then required the neutral FRED date
wording above before the final gate and release. Exact candidate, hosted and publisher
receipts belong to the delivering PR and later release record.
