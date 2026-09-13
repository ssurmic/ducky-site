# Independent final regression review · 2026-09-09

The final isolated default-off build and bounded regression checks passed. This is engineering
verification, not a production release or proof of real HTTP authentication, permissions or
retained-data availability. The implementation was not edited by this reviewer.

## Isolation and exact version

- Source: `/Users/zizhaozhang/dev/ducky-site-research-brief-20260909`, baseline `4a88b28`.
- Independent snapshot and generated output: `/tmp/ducky-brief-regression-final-gu87lydh/site/dist`.
- `build.py` has no `--output` option and `npm test` rebuilds its own `dist`, so a separate local
  Git clone without checkout was populated with current tracked files and the new implementation/tests.
  This retains bounded release-history checks without sharing writable Git metadata. Existing
  `node_modules` was reused; no package was installed. Secret environment files were excluded.
- Final module graph: `424d72641f74a061be81`. Final production file hashes match the reviewed source;
  the built Research Brief CSS also matches the final source, including the last spacing changes.
  See `regression-final-snapshot.json` and `regression-final-integrity.json`.
- The source worktree's `dist` was not written by this review. The main agent's enabled browser
  preview remained separate. Build-generated calendar changes happened only inside the snapshot.

## Commands and actual results

All commands below ran in `/tmp/ducky-brief-regression-final-gu87lydh/site`, unless noted.

| Check | Command | Actual result |
|---|---|---|
| Full default-off build + frontend suite | `DUCKY_TEST_PYTHON=/Users/zizhaozhang/dev/ducky-bot/.venv/bin/python npm test` | exit 0; 572 passed, 0 failed, 0 skipped; 17.37 s overall |
| Product copy | `/Users/zizhaozhang/dev/ducky-bot/.venv/bin/python scripts/lint_copy.py` | exit 0; 3,034 files scanned; no reported violation |
| Internal links | `/Users/zizhaozhang/dev/ducky-bot/.venv/bin/python scripts/check_links.py` | exit 0; 1,290 links checked; 0 planned-page warnings |
| Asset/public-close tests | `/Users/zizhaozhang/dev/ducky-bot/.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v` | exit 0; 8 discovered, 7 passed, 1 skipped |
| Public creator export sanitizer | `/Users/zizhaozhang/dev/ducky-bot/.venv/bin/python -m pytest tests/test_creator_public_access.py -q` | exit 0; 1 passed |
| Actual default-off artifacts and graph | From source root: `node docs/ducky-improvement-20260909/execution/verify-default-off.mjs /tmp/ducky-brief-regression-final-gu87lydh/site` | exit 0; assertions below passed |
| Source whitespace | `git diff --check` in the source worktree | exit 0 |

The Python skip is the existing test `test_history_restores_screenshot_release_without_rewriting_its_bytes`:
its September 6 screenshot graph has aged outside the configured bounded Git history. The other
immutable graph, single-store, dependency invalidation and retained-release tests passed. The
pytest-style creator sanitizer is listed separately because unittest discovery does not execute it.

Full output: `regression-final-npm-test.log`, `regression-final-copy.log`,
`regression-final-links.log`, `regression-final-python-assets.log`,
`regression-final-creator-public-access.log`, `regression-final-default-off.log`.
Earlier passing runs are retained as `regression-final-npm-test-before-last-ui.log` and
`regression-final-npm-test-before-final-spacing.log`; the unsuffixed log is the final run.

## What the actual default-off artifact establishes

- Generated `config.js` evaluates to `RESEARCH_BRIEF_ENABLED === false` without a preview flag.
- Both Chinese and English app HTML have no Research Brief navigation entry, module script tag or
  stylesheet link. Both reference their actual immutable `/app-assets/424d72641f74a061be81/main.js`.
- Importing the built router and login-target modules with that generated configuration issued
  zero requests and attached zero Research Brief stylesheets. `#/research-brief` resolves to the
  existing watchlist route; its unsupported login target is rejected; the default login return
  remains `#/watchlist`.
- The 19-module static import closure rooted at the built `main.js` contains neither the new
  view nor its adapter. The only new view import in the built router is the conditional dynamic
  import guarded by the exact boolean flag. This is source/Node evidence, not a browser network trace.
- New files still exist in `dist` because the existing builder copies public assets. Their presence
  on disk does not mean they are eagerly requested. Enabling the flag does not grant API access.
- A/B/C landing controls remain in both languages with `design=focus`, `design=flow` and
  `design=brief`. Their existing template and JavaScript bytes match the frozen baseline.

## Earlier findings and regression status

The earlier overview drill-down bug mixed a filtered ticker with a cursor bound to an unfiltered
server query. The final implementation retains an independent server-filter snapshot, and the
new regression checks the next-page request. Returning from source/history now revalidates the
previously requested bounded pages before restoring scroll. The earlier loss of keyboard focus
when replacing pagination controls is fixed, with a final-page focus regression. These are included
in the 23 new Brief tests and the 572-test run. Session transition, stale response, source escaping,
unknown dates/stances, transport duplicates, partial-page retry, loaded-only search and direct
mount while disabled are also covered by the new controlled tests.

No additional implementation blocker was found in this bounded final review. Existing backend
routes and authorization remain unchanged; a prior read-only status check found the backend
worktree clean. No backend service, worker, notification, model job, migration or production request
was run by this reviewer.

## Limits and handoff

- These tests use controlled fixtures and Node DOM assertions; they do not establish real HTTP
  authentication, Free/Pro entitlement enforcement, source availability or actual retained-data access.
- The synthetic browser harness injects account/config/fetch behavior. It may validate layout and
  navigation behavior, but must not be described as proving production auth or real-data integration.
- Browser matrices, real source/point/history resolution, physical device behavior, five-run browser
  request/performance comparisons and the independent retained-data evidence belong to the main
  agent's acceptance record. They were not performed by this reviewer.
- No deployment, push, merge, configuration enablement or production notification is authorized
  or implied by these passing local checks. The result remains ready for the main agent's final
  acceptance consolidation and manual release review.
