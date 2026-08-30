#!/usr/bin/env bash
# vendor.sh — self-host Lightweight Charts (Apache-2.0) under public/vendor/lightweight-charts/.
#
# SYSTEMDESIGN.md §5: no CDN, CSP script-src 'self'. The track-record page loads
#   /vendor/lightweight-charts/lightweight-charts.standalone.production.js
# and guards on `window.LightweightCharts` (a missing/stub file only degrades the equity curve to text).
#
# Usage:  scripts/vendor.sh [version]        (default 5.2.1; needs npm on PATH or at /opt/homebrew/bin/npm)
# Output: public/vendor/lightweight-charts/{lightweight-charts.standalone.production.js,LICENSE,VERSION}
set -euo pipefail
cd "$(dirname "$0")/.."
VER="${1:-5.2.1}"
OUT="public/vendor/lightweight-charts"
NPM="${NPM:-$(command -v npm || true)}"
[ -x "$NPM" ] || NPM=/opt/homebrew/bin/npm
if [ ! -x "$NPM" ]; then
  echo "vendor.sh: npm not found — leaving a stub; the page will fall back to a text equity summary" >&2
  exit 2
fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"
if ! (cd "$TMP" && "$NPM" pack "lightweight-charts@$VER" --silent >/dev/null 2>&1); then
  echo "vendor.sh: npm pack lightweight-charts@$VER failed (network?) — stub left in place" >&2
  exit 3
fi
tar -xzf "$TMP"/lightweight-charts-*.tgz -C "$TMP"
cp "$TMP/package/dist/lightweight-charts.standalone.production.js" "$OUT/"
cp "$TMP/package/LICENSE" "$OUT/LICENSE"
printf 'lightweight-charts %s\nsource: npm pack lightweight-charts@%s (dist/lightweight-charts.standalone.production.js)\nlicense: Apache-2.0 (see LICENSE)\n' "$VER" "$VER" > "$OUT/VERSION"
ls -la "$OUT"
echo "vendor.sh: done — commit $OUT/"
