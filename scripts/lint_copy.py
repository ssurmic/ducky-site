#!/usr/bin/env python3
"""lint_copy.py — compliance lint over dist/ (SYSTEMDESIGN.md §0 invariant 5, §5 CI).

Checks (exit 1 on any failure):
  1. banned strings anywhere in dist/ (case-insensitive): ALL-IN 买这只 目标价 满仓 buy now 现在买 建议买入
  2. every element carrying data-winrate also carries data-n="<integer>" (a real N, not a caveat string)
  3. both disclaimer lines exist in dist/index.html and dist/en/index.html (zh + en variants)
  4. no private identifiers leak into the public site (supergroup chat id, personal email, private handles)
  5. no third-party <script src="http…"> on any page (landing has no third-party scripts)
  6. brand + implementation terms banned from user-facing copy (SYSTEMDESIGN.md §5.1): "Ducky Bot", model /
     hardware / storage names, competitor names — checked everywhere in dist/ except vendor/ and the nightly
     data exports (track-record.json, feed.json, ideas.json)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
I18N = ROOT / "i18n"

BANNED = re.compile(r"ALL-IN|买这只|目标价|满仓|buy now|现在买|建议买入", re.IGNORECASE)
# §5.1 brand + "how we describe the tech" rules — separate from the compliance strings above. The product is
# "Ducky TradeBot"; the tech is "AI-backed / AI 驱动" and nothing more; no competitor names. vendor/ is skipped.
BANNED_IMPL = re.compile(
    r"本地大模型|大语言模型|\bLLMs?\b|Qwen|Ollama|GB10|\bDGX\b|一台本地机器|本地机器|云成本|云 ?API|self-hosted|"
    r"\bSQLite\b|Unusual Whales|千亿|\b80B\b|\bDucky[ -]Bot\b|local (?:model|LLM|box)|runs on one box|"
    r"\bone box\b|本地模型",
    re.IGNORECASE)
VENDOR_DIR = "vendor"
# nightly data exports (outcomes.py → push_track_record.sh) carry third-party headlines, e.g. a blog title naming a
# model — they are data, not our copy, so only the compliance BANNED / PRIVATE checks apply to them
DATA_EXPORTS = {"track-record.json", "feed.json", "ideas.json"}
PRIVATE = re.compile(r"-100\d{9,}|@DuckyAgentBot|Baobao|DakiDaki|Duckyduckyduck\b|gmail\.com|choppyducky", re.IGNORECASE)
TAG_WITH_WINRATE = re.compile(r"<[^>]*\bdata-winrate\b[^>]*>")
DATA_N_INT = re.compile(r"""\bdata-n=["'](\d+)["']""")
EXTERNAL_SCRIPT = re.compile(r"""<script[^>]+src=["']https?://""", re.IGNORECASE)
DISCLAIMER_LINES = {
    "en.backtest": "backtests are hypothetical and exclude fees, slippage and taxes",
    "en.affiliation": "Not affiliated with Telegram, the SEC, or any issuer named",
    "zh.backtest": "回测为假设性结果，不含手续费、滑点与税费",
    "zh.affiliation": "与 Telegram、美国证监会（SEC）或文中提到的任何发行人均无关联",
}
MUST_HAVE_DISCLAIMER = ["index.html", "en/index.html"]
TEXT_EXT = {".html", ".js", ".css", ".xml", ".txt", ".json", ".webmanifest", ".svg", ""}


# §5.1 i18n hygiene — an EN config value must never contain Chinese, and a ZH value must never carry stray Latin
# prose. We only hard-fail the EN→CJK direction (the user-reported failure: Chinese leaking onto the English page).
# The allowlist below is the *complete* set of EN keys allowed to hold CJK: every one is a deliberate bilingual
# toggle (a control that shows the OTHER language's name) or a stamp that is bilingual by design. Adding a new EN
# string with Chinese in it fails CI until the string is translated or the key is consciously allowlisted here.
CJK = re.compile(r"[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff]")
EN_CJK_ALLOW = {
    "nav.lang_toggle",       # "中文"  — switch-to-Chinese control
    "nav.lang_toggle_aria",  # "切换到中文" — its aria-label
    "footer.lang_other",     # "中文"  — footer language switch
    "app.nav.lang",          # "中文"  — Mini App language switch
    "hero.eyebrow",          # "… · 中文 / EN" — advertises bilingual availability
    "label.copy_caption",    # "Copy caption (中文 / EN)" — copies the bilingual caption
    "data.log_not_call",     # "记录，不是荐股 / a log, not a call" — bilingual by design
}


def check_i18n_en_cjk() -> list[str]:
    import json
    errs: list[str] = []
    enp = I18N / "en.json"
    if not enp.exists():
        return errs
    en = json.loads(enp.read_text(encoding="utf-8"))
    for k, v in en.items():
        if isinstance(v, str) and CJK.search(v) and k not in EN_CJK_ALLOW:
            errs.append(f"i18n/en.json: EN value {k!r} contains Chinese: {v!r} "
                        f"(translate it, or allowlist the key in lint_copy.EN_CJK_ALLOW if it is a deliberate toggle)")
    return errs


TEMPLATES = ROOT / "templates"
JINJA = re.compile(r"\{\{.*?\}\}|\{%.*?%\}|\{#.*?#\}", re.DOTALL)


def check_template_hardcoded_cjk() -> list[str]:
    """No Chinese may be hardcoded in a shared template — all visible copy must route through t()/t2() so each
    language renders cleanly. A CJK run left after stripping Jinja expressions/blocks/comments is a hardcode that
    would leak onto the other language's page (e.g. an aria-label or a bubble prefix)."""
    errs: list[str] = []
    if not TEMPLATES.is_dir():
        return errs
    for tp in sorted(TEMPLATES.rglob("*.html")):
        text = tp.read_text(encoding="utf-8")
        stripped = JINJA.sub("", text)
        for m in CJK.finditer(stripped):
            line = stripped.count("\n", 0, m.start()) + 1
            ctx = stripped[max(0, m.start() - 20):m.start() + 20].replace("\n", " ").strip()
            errs.append(f"templates/{tp.relative_to(TEMPLATES)}:~{line}: hardcoded Chinese in template "
                        f"(route it through t()/t2()): …{ctx}…")
    return errs


# The mirror of check_i18n_en_cjk: a ZH value must not be untranslated English prose (owner rule: "英文配置里不
#能有中文，反之亦然"). Heuristic — a value with NO CJK that still packs 3+ English words (len>=3) is almost always
# a leak (an English example left untranslated). Pure tickers / codes / crypto-network names have too few words to
# trip it; the few legitimate all-Latin ZH values (stylised demo-alert headers, crypto rails, dev comments) are
# allowlisted explicitly.
ZH_EN_ALLOW = {
    "hero.b1_l1", "feed.a_l1",   # stylised demo-alert headers ("🚨🟢 INSIDER BUY — $1.12M / $TTMI"), same in both langs
    "billing.rail_usdc_trc20",   # "USDC · TRON TRC20" — a crypto network name, universal
    "app._comment",              # a developer note, never rendered
}
_EN_WORD = re.compile(r"[A-Za-z]{3,}")


def check_i18n_zh_english() -> list[str]:
    import json
    errs: list[str] = []
    zhp = I18N / "zh.json"
    if not zhp.exists():
        return errs
    zh = json.loads(zhp.read_text(encoding="utf-8"))
    for k, v in zh.items():
        if not isinstance(v, str) or k in ZH_EN_ALLOW:
            continue
        if CJK.search(v):            # has Chinese → fine
            continue
        if len(_EN_WORD.findall(v)) >= 3:
            errs.append(f"i18n/zh.json: ZH value {k!r} looks like untranslated English: {v!r} "
                        f"(translate it, or allowlist the key in lint_copy.ZH_EN_ALLOW if it is intentional)")
    return errs


def main() -> int:
    if not DIST.is_dir():
        print("lint_copy: dist/ missing — run build.py first")
        return 1
    errors: list[str] = []
    errors += check_i18n_en_cjk()
    errors += check_i18n_zh_english()
    errors += check_template_hardcoded_cjk()
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
        if VENDOR_DIR not in rel.parts and rel.name not in DATA_EXPORTS:
            for m in BANNED_IMPL.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                errors.append(f"{rel}:{line}: implementation/brand term in copy {m.group()!r} (SYSTEMDESIGN §5.1)")
        if p.suffix == ".html":
            for m in TAG_WITH_WINRATE.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                if "data-n=" not in m.group():
                    errors.append(f"{rel}:{line}: data-winrate without data-n: {m.group()[:80]}")
                elif not DATA_N_INT.search(m.group()):
                    errors.append(f"{rel}:{line}: data-n is not an integer N (§0.5): {m.group()[:80]}")
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
    print(f"lint_copy: OK — {len(files)} files scanned, 0 banned strings, 0 implementation/brand terms, "
          f"{n_win} win-rate tags all carry an integer data-n, disclaimer lines present in {', '.join(MUST_HAVE_DISCLAIMER)}, "
          f"no third-party scripts, EN config free of Chinese, ZH config free of untranslated English, no hardcoded CJK in templates")
    return 0


if __name__ == "__main__":
    sys.exit(main())
