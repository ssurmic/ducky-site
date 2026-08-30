#!/usr/bin/env bash
# serve.sh — serve dist/ locally (build first). Usage: scripts/serve.sh [port]
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-8000}"
[ -d dist ] || python3 build.py
echo "→ http://localhost:${PORT}/   (zh)   http://localhost:${PORT}/en/   (en)"
exec python3 -m http.server "$PORT" --directory dist --bind 127.0.0.1
