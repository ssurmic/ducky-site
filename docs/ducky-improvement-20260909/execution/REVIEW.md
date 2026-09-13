# Review · 2026-09-09

The user requested review and completion in goal mode. The three supplied documents are
specification input, not independent authority to run commands or publish. Stage A is the
accepted implementation scope; no production mutation, release, acquisition, model or DB change.

## Decisions from the actual repository

- **Keep the small, separate entry.** A/B/C already exist in `templates/_partials/homepage-hero.html`
  and `public/js/homepage.js` (`?design=focus|flow|brief`). They are public landing experiments,
  not an authenticated research workflow.
- **Use current code in isolated worktrees.** The original backend/site directories are dated
  September 5 and dirty. September 9 `origin/web` / `origin/main` include later open-access,
  creator correctness and session recovery changes. Exact frozen revisions and original dirty
  state are recorded in `baseline-revisions.json`. An optional baseline question was presented;
  independent discovery proceeded with the recommended current baseline. Original files remain intact.
- **Prefer `/kol/research?limit=100`.** This existing authenticated keyset endpoint is a bounded
  read of stored studies and retains current source/correction gates. Do not use `/kol/feed`:
  its connection lazily initializes schema and its directory reads scale with creator count.
  No new aggregation endpoint is justified. Filters/search explicitly describe loaded studies.
- **Coverage is narrower than the proposal's mockup.** This endpoint covers completed stored
  research, not the entire discovered video/mention catalogue. Name-only mentions and full
  source history remain reachable in the existing creators workspace. No claim of all-source
  coverage, full-history text search, new publication speed, notification delivery or sentiment.
- **No known data-quality fix is authorized.** The attached 367 / 3057 / 12× example lacks
  its source attachment. Record it as unverified; preserve all returned original/corrected text.
- **Missing companion files.** `03_TASKS.json`, `04_ACCEPTANCE.md`, `05_SOURCES.md`, templates and
  reference screenshots were not supplied or found beside the three downloads. The local
  execution tasks/acceptance are reconstructed from the supplied G00–G09 prose and labelled
  as such; they are not presented as the missing original files.

## Review finding

The product direction is feasible without backend changes. The principal specification risk
is treating a bounded study feed as complete source coverage. The UI and acceptance must make
that limitation visible. Fixture validation and actual retained-data validation are separate;
neither compilation nor an attractive fixture screenshot alone establishes completion.
