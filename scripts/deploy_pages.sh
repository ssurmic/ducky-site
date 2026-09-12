#!/usr/bin/env bash
# Publish the verified build of the reviewed `main` tip to the ducky-site Cloudflare Pages
# project. The project is Direct Upload: a git push (including the nightly notary push) never
# publishes anything, so this script is the production release path. It runs from any machine
# with a wrangler login (`npx wrangler login`); no Cloudflare token is stored in CI.
#
#   scripts/deploy_pages.sh             # gate, publish HEAD (must equal origin/main), verify live
#   scripts/deploy_pages.sh --dry-run   # gate only, no publish
#   DUCKY_TEST_PYTHON=/path/to/python scripts/deploy_pages.sh   # interpreter that has jinja2
#
# Gate = exactly what .github/workflows/check.yml and deploy-pages.yml run: build, node tests,
# export unit test, lint_copy, check_links, landing sanity. Record the printed deployment id and
# live VERSION in the change log / handoff entry for the release.
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${DUCKY_TEST_PYTHON:-python3}"
WRANGLER="${WRANGLER:-npx --yes wrangler@4.129.1}"
PROJECT="${PAGES_PROJECT:-ducky-site}"
SITE="${SITE_URL:-https://duckybot.app}"
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1
log(){ printf '%s deploy_pages: %s\n' "$(date -u +%FT%TZ)" "$*"; }

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  log "tracked files are modified; commit or discard them first"; git status --short --untracked-files=no; exit 2
fi
git fetch --quiet origin main
HEAD_SHA=$(git rev-parse HEAD); SHORT=$(git rev-parse --short=8 HEAD)
if [ "$HEAD_SHA" != "$(git rev-parse origin/main)" ]; then
  log "HEAD $SHORT is not origin/main $(git rev-parse --short=8 origin/main); production publishes only the reviewed main tip"; exit 3
fi
"$PY" -c 'import jinja2' 2>/dev/null || { log "$PY lacks jinja2 — pip install -r requirements.txt"; exit 4; }
[ -d node_modules ] || npm ci --no-audit --no-fund

log "gate for $SHORT: build + tests + export test + lint_copy + check_links"
DUCKY_TEST_PYTHON="$PY" npm test
"$PY" -m unittest discover -s tests -p 'test_export_desk_prices.py'
"$PY" scripts/lint_copy.py
"$PY" scripts/check_links.py
test -s dist/index.html && test -s dist/en/index.html && test -s dist/_headers
# build.py regenerates the static calendar fallback with a fresh clock; it is not part of a release.
git checkout --quiet -- public/calendar.json 2>/dev/null || true
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  log "the gate modified tracked files; refusing to publish"; git status --short --untracked-files=no; exit 6
fi
if [ "$DRY" = 1 ]; then log "dry run complete for $SHORT — nothing published"; exit 0; fi

log "publishing $SHORT to Pages project $PROJECT (production, branch main)"
$WRANGLER pages deploy dist --project-name "$PROJECT" --branch main --commit-hash "$HEAD_SHA" --commit-dirty=false

for attempt in 1 2 3 4 5 6; do
  sleep 5
  LIVE=$(curl -fsS --max-time 20 "$SITE/config.js" | grep -o '"VERSION": *"[0-9a-f]*"' | grep -o '[0-9a-f]\{8\}' || true)
  [ "$LIVE" = "$SHORT" ] && break
  log "live VERSION is '${LIVE:-?}' (attempt $attempt), waiting for the edge"
done
if [ "$LIVE" != "$SHORT" ]; then log "live VERSION ${LIVE:-?} != $SHORT after 30 s; check the Pages dashboard"; exit 5; fi
curl -fsSI --max-time 20 "$SITE/" | grep -i '^content-security-policy' | head -1
log "live: $SITE serves $SHORT"
