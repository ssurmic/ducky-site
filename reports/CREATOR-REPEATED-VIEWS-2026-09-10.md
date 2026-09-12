# Repeated creator viewpoints · 2026-09-10

Status: published; local and live acceptance completed for this change.

## User-visible behavior

The creator reader shows identical bilingual viewpoints from one author, video
and stock once. “Same wording · 2 records” / “相同表述 · 2 条记录” opens both
original records. Each keeps its point ID, passage range, available full excerpt,
video link and exact map link. The original source remains one click away even
while the records are collapsed. An exact point link opens the requested record.

Different positions, reasons, conditions, time horizons, dates or either language
remain separate. This is exact presentation grouping, not semantic deduplication
or removal of historical evidence. The disclosure explicitly states that records
from one video are not independent corroboration. Missing passage time no longer
becomes a fabricated 0:00; an actual zero is still displayed.

## Reproduction

A read-only production observation at 2026-09-11 04:26 UTC found two current LYFT
records in Meet Kevin's video `xRKScH37m9A`, published 2026-09-08 05:24:19 UTC:

| Point | Passage, seconds | Public excerpt |
| --- | --- | --- |
| `claim:2975ac41692a12f26153c5a2` | 139.76–145.84 | Present |
| `claim:a6718deee46dcdaa28873f85` | 139.76–149.36 | Source link only |

Both carry the same English and Chinese statement about using Lyft when Uber's
prices or availability are poor, with the same qualifications and observation
time. The saved LYFT map already groups these as one node with two evidence
records (`se-node:e13d4ab329855f40b4318104`, read at 04:35 UTC). The creator reader
previously displayed the same headline twice. No source correction is made here.

## Implementation and checks

`creator-span-groups.js` is a pure grouping helper. Source identity, bilingual
titles and a matching HTTPS YouTube video are required. Only receipt fields may
differ; unknown future qualification fields remain part of the comparison. The
original objects and their order are retained. Existing source validation runs
before grouping; grouping cannot grant publication approval.

- 677 frontend tests passed, plus copy lint and 1,878 internal links.
- After the final remaining-record count adjustment, all 16 focused creator and
  source-navigation tests passed; the final build succeeded.
- Local browser fixtures: EN/ZH × light/dark × 320/393/1100 px widths, 650 px high.
  All 12 layouts were visually checked, with no document horizontal overflow.
  Repeated records expand using mouse/Enter. Phone source and map actions are
  44 px high; desktop map links retain their existing 34 px style.
- Exact links retain both IDs; missing excerpts stay absent; original passage
  ranges and conditional wording remain readable. Tests cover grouping bounds,
  future fields, invalid identity, focus and counts after the six-group preview.

These are simulated browser layouts, not a physical-phone study. No CSS, API,
database, model, acquisition, retry or investment algorithm changes are included.
Opening the details element performs no request. The existing page may revalidate
its saved GET response independently.

## Operations and remaining acceptance

The interactive development task is separate from DGX production scheduling.
A bounded read on 2026-09-10 at about 21:41 PDT confirmed independently scheduled
quote, watchlist-price, creator-discovery, captions/ASR/review and brief jobs.
Routine production queues do not need to finish before development can stop.
This release does not claim the whole ingestion backlog, human fidelity study,
real-user study or three-trading-day quote SLO has passed.

Rollback baseline: frontend main `35a5713cbdc5daf6c1e4b7102f96a3d2afca4cf7`,
Pages `23cf155b`. No backend rollback or migration is required.

## Release evidence

- [PR38](https://github.com/ssurmic/ducky-site/pull/38), main
  `960ebb021b25258a29e24d31c8108d7d410ff7ce`; PR check `34563233372` and exact-main
  check `34563356872` both passed, including the current 677-test suite.
- Cloudflare Pages `7609ecf0`, app graph `251540f1d2e6670431b8`. At
  2026-09-11 04:47:38 UTC, the public release manifest and both changed modules
  returned HTTP 200 and matched the tested build byte for byte.
  [Machine receipt](creator-repeated-views-20260910/pages-verification.json).
- Authenticated production browser: EN and ZH show one LYFT headline with two
  records collapsed by default. Expansion retains 2:19–2:25 and 2:19–2:29 and
  both distinct map IDs, with an excerpt only on its actual source record.
  A direct link to `claim:a6718deee46dcdaa28873f85` automatically opens and
  prioritizes that record while retaining the other one.
- No subscriptions or production state were changed. The owned preview server
  and browser tab were closed. DGX runtime remains unchanged by this release.
