# Retained-data acceptance · 2026-09-09

The actual `adaptStudies` module passes an offline check against two genuine retained
studies containing four calls, in both English and Chinese. Their provenance was
cross-checked against a fixed database backup whose hash is documented in the backend
repository. This is dated **`creator-research/1`** evidence; it is not a live `/3` response,
current source-validity approval, or proof that the live API has been connected.

## Artifacts and provenance

| Artifact | Location | SHA-256 |
|---|---|---|
| Dated API response, 906,073 bytes | `/private/tmp/ducky-evidence-hub-fixtures/_kol_research.json` | `e63a7bbdce8c5ab287ebc2977f01c81ca88ea6436ec889d669234eb903a7703f` |
| Fixed creator database, 15,994,880 bytes | `/private/tmp/ducky-backfill-acceptance-20260908/baseline.sqlite3` | `fcd41c974021cec68b4aefbb9af00af44769c95c1ca9ae7b123d78562b5a545d` |

The response retains its original schema `creator-research/1` and response `as_of`
`2026-09-08T07:39:59+00:00`. That time is not a complete-source check or publication time.
It contains 500 studies, of which exactly two have calls. The database provenance is
documented at backend `reports/CREATOR-BACKFILL-2026-09-08.md:85–87`: the production
SQLite backup was taken at 09:01:49 UTC on September 8, stored privately as
`~/.local/state/ducky-backups/creator-backfill-20260908T090149Z/kols.sqlite3`, and the
same SHA-256 was verified on another machine. The `/3` audit mentioned next in that
report is a **backfill audit version**, not the `creator-research/3` HTTP schema.

| Post | Revision | Creator | Existing video ID | Calls |
|---|---|---|---|---|
| 481 | 925 | `touzi-talk` | `S0v1OUSmSQc` | 3 |
| 96 | 714 | `meet-kevin` | `FETbh8YjxjY` | 1 |

Both response studies match their `kol_studies.payload` records exactly on:

- Post fields: `id`, `revision_id`, `kol_id`, `platform_post_id`, `published_at`,
  `first_seen_at`, `recorded_at`, `url`, `title`, `content_hash`.
- Every call, in retained order: `sym`, `stance`, `note`, `condition_text`, `intent`,
  `action`; the call counts also match.

The raw payloads, private database, and source text are not copied into this repository.
The old response alone has no newly invented collection receipt: its match to the
documented fixed database establishes provenance for these two records.

## Executed adapter check

Run from the isolated site worktree:

```sh
node /Users/zizhaozhang/dev/ducky-site-research-brief-20260909/docs/ducky-improvement-20260909/execution/verify-retained-data.mjs
```

Executed **2026-09-09T22:59:48.979Z**, exit **0**, `status: pass`.
The script verifies both artifact hashes before and after the check, calls the current
site's `adaptStudies` in both languages, and compares the result with the original input.
It then performs two parameterized `SELECT payload FROM kol_studies WHERE revision_id=?`
reads through Python's standard-library SQLite driver, using `mode=ro` and
`PRAGMA query_only=ON`. SQLite `total_changes` was **0**. No backend application module,
schema initializer, user table, authentication secret, model, provider, or network request
is used. Python runs with `-B`; the verifier writes no output files.

Observed results, each checked in EN and ZH:

- Two studies remain **four calls**, with no input mutation.
- The retained directions stay `neutral`, `bear`, `bear`, `bull`; unknown/neutral is
  not promoted to a directional recommendation.
- Full call objects remain unchanged, including action, intent, clocks and retained
  price-window data. No price or return is recomputed.
- All four original links preserve the existing video identity and stored source offset.
- All four `condition_text` values are empty/missing and remain so.
- All four response excerpts are already empty with `excerpt_status=source_link`, and
  remain empty. The adapter does not recover private full text from the database.

**Limits:** this sample does not exercise a real nonempty condition or displayed excerpt.
Those cases, original-versus-corrected text, conflicts, missing clocks and source offset
zero are covered by synthetic adapter/view tests, separately from this retained-data
check. The sample includes a historical `STHO` association; current identity/correction
rules may withhold old interpretations. Passing this adapter check does not certify any
sample as currently eligible for publication or reproduce historical source knowledge.
The live view still rejects this old envelope because it requires `/3`; the verifier
passes only the retained `items` to the pure adapter and never changes the schema label.

## Existing current-contract coverage

Backend worktree: `/Users/zizhaozhang/dev/ducky-bot-research-brief-20260909`, frozen
baseline `365409f`. The existing full baseline run in
`baseline-backend-tests.log:4` reports **4,634 passed, 6 skipped, 19 warnings**;
the selftest finished **ALL GREEN**. These tests were not rerun as part of this
retained-data-only check. The log's check-name text saying “skipped ... when pytest is
missing” is the invariant's generic name; the preceding actual result confirms pytest ran.

Precise existing tests for the current reader and HTTP boundary:

