# Repository map · G00 · 2026-09-09

Frontend: `/Users/zizhaozhang/dev/ducky-site-research-brief-20260909`, baseline `4a88b28`.
Backend (audit/tests only): `/Users/zizhaozhang/dev/ducky-bot-research-brief-20260909`, baseline `365409f`.
Original directories and dirty-state hashes: `baseline-revisions.json`.

## Stack and boundaries

Jinja2/Python static build, native JavaScript ES modules, hash router; no React or new service.
`build.py`, `templates/app.html`, `i18n/{en,zh}.json`, `public/js/app/router.js`,
`api.js`, `store.js`, `auth.js`, `login-target.js`, `strings.js` are the integration points.
`build.py` copies `public/`, emits immutable app module graphs, config, language pages and CSP.
No `.openai/hosting.json`. Existing npm lockfile/jsdom and Python venv are reused, no installs.

The new `#/research-brief` route is authenticated and build-enabled only with an explicit
preview flag. It is not the homepage or login default. New code is dynamically loaded only
on that route; its CSS is root-scoped and attached/removed by mount/cleanup. Existing routes
retain normal behavior. A feature flag does not grant API access.

## Audited data paths

| Need | Actual contract | Boundary |
|---|---|---|
| Research | GET `/kol/research`, `ducky-bot/api/app.py:kol_research` → `kol.research_feed` | Authenticated; creator entitlement before read; limit 1–100; cursor bound to creator/ticker/history/access scope |
| Storage | `bin/kol.py:research_feed` → `supporting_store.read` and `creator_study_read.serve_items` | SQLite read-only connections; current sources/corrections checked; no worker or model |
| Watchlist | GET `/watchlist` → `db.list_watch` + `watchlist_overview.overview` | Current user only; saved facts; no price acquisition |
| Session | existing app boot/auth, `store.epoch()` | Reuse; logout/account change aborts and discards view data |
| Source details | `creator-route.js:creatorTarget` | Exact creator/video/point deep link, server authorization remains |
| Existing stock/history | `#/evidence/<ticker>`, `#/creators?...tab=research` | Existing readers; no new follow/alert action |

## Field capability map

`items` are stored study records. Persistent identity is creator + post `id` + `revision_id`/
`study_key` + call `point_id`/`claim_id` (fallback call position preserves records without IDs).
`platform_post_id` identifies a video, `kol_id` a creator, `kol_name` the display name;
`call.sym` is the source-owned ticker association. No alias inference or company identity guess.
`call.note`, `reason`, `condition_text`, `horizon_text`, `evidence`, `evidence_reading`,
`verification`, `attribution_status`, `direction_basis`, `intent`, `stance` retain source meanings.
`url`/`source_url` + `start_seconds`/`action_start_seconds` supply original links.

`published_at` = publication; `first_seen_at` = first observation when supplied;
`recorded_at` = saved revision time; `computed_at` = saved study computation (only when present).
`as_of` = API response time, **not** last successful acquisition. Delivery timestamps and
whole-source last-check status are absent. Day-only timestamps remain dates; unknown remains unknown.

`pagination.scanned/returned/has_more`, `next_cursor`, `limit` describe this bounded study page.
Server ticker/creator filtering precedes pagination; date/text search only filters loaded rows.
No direction ratios, momentum scores, full-history search or “since last visit” semantics.

## Protected files

No edits to backend application/modules/schema/workers, production configs, `.env`, timers,
notifications, strategies, dependencies, source content or old global CSS. Original dirty
working directories are not implementation targets. Verification creates scratch test state only.

Commands: `git status --short`, `git log`, `git show origin/main:<path>`,
`git show origin/web:<path>`, `rg` source/route/string searches; no secret values were read.
