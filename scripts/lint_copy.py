#!/usr/bin/env python3
"""lint_copy.py — compliance lint over dist/ (SYSTEMDESIGN.md §0 invariant 5, §5 CI).

Checks (exit 1 on any failure):
  1. banned strings anywhere in dist/ (case-insensitive): ALL-IN 买这只 目标价 满仓 buy now 现在买 建议买入
  2. every element carrying data-winrate also carries data-n
  3. both disclaimer lines exist in dist/index.html and dist/en/index.html (zh + en variants)
  4. no private identifiers leak into the public site (supergroup chat id, personal email, private handles)
  5. no third-party <script src="http…"> on any page (landing has no third-party scripts)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"

BANNED = re.compile(r"ALL-IN|买这只|目标价|满仓|buy now|现在买|建议买入", re.IGNORECASE)
PRIVATE = re.compile(r"-100\d{9,}|@DuckyAgentBot|Baobao|DakiDaki|Duckyduckyduck\b|gmail\.com|choppyducky", re.IGNORECASE)
TAG_WITH_WINRATE = re.compile(r"<[^>]*\bdata-winrate\b[^>]*>")
EXTERNAL_SCRIPT = re.compile(r"""<script[^>]+src=["']https?://""", re.IGNORECASE)
DISCLAIMER_LINES = {
    "en.backtest": "backtests are hypothetical and exclude fees, slippage and taxes",
    "en.affiliation": "Not affiliated with Telegram, the SEC, or any issuer named",
    "zh.backtest": "回测为假设性结果，不含手续费、滑点与税费",
    "zh.affiliation": "与 Telegram、美国证监会（SEC）或文中提到的任何发行人均无关联",
}
MUST_HAVE_DISCLAIMER = ["index.html", "en/index.html"]
TEXT_EXT = {".html", ".js", ".css", ".xml", ".txt", ".json", ".webmanifest", ".svg", ""}


def main() -> int:
    if not DIST.is_dir():
        print("lint_copy: dist/ missing — run build.py first")
        return 1
    errors: list[str] = []
    files = [p for p in DIST.rglob("*") if p.is_file() and p.suffix in TEXT_EXT]

    for p in files:
        rel = p.relative_to(DIST)
        try:
            text = p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for m in BANNED.finditer(text):
            line = text.count("\n", 0, m.start()) + 1
            errors.append(f"{rel}:{line}: banned string {m.group()!r}")
        for m in PRIVATE.finditer(text):
            line = text.count("\n", 0, m.start()) + 1
            errors.append(f"{rel}:{line}: private identifier leaked {m.group()!r}")
        if p.suffix == ".html":
            for m in TAG_WITH_WINRATE.finditer(text):
                if "data-n=" not in m.group():
                    line = text.count("\n", 0, m.start()) + 1
                    errors.append(f"{rel}:{line}: data-winrate without data-n: {m.group()[:80]}")
            for m in EXTERNAL_SCRIPT.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                errors.append(f"{rel}:{line}: third-party script tag: {m.group()}")

    for rel in MUST_HAVE_DISCLAIMER:
        p = DIST / rel
        if not p.exists():
            errors.append(f"{rel}: missing")
            continue
        text = p.read_text(encoding="utf-8")
        for name, needle in DISCLAIMER_LINES.items():
            if needle.casefold() not in text.casefold():
                errors.append(f"{rel}: disclaimer line missing ({name}): {needle!r}")

    if errors:
        print("lint_copy: FAIL")
        for e in errors:
            print("  " + e)
        return 1
    n_win = sum(len(TAG_WITH_WINRATE.findall(p.read_text(encoding="utf-8"))) for p in files if p.suffix == ".html")
    print(f"lint_copy: OK — {len(files)} files scanned, 0 banned strings, {n_win} win-rate tags all carry data-n, "
          f"disclaimer lines present in {', '.join(MUST_HAVE_DISCLAIMER)}, no third-party scripts")
    return 0


if __name__ == "__main__":
    sys.exit(main())