| Concern | Test node under `bin/tests/` |
|---|---|
| Conditions, losses and separate clocks | `test_creator_study_delivery.py::test_canonical_delivery_keeps_conditional_views_losses_and_distinct_clocks` |
| Stable source-point deduplication | `test_creator_study_delivery.py::test_same_source_point_in_multiple_study_versions_is_returned_once` |
| Bounded keyset pages and creator/history cursor binding | `test_creator_study_delivery.py::test_keyset_pages_keep_all_views_despite_busy_revision_history` |
| Ticker filtering before pagination, scope-bound cursors | `test_creator_study_delivery.py::test_ticker_filter_precedes_page_limit_and_binds_cursor` |
| Exact correction withdrawals retain independent points | `test_creator_study_delivery.py::test_exact_scoped_correction_revokes_duplicate_job_copy_but_keeps_other_point` |
| Cold data reader does not initialize a store | `test_creator_study_delivery.py::test_cold_research_read_does_not_initialize_schema` |
| Reader performs no price calculation | `test_creator_research.py::test_read_only_feed_never_calculates_and_completed_values_freeze` |
| HTTP authentication, private no-store response and no expensive request work | `test_creator_research.py::test_research_api_requires_pro_and_does_no_work` |
| Authenticated reads do not resurrect withdrawn points or write | `test_kol_point_withdrawal.py::test_authenticated_read_endpoints_do_not_resurrect_or_write` |
| Explicit tiered creator entitlement | `test_experience.py::test_creator_free_follows_read_only_own_content_and_full_research` |
| Current open-access policy keeps authentication | `test_open_access.py::test_research_routes_retain_auth_but_no_longer_require_a_purchase` |

The `requires_pro` test's historical name is retained verbatim; its actual assertions
allow a free account to read its permitted scope. It does not establish a new purchase
requirement. A standalone, hermetic command to rerun exactly the nodes above is:

```sh
/Users/zizhaozhang/dev/ducky-bot/.venv/bin/python -B - <<'PY'
import os, pathlib, subprocess, sys, tempfile
root = pathlib.Path('/Users/zizhaozhang/dev/ducky-bot-research-brief-20260909')
nodes = [
 'test_creator_study_delivery.py::test_canonical_delivery_keeps_conditional_views_losses_and_distinct_clocks',
 'test_creator_study_delivery.py::test_same_source_point_in_multiple_study_versions_is_returned_once',
 'test_creator_study_delivery.py::test_keyset_pages_keep_all_views_despite_busy_revision_history',
 'test_creator_study_delivery.py::test_ticker_filter_precedes_page_limit_and_binds_cursor',
 'test_creator_study_delivery.py::test_exact_scoped_correction_revokes_duplicate_job_copy_but_keeps_other_point',
 'test_creator_study_delivery.py::test_cold_research_read_does_not_initialize_schema',
 'test_creator_research.py::test_read_only_feed_never_calculates_and_completed_values_freeze',
 'test_creator_research.py::test_research_api_requires_pro_and_does_no_work',
 'test_kol_point_withdrawal.py::test_authenticated_read_endpoints_do_not_resurrect_or_write',
 'test_experience.py::test_creator_free_follows_read_only_own_content_and_full_research',
 'test_open_access.py::test_research_routes_retain_auth_but_no_longer_require_a_purchase',
]
with tempfile.TemporaryDirectory(prefix='ducky-brief-contract-') as scratch:
 env = dict(os.environ)
 for key in ('SIGNALS_DIR', 'TEST_MODE', 'SELFTEST', 'DUCKY_TRUST_CF', 'DUCKY_ENV'):
  env.pop(key, None)
 env.update(DUCKY_DB=str(pathlib.Path(scratch) / 'main.db'),
            DUCKY_KOL_DB=str(pathlib.Path(scratch) / 'kol.db'),
            SELFTEST_SKIP_PYTEST='1', PYTHONDONTWRITEBYTECODE='1',
            PYTHONPATH=os.pathsep.join((str(root), str(root / 'bin'))))
 result = subprocess.run([sys.executable, '-B', '-m', 'pytest', '-q', '-p', 'no:cacheprovider',
                          *['bin/tests/' + node for node in nodes]], cwd=root, env=env)
 raise SystemExit(result.returncode)
PY
```

The tests seed temporary synthetic stores; their passing result is distinct from the
real retained-data adapter evidence above.

## Remaining verification boundary

No `creator-research/3` response was found among local `/private/tmp` JSON artifacts.
The documented creator backups inspected lack `kol_point_studies`; the current reader
correctly reports `collecting` without migrating them. No suitably current paired
creator/main database snapshot was found. Current `/3` retained-data and live API/browser
acceptance remain unverified; no production access was attempted.

`kol.research_feed` and its source/correction gates use `supporting_store.read`
(`mode=ro`, `query_only`). This is narrower than “every cold authenticated HTTP request
has no writes”: existing authentication and `/watchlist` can reach `db._connect` schema/WAL
initialization, and explicit tiered creator entitlement can reach `kol.user_subs` →
`kol._conn`. An initialized authenticated application already uses these paths; the
preview does not change them. A future strict replay should use genuine paired fixed
snapshots, prohibit writer connection functions, and test the data reader separately
from existing cold HTTP initialization.
