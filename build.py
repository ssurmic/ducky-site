#!/usr/bin/env python3
"""build.py — render ducky-site: Jinja2 × {zh, en} → dist/ (zh at /, en at /en/).

Usage:  python3 build.py [--api-base URL]

What it does (see SYSTEMDESIGN.md §5):
  * every templates/*.html (except _base / _partials / _*.tpl) is rendered once per language
  * t(key) reads i18n/<lang>.json — flat keys; the build FAILS if the two key sets differ
  * public/ is copied verbatim into dist/
  * dist/config.js, dist/_headers (CSP), dist/sitemap.xml are generated from site.config.json
  * public/receipts/liquidity-2026.json + liquidity-score-2026.csv are read at build time: the 🌊 USD-liquidity
    receipt card renders its numbers and an inline SVG sparkline (2026 daily score, dot on the signal day) from
    them, so the landing stays fully static (no runtime fetch)
  * public/track-record.json (the nightly notary) supplies `track_n` = backtest.kindex.n — the numeric N printed
    beside every K-index win-rate on the landing (SYSTEMDESIGN §0.5: every win-rate carries its N=); the build
    fails when that number is missing rather than print a rate without it
  * local asset URLs get ?v=<git sha8 | 'dev'> appended — in HTML href/src AND in the relative ES-module
    specifiers under dist/js/app/ (static `from "./x.js"` and dynamic `import("./views/x.js")`), so the
    immutable /js/* cache (_headers) can never pair a new main.js with a year-old tg.js/api.js
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape

ROOT = Path(__file__).resolve().parent
TEMPLATES, I18N, PUBLIC, DIST = ROOT / "templates", ROOT / "i18n", ROOT / "public", ROOT / "dist"
CONFIG = ROOT / "site.config.json"
RECEIPTS = PUBLIC / "receipts"
LIQ_JSON, LIQ_CSV = RECEIPTS / "liquidity-2026.json", RECEIPTS / "liquidity-score-2026.csv"
TRACK_JSON = PUBLIC / "track-record.json"
LIQ_EVENT = "2026-04-08"                 # first 🟢 ABUNDANT print of 2026 (SYSTEMDESIGN §5.2 A)
LIQ_ABUNDANT = 80                        # regime threshold drawn on the sparkline
BRAND_ASSETS = ("avatar-group.jpg", "mascot.svg", "og.svg")   # must land in dist/ (§5.1 avatar rule)
LANGS = ("zh", "en")                     # zh is the default, no-prefix locale
HREFLANG = {"zh": "zh-CN", "en": "en"}
HTML_LANG = {"zh": "zh-CN", "en": "en"}
ASSET_RE = re.compile(r'((?:href|src)=")(/[^"?#]+\.(?:css|js|svg|woff2|webmanifest|png|webp|jpg|jpeg|json))(")')
# relative ES-module specifiers: `from "./tg.js"`, `import("./views/login.js")`, `import("../api.js")`
IMPORT_RE = re.compile(r'''((?:\bfrom\s+|\bimport\s*\(\s*)["'])(\.{1,2}/[^"'?#]+\.js)(["'])''')


def fail(msg: str) -> None:
    print(f"build.py: ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def git_sha() -> str:
    try:
        out = subprocess.run(["git", "rev-parse", "--short=8", "HEAD"], cwd=ROOT,
                             capture_output=True, text=True, timeout=5)
        sha = out.stdout.strip()
        return sha if out.returncode == 0 and re.fullmatch(r"[0-9a-f]{8}", sha) else "dev"
    except (OSError, subprocess.SubprocessError):
        return "dev"


def load_config(api_base: str | None) -> dict:
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    if api_base:
        cfg["api_base"] = api_base.rstrip("/")
    for key in ("domain", "site_url", "bot", "miniapp", "api_base", "prices"):
        if key not in cfg:
            fail(f"site.config.json missing '{key}'")
    p = cfg["prices"]
    for tier in ("signal", "pro"):
        m, a = p[tier]["monthly_usd"], p[tier]["annual_usd"]
        p[tier]["save_pct"] = round((1 - a / (m * 12)) * 100)
    return cfg


def load_i18n() -> dict[str, dict[str, str]]:
    tables = {lang: json.loads((I18N / f"{lang}.json").read_text(encoding="utf-8")) for lang in LANGS}
    base = set(tables[LANGS[0]])
    for lang in LANGS[1:]:
        diff = base ^ set(tables[lang])
        if diff:
            fail(f"i18n key sets differ between {LANGS[0]} and {lang}: {sorted(diff)[:20]}")
    return tables


def page_targets() -> list[tuple[str, str]]:
    """(template name, output path relative to the language root)."""
    out = []
    for p in sorted(TEMPLATES.glob("*.html")):
        if p.name.startswith("_"):
            continue
        stem = p.stem
        rel = "index.html" if stem == "index" else "404.html" if stem == "404" else f"{stem}/index.html"
        out.append((p.name, rel))
    if not out:
        fail("no templates found")
    return out


def lang_prefix(lang: str) -> str:
    return "" if lang == "zh" else f"/{lang}"


def page_url(lang: str, rel: str) -> str:
    """Public URL path of an output file, e.g. ('en', 'disclaimer/index.html') -> '/en/disclaimer/'."""
    path = rel[: -len("index.html")] if rel.endswith("index.html") else rel
    return f"{lang_prefix(lang)}/{path}"


def make_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(TEMPLATES),
        autoescape=select_autoescape(["html", "tpl"], default=True),
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )


def version_assets(html: str, version: str) -> str:
    return ASSET_RE.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={version}{m.group(3)}", html)


def version_imports(js: str, version: str) -> str:
    return IMPORT_RE.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={version}{m.group(3)}", js)


def version_module_imports(version: str) -> int:
    """Append ?v=<version> to every relative import specifier under dist/js/app/ (the SPA's ES
    modules). Returns the number of specifiers rewritten. Vendored classic scripts are untouched."""
    n = 0
    for p in sorted((DIST / "js" / "app").rglob("*.js")):
        txt = p.read_text(encoding="utf-8")
        new, k = IMPORT_RE.subn(lambda m: f"{m.group(1)}{m.group(2)}?v={version}{m.group(3)}", txt)
        if k:
            p.write_text(new, encoding="utf-8")
            n += k
    return n


def load_liquidity() -> dict:
    """Read the 🌊 USD-liquidity receipt data (public/receipts/) and pre-compute everything the templates
    print: formatted numbers for the exact §5.2 copy, plus an inline SVG sparkline of the 2026 daily score
    with a dot on the signal day. Pure data → the page stays static."""
    if not LIQ_JSON.exists() or not LIQ_CSV.exists():
        fail(f"liquidity receipt data missing: {LIQ_JSON.name} / {LIQ_CSV.name}")
    data = json.loads(LIQ_JSON.read_text(encoding="utf-8"))
    res = data["results"].get(LIQ_EVENT)
    if not res:
        fail(f"{LIQ_JSON.name}: no results for {LIQ_EVENT}")

    rows: list[tuple[str, float, str, float, float]] = []
    with LIQ_CSV.open(encoding="utf-8", newline="") as fh:
        for i, line in enumerate(fh):
            parts = line.rstrip("\n").split(",")
            if i == 0 or len(parts) < 5 or not parts[0]:
                continue
            rows.append((parts[0], float(parts[1]), parts[2], float(parts[3]), float(parts[4])))
    if not rows:
        fail(f"{LIQ_CSV.name}: empty")
    idx = {d: i for i, (d, *_rest) in enumerate(rows)}
    if LIQ_EVENT not in idx:
        fail(f"{LIQ_CSV.name}: no row for {LIQ_EVENT}")
    k = idx[LIQ_EVENT]
    _, score, regime, spread_bp, chg13w = rows[k]

    # sparkline geometry (viewBox units; the SVG scales with the card)
    w, h, pad = 240, 56, 3
    n = len(rows)
    def xy(i: int, v: float) -> tuple[float, float]:
        x = pad + (w - 2 * pad) * (i / (n - 1) if n > 1 else 0)
        y = pad + (h - 2 * pad) * (1 - max(0.0, min(100.0, v)) / 100)
        return round(x, 1), round(y, 1)
    pts = [xy(i, r[1]) for i, r in enumerate(rows)]
    path = "M" + " L".join(f"{x},{y}" for x, y in pts)
    area = f"{path} L{pts[-1][0]},{h - pad} L{pts[0][0]},{h - pad} Z"
    dot_x, dot_y = pts[k]
    y80 = xy(0, LIQ_ABUNDANT)[1]

    def pct(v: float) -> str:
        return f"{v:+.1f}%"

    fmt = {
        "date": LIQ_EVENT, "as_of": res.get("as_of", ""),
        "score": f"{score:.0f}", "spread_bp": f"{abs(spread_bp):.0f}",
        "chg13w_b": f"{chg13w:.0f}", "chg13w_yi": f"{round(chg13w) * 10:.0f}",
        "qqq_1w": pct(res["QQQ"]["ret_1w"]), "qqq_1m": pct(res["QQQ"]["ret_1m"]),
        "qqq_3m": pct(res["QQQ"]["ret_3m"]), "qqq_now": pct(res["QQQ"]["ret_pct"]),
        "qqq_px0": f"{res['QQQ']['px0']:.0f}", "qqq_px1": f"{res['QQQ']['px_now']:.0f}",
        "spy_now": pct(res["SPY"]["ret_pct"]), "spy_1w": pct(res["SPY"]["ret_1w"]),
        "spy_1m": pct(res["SPY"]["ret_1m"]), "spy_3m": pct(res["SPY"]["ret_3m"]),
        "smh_now": pct(res["SMH"]["ret_pct"]), "smh_1w": pct(res["SMH"]["ret_1w"]),
        "smh_1m": pct(res["SMH"]["ret_1m"]), "smh_3m": pct(res["SMH"]["ret_3m"]),
        "n": 1,
    }
    return {
        "event": LIQ_EVENT, "as_of": fmt["as_of"], "score": score, "regime": regime, "fmt": fmt,
        "results": res, "tickers": ("QQQ", "SPY", "SMH"), "label": data.get("label", "BACKTEST · N=1"),
        "spark": {"w": w, "h": h, "path": path, "area": area, "dot_x": dot_x, "dot_y": dot_y, "y80": y80,
                  "first": rows[0][0], "last": rows[-1][0], "n": n},
    }


def load_track_n() -> int:
    """N of the K-index backtest the landing quotes (backtest.kindex.n in public/track-record.json = the
    number of K<1 fires the ledger holds; the SMH 60-day figure is computed over those same fires).
    A landing that prints a win-rate must print its N, so a missing/non-numeric value fails the build."""
    if not TRACK_JSON.exists():
        fail(f"{TRACK_JSON.name} missing — the landing's win-rate needs backtest.kindex.n")
    try:
        doc = json.loads(TRACK_JSON.read_text(encoding="utf-8"))
        n = int(((doc.get("backtest") or {}).get("kindex") or {}).get("n"))
    except (ValueError, TypeError, json.JSONDecodeError) as e:
        fail(f"{TRACK_JSON.name}: backtest.kindex.n missing or not an integer ({e}) — run the nightly export first")
    if n <= 0:
        fail(f"{TRACK_JSON.name}: backtest.kindex.n must be > 0 (got {n})")
    return n


def build_context(cfg: dict, tables: dict, lang: str, page: str, rel: str, version: str, liq: dict,
                  track_n: int = 0) -> dict:
    table = tables[lang]
    other = "en" if lang == "zh" else "zh"

    def t(key: str) -> str:
        try:
            return table[key]
        except KeyError:
            fail(f"missing i18n key '{key}' for lang '{lang}' (page {page})")

    def t2(key: str) -> str:  # same key in the other language (bilingual footer)
        return tables[other][key]

    def tf(key: str, **kw) -> str:  # t() + str.format — for copy that prints build-time numbers ({qqq_now} …)
        try:
            return t(key).format(**kw)
        except (KeyError, IndexError, ValueError) as e:
            fail(f"i18n key '{key}' ({lang}): bad placeholder {e}")

    def tg(slug: str) -> str:
        return cfg["deeplink"]["pattern"].format(bot=cfg["bot"], slug=slug)

    channel_url = f"https://t.me/{cfg['channel']}" if cfg.get("channel") else None

    def primary(slug: str) -> str:  # "join the free channel" CTA; channel null → bot deep link
        return channel_url or tg(slug)

    def url(rel_path: str, for_lang: str | None = None) -> str:  # '/disclaimer/' -> localized path
        return f"{lang_prefix(for_lang or lang)}{rel_path}"

    return {
        "lang": lang, "html_lang": HTML_LANG[lang], "other_lang": other, "is_zh": lang == "zh",
        "page": page, "t": t, "t2": t2, "tf": tf, "tg": tg, "primary": primary, "url": url, "liq": liq,
        "track_n": track_n,
        "cfg": cfg, "prices": cfg["prices"], "channel_url": channel_url, "has_channel": bool(channel_url),
        "bot_url": f"https://t.me/{cfg['bot']}", "miniapp_url": f"https://t.me/{cfg['bot']}/{cfg['miniapp']}",
        "canonical": cfg["site_url"] + page_url(lang, rel),
        "alt_url": page_url(other, rel),
        "hreflang": {HREFLANG[l]: cfg["site_url"] + page_url(l, rel) for l in LANGS},
        "x_default": cfg["site_url"] + page_url("zh", rel),
        "og_image": cfg["site_url"] + cfg.get("og_image", "/og.svg"),
        "version": version, "build_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }


def write_config_js(cfg: dict, version: str) -> None:
    data = {
        "API_BASE": cfg["api_base"], "BOT": cfg["bot"], "MINIAPP": cfg["miniapp"],
        "CHANNEL": cfg.get("channel"), "TRACK_JSON": cfg.get("track_json", "/track-record.json"),
        "FEED_JSON": cfg.get("feed_json", "/feed.json"), "PRICES": cfg["prices"], "VERSION": version,
    }
    body = json.dumps(data, ensure_ascii=False, indent=2)
    (DIST / "config.js").write_text(
        f"// generated by build.py from site.config.json — do not edit\n"
        f"window.DUCKY = Object.freeze({body});\n", encoding="utf-8")


def write_sitemap(cfg: dict, pages: list[tuple[str, str]], today: str) -> None:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
             'xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for _, rel in pages:
        if rel == "404.html":
            continue
        alts = "".join(f'<xhtml:link rel="alternate" hreflang="{HREFLANG[l]}" '
                       f'href="{cfg["site_url"]}{page_url(l, rel)}"/>' for l in LANGS)
        alts += f'<xhtml:link rel="alternate" hreflang="x-default" href="{cfg["site_url"]}{page_url("zh", rel)}"/>'
        for lang in LANGS:
            lines.append(f'  <url><loc>{cfg["site_url"]}{page_url(lang, rel)}</loc>'
                         f'<lastmod>{today}</lastmod>{alts}</url>')
    lines.append("</urlset>")
    (DIST / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_glossary(dist):
    src = ROOT / "i18n" / "glossary.json"
    if src.exists():
        (dist / "glossary.json").write_text(src.read_text(encoding="utf-8"), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--api-base", help="override api_base from site.config.json")
    args = ap.parse_args()

    cfg, tables, version = load_config(args.api_base), load_i18n(), git_sha()
    pages, env, liq, track_n = page_targets(), make_env(), load_liquidity(), load_track_n()

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(PUBLIC, DIST)          # public/ is copied whole (avatar-group.jpg, mascot.svg, receipts/ …)
    for name in BRAND_ASSETS:
        if not (DIST / name).is_file():
            fail(f"brand asset public/{name} missing from dist/ (SYSTEMDESIGN §5.1 avatar rule)")
    # favicon.svg is the legacy fallback path: always the same bytes as mascot.svg
    shutil.copyfile(DIST / "mascot.svg", DIST / "favicon.svg")
    font = PUBLIC / "fonts" / "JetBrainsMono-sub.woff2"
    if not font.exists():
        print("build.py: note: public/fonts/JetBrainsMono-sub.woff2 missing — system mono fallback "
              "will be used; see scripts/fonts.sh")

    count = 0
    for tpl_name, rel in pages:
        tpl = env.get_template(tpl_name)
        for lang in LANGS:
            ctx = build_context(cfg, tables, lang, Path(tpl_name).stem, rel, version, liq, track_n)
            html = version_assets(tpl.render(**ctx), version)
            out = DIST / lang_prefix(lang).strip("/") / rel
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(html, encoding="utf-8")
            count += 1

    write_config_js(cfg, version)
    write_glossary(DIST)
    n_imports = version_module_imports(version)
    headers = env.get_template("_headers.tpl").render(cfg=cfg)
    (DIST / "_headers").write_text(headers.rstrip() + "\n", encoding="utf-8")
    write_sitemap(cfg, pages, datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    print(f"build.py: rendered {count} pages ({len(pages)} templates × {len(LANGS)} langs) "
          f"→ {DIST.relative_to(ROOT)}/  version={version}  api_base={cfg['api_base']}  "
          f"module imports versioned={n_imports}")


if __name__ == "__main__":
    main()
