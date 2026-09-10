# Change log

## 2026-09-10 — Recover a failed first research read (deployed)

A failed initial saved-research request used to miss the automatic refresh registry.
The mounted account/page can now retry that GET at most twice through the existing
visible-page refresh schedule. Successful reads resume normal source revalidation;
auth failures, cancellations, rate limits, searches, history and writes are excluded.
The request deadline covers JSON body consumption, and watchlist diagnostics distinguish
read, shape and rendering failures without logging response text or account data.
List-first ordering, header sorting and dated source dialogs remain intact.
PR #18 and exact main CI `34508908792` passed all 628 tests. App `680086e7` /
Pages `31db4766` is live; four public assets match. Signed-in EN/ZH each loaded
43 watched stocks and 27 dated paragraphs without a read error in these two trials.
Synthetic first-failure recovery is verified; the earlier intermittent production
error has not yet recurred with the new diagnostics, so its cause remains unproven.
[Tests, browser checks and delivery status](reports/INITIAL-RESEARCH-RECOVERY-2026-09-10.md).

## 2026-09-10 — Show the analysis date in collapsed watchlist rows (deployed)

The list now shows the saved analysis date and previous-version status before expansion,
using the same source-bound reading metadata. Loading/failed reads do not acquire a false
analysis timestamp. On the narrowest phones, the overview column fits beside the fixed
stock/map column when scrolled into view. No extra requests or inference. 620 tests and
EN/ZH light/dark 320/390px browser checks passed. Exact main CI passed; `de788804` / Pages `020b808c` is live and three asset hashes match. Live EN/ZH dates verified; a transient English read failure still needs diagnosis. [Acceptance](reports/VISIBLE-ANALYSIS-CLOCK-2026-09-10.md).

## 2026-09-10 — Show each full creator note once (deployed)

Expanded call history repeated the same long note in both the reader and its shared
claim-details component. The reader now renders that paragraph once while retaining
conditions, horizons, reasons, original evidence and revision dates. Other readers
keep their existing full-note behavior. All 619 frontend tests, copy lint and 1,274
internal links passed. App `a3c03e39` / Pages `008ba58b` passed exact main CI; seven public asset hashes and live EN/ZH source details verified. Original timestamps, video links and losses remain visible. Rollback: `92026a55` / Pages `7a25997b`. [Implementation and acceptance](reports/CREATOR-DETAILS-2026-09-10.md).

## 2026-09-10 — Show followed creators' history on the first page (deployed)

Following now reaches the API before pagination, so other creators' recent records cannot
leave the first page empty. Later pages keep the same filter; a changed-scope cursor retries
from the first page. Discover still includes unfollowed creators. Full frontend suite:
618 passed; PR #13 and exact main CI `34484377137` passed. App `92026a55`, Pages
`7a25997b`, graph `1fd559894eca2fda7830` is published; six public asset hashes match.
Signed-in English and Chinese first pages display 16 views in 8 creator–stock groups.
AVGO expansion preserves three records, source timestamps and a negative recorded-price
change; 20-session results remain explicitly unfinished. List-first ordering and direct
maps work when NVDA's summary is unavailable. Backend `175a7675` filters within current
account access and reads subscriptions without cold schema migration. Rollback: app
`533cd73d` / Pages `ce3835e3`. Existing translation/entity concerns remain content work.
[Evidence and acceptance](reports/CREATOR-HISTORY-PAGE-SCOPE-2026-09-10.md).
## 2026-09-10 — Distinguish reading from unfinished generation (deployed)

Watchlist prices can arrive before the saved research response. Empty cells now say “Loading saved analysis…” during that read, then show the actual accepted, pending or failed state. Existing paragraphs remain visible during a refresh. Sorting and direct maps remain usable while research loads; no extra request or generation is added.

The issue was observed on the signed-in production list: initially pending-looking cells subsequently became 27 accepted summaries out of 43 watched stocks. This is a point-in-time reading count, not population coverage. All 615 frontend tests, copy lint and 1,274 links passed. Eight synthetic 320/390×640 bilingual light/dark checks retained a 512px main viewport and first row at y=335.2, with no document overflow. A delayed response replaced four loading cells in place.

