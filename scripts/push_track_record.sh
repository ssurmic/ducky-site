#!/usr/bin/env bash
# push_track_record.sh — nightly notary (SYSTEMDESIGN.md §2 topology, §4 ops: ducky-site-push.timer 02:15 UTC).
#
# outcomes.py (02:00 UTC) writes $DUCKY_ROOT/.signals/export/{track-record,feed}.json (+ ideas.json from
# ideas_sync.py when present). This script copies them into the public ducky-site repo and commits ONLY when
# the content changed, so `git log public/track-record.json` is an append-only, timestamped public record.
#
# Env (all optional; secrets stay in ~/.env / EnvironmentFile, never on the command line):
#   DUCKY_ROOT             backend checkout            (default ~/invest-watchlist)
#   DUCKY_SITE_DIR         local clone of ducky-site   (default ~/.cache/ducky-site)
#   DUCKY_SITE_REPO        git remote                  (default git@github.com:ssurmic/ducky-site.git)
#   DUCKY_SITE_DEPLOY_KEY  path to the write deploy key (default ~/.ssh/ducky-site-deploy)
#   DUCKY_SITE_BRANCH      branch to push              (default main)
# Exit 0 on "no change". Any failure exits non-zero so the systemd unit shows it.
set -euo pipefail

DUCKY_ROOT="${DUCKY_ROOT:-$HOME/invest-watchlist}"
SITE_DIR="${DUCKY_SITE_DIR:-$HOME/.cache/ducky-site}"
REPO="${DUCKY_SITE_REPO:-git@github.com:ssurmic/ducky-site.git}"
KEY="${DUCKY_SITE_DEPLOY_KEY:-$HOME/.ssh/ducky-site-deploy}"
BRANCH="${DUCKY_SITE_BRANCH:-main}"
EXPORT="$DUCKY_ROOT/.signals/export"
FILES=(track-record.json feed.json ideas.json week-ahead.json)

log() { printf '%s push_track_record: %s\n' "$(date -u +%FT%TZ)" "$*" >&2; }

[ -d "$EXPORT" ] || { log "export dir missing: $EXPORT (has outcomes.py run?)"; exit 3; }

# the DGX's home-router DNS blips for minutes at a time (QA 2026-09-01: two runs died on
# 'Could not resolve hostname github.com') — wait out a blip instead of losing the night
for i in 1 2 3 4 5; do
  getent hosts github.com >/dev/null 2>&1 && break
  log "DNS for github.com not resolving (attempt $i/5) — sleeping 60s"
  [ "$i" = 5 ] && { log "DNS still down; giving up"; exit 4; }
  sleep 60
done
[ -s "$EXPORT/track-record.json" ] || { log "no track-record.json in $EXPORT"; exit 3; }
if [ -f "$KEY" ]; then
  export GIT_SSH_COMMAND="ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes"
else
  log "deploy key $KEY not found — using default ssh identity"
fi

# 1. clone or fast-forward the public site checkout
if [ ! -d "$SITE_DIR/.git" ]; then
  log "cloning $REPO → $SITE_DIR"
  git clone --quiet --branch "$BRANCH" --single-branch "$REPO" "$SITE_DIR"
fi
cd "$SITE_DIR"
git fetch --quiet origin "$BRANCH"
git checkout --quiet "$BRANCH"
git reset --quiet --hard "origin/$BRANCH"     # the export is the only writer of these files; never merge

# 2. validate + copy (schema sanity only; content is whatever outcomes.py exported — losers included)
PY="${PYTHON:-python3}"
for f in "${FILES[@]}"; do
  [ -s "$EXPORT/$f" ] || continue
  "$PY" - "$EXPORT/$f" "$f" <<'PYEOF'
import json, sys
p, name = sys.argv[1], sys.argv[2]
j = json.load(open(p, encoding="utf-8"))
if name == "track-record.json":
    assert j.get("schema") == 1 and j.get("generated_at") and isinstance(j.get("rows"), list), "track-record schema"
    assert all(k in j for k in ("by_source", "equity", "backtest")), "track-record keys"
    for r in j["rows"]:
        assert r.get("mode") in ("LIVE", "BACKTEST"), "row mode must be LIVE|BACKTEST"
elif name == "feed.json":
    assert j.get("generated_at") and isinstance(j.get("items"), list), "feed schema"
elif name == "ideas.json":
    assert isinstance(j.get("ideas"), list), "ideas schema"
elif name == "week-ahead.json":
    assert j.get("schema") == "week-ahead/1" and isinstance(j.get("events"), list), "week-ahead schema"
banned = ("ALL-IN", "买这只", "目标价", "满仓", "buy now", "现在买", "建议买入")
low = open(p, encoding="utf-8").read().lower()
hit = [b for b in banned if b.lower() in low]
assert not hit, f"banned string in export: {hit}"
PYEOF
  install -m 0644 "$EXPORT/$f" "public/$f"
done

# 3. commit only on diff
git add -- public/track-record.json public/feed.json public/ideas.json public/week-ahead.json 2>/dev/null || true
if git diff --cached --quiet; then
  log "no change — nothing to notarize"
  exit 0
fi
GEN="$("$PY" -c 'import json,sys;print(json.load(open(sys.argv[1])).get("generated_at",""))' public/track-record.json)"
git -c user.name="ducky-notary" -c user.email="notary@duckybot.app" \
  commit --quiet -m "notary: track-record $(date -u +%F) (generated_at=$GEN)" \
  -m "Nightly export from outcomes.py. Append-only; losers included; BACKTEST/LIVE labeled."
git push --quiet origin "$BRANCH"
log "pushed $(git rev-parse --short=8 HEAD) to $BRANCH"
