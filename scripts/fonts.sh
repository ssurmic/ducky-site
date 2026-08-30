#!/usr/bin/env bash
# fonts.sh — produce the self-hosted JetBrains Mono subset used by public/css/site.css.
#
# The site never fetches fonts from the network at runtime (China reachability + CSP default-src 'self').
# The CSS declares @font-face → /fonts/JetBrainsMono-sub.woff2 with a full system-mono fallback stack,
# so a missing file only means the fallback is used. Run this once and commit the .woff2 (~15–25 KB).
#
# 1. Get the variable TTF (OFL-1.1) from https://github.com/JetBrains/JetBrainsMono/releases
#    e.g. JetBrainsMono-2.304.zip → fonts/variable/JetBrainsMono[wght].ttf  (or ttf/JetBrainsMono-Regular.ttf)
# 2. pip install fonttools brotli   (pyftsubset needs brotli for woff2)
# 3. scripts/fonts.sh /path/to/JetBrainsMono[wght].ttf
#
# Subset = ASCII + the symbols the mono strips/bubbles use (· → ↗ ↓ ← − × ≥ ≤ ÷ ≈ ≫ … ★ ¥ $ € £ ‰ ′ ″ ' " – —).
# CJK is deliberately NOT included — Chinese text renders with the system CJK stack (PingFang / Noto CJK).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${1:-}"
OUT="public/fonts/JetBrainsMono-sub.woff2"
if [ -z "$SRC" ] || [ ! -f "$SRC" ]; then
  echo "usage: scripts/fonts.sh /path/to/JetBrainsMono[wght].ttf   (see comments in this file)" >&2
  exit 2
fi
PYFT="${PYFTSUBSET:-pyftsubset}"
command -v "$PYFT" >/dev/null || { echo "pyftsubset not found: pip install fonttools brotli" >&2; exit 2; }
mkdir -p public/fonts
"$PYFT" "$SRC" \
  --output-file="$OUT" \
  --flavor=woff2 \
  --layout-features='kern,liga,calt,tnum,zero' \
  --unicodes='U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,U+2026,U+2032,U+2033,U+2190-2193,U+2197,U+2212,U+2248,U+2260,U+2264,U+2265,U+226B,U+00B7,U+00D7,U+00F7,U+2605,U+00A5,U+20AC,U+2030' \
  --no-hinting --desubroutinize
ls -la "$OUT"
echo "done — commit $OUT"