[PR #11](https://github.com/ssurmic/ducky-site/pull/11) and exact main CI `34471677296` passed. App `533cd73d`, Pages `ce3835e3`, graph `1cdf551933238f0208fb` is published and its public config verified. Signed-in ZH/EN lists showed List first, Overview second, 43 direct maps and 28 accepted paragraphs, including NVDA's earlier normal retry. The IV/HV header sorted successfully. This UI change does not claim new research generation. Rollback: app `8d19f7d6`, Pages `c353399b`.

## 2026-09-10 — Summary details use the available space (deployed)

The shared stock analysis can contain two sections when there is no source-backed verification task. The reasons panel now fits the actual section count instead of reserving a blank third column; phone layout remains one column. Source links and old three-section records keep working without network work on expansion.

615 frontend tests, copy lint and 1,274 links passed. Local 320/390×640 bilingual light/dark stock QA had no overflow; full-map checks and 1280×800 desktop confirmed one/two-column layouts. These are synthetic viewport tests, not physical devices. Backend generation and independent review acceptance are recorded in the central `ANALYSIS-SECTION-ROLES-2026-09-10.md` report.

[PR #9](https://github.com/ssurmic/ducky-site/pull/9), its PR check and [exact main CI](https://github.com/ssurmic/ducky-site/actions/runs/34470116055) passed. Published app `8d19f7d6`, Pages `c353399b`; production config and the served responsive CSS were verified. JavaScript graph `7fb856aa26c6f941c953` is unchanged. Rollback: app `8b6aba6b`, Pages `4abe5bfd`. This publishes rendering support, not a claim that every stock already has a newly reviewed summary.

## 2026-09-10 — Singular author-history counts (deployed)

The signed-in English MU page exposed “1 records” and “1 original sources.” Author-group headings
and the one-more-record disclosure now use singular translations; plural counts and Chinese remain
consistent. This changes wording only, not records, grouping or source identities.

Validation: 614 frontend tests; bilingual copy/link gates; 320×650 and 390×650 stock/map-page QA in both
languages and light/dark themes. All sixteen checks had no document overflow and 522px main viewport;
visible screenshots confirmed the single-source author group. These are synthetic viewport checks,
not physical phones. [PR #7](https://github.com/ssurmic/ducky-site/pull/7) and exact main CI passed.
Published app `8b6aba6b`, Pages `4abe5bfd`; production config and the signed-in English MU page verified
“1 record · 1 original source” at 10:23 UTC. The corrected MU source card remains readable while its
whole-stock summary awaits review.

## 2026-09-10 — Restore visible maps, creator history and calendar (deployed)

List is the default watchlist on desktop and phone, with the saved overview in a table column and
clickable sorting headers. Stock rows and pages link directly to the information map; existing facts
remain visible during summary preparation. Bullish/context/bearish lanes group authors and flag
repeat sources without removing source history. Calendar and Creators return to primary navigation.
Explore and first-use Today include clearly dated, clickable examples.

Published in [PR #5](https://github.com/ssurmic/ducky-site/pull/5), app commit `20a803ee`,
Pages `1d9c25b3`. Both PR/main CI passed. Production browser verified COST onboarding and cleanup,
YTD sorting in both directions, NVDA's 118-record map and Investment TALK's author grouping.
Validation: 614 full-suite tests, 48 focused tests after the final refinement, bilingual copy/link
checks and three export tests. Reviewed-summary coverage remains partial.

Acceptance, real COST onboarding steps and limits: [visible core workflow](reports/VISIBLE-CORE-WORKFLOW-2026-09-10.md).


## 2026-09-10 — Connected stock reading (deployed)

- Make Today, Watchlist and Explore the default navigation in Chinese and English. Keep advanced tools and historical links accessible.
- Read the same saved stock summary in Today, Watchlist, stock detail and Stock briefs. Adopt completed background updates without interrupting reading.
- Preserve open reasons, exact source citations, keyboard focus and inspected chart dates. Withhold withdrawn content and distinguish unavailable states.
- Show dates for numeric source records and retain each older analysis's original date and source snapshot.
- Improve stock/source touch targets to at least 44px and retain 16px phone inputs.
- Validation: 609 JS tests; bilingual build; copy lint (3,225 files, zero failures); link check (1,266 links); three export tests. Mobile viewport and route evidence: [connected-reading report](reports/CONNECTED-READING-2026-09-10.md).
- Limits: not a market-data entitlement upgrade or completed human study. Backend pilot coverage at 08:11:56 UTC was 8/10; two drafts still retried. Publication: PR #3, commit `7cd5f6ab948e89e63b94ed51b68cc273c22c22ec`, Pages `6a399330`; both PR and main CI passed. Public config and signed-in GLW verified. At 08:28 UTC coverage was 9/10; NVDA still retry. Full receipt in the linked report.

## 2026-09-10 — Shared stock briefs and same-origin preview

Published from `4ae19a20b88d9e825e86cb436d2e4bee5faa80cf` in [PR #2](https://github.com/ssurmic/ducky-site/pull/2), Pages deployment `1b394637`. Stock briefs reuse the shared stock analysis rather than a separate half-day narrative; bilingual preview paths use the same API and release asset graph. Validation: 604 JS tests, copy/link/export gates and production browser inspection. The preview-only navigation decision is superseded by the next release at the owner's request.
