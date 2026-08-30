#!/usr/bin/env python3
"""build.py — render ducky-site: Jinja2 × {zh, en} → dist/ (zh at /, en at /en/).

Usage:  python3 build.py [--api-base URL]

What it does (see SYSTEMDESIGN.md §5):
  * every templates/*.html (except _base / _partials / _*.tpl) is rendered once per language
  * t(key) reads i18n/<lang>.json — flat keys; the build FAILS if the two key sets differ
  * public/ is copied verbatim into dist/
  * dist/config.js, dist/_headers (CSP), dist/sitemap.xml are generated from site.config.json
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
LANGS = ("zh", "en")                     # zh is the default, no-prefix locale
HREFLANG = {"zh": "zh-CN", "en": "en"}
HTML_LANG = {"zh": "zh-CN", "en": "en"}
ASSET_RE = re.compile(r'((?:href|src)=")(/[^"?#]+\.(?:css|js|svg|woff2|webmanifest|png|webp|json))(")')
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


def build_context(cfg: dict, tables: dict, lang: str, page: str, rel: str, version: str) -> dict:
    table = tables[lang]
    other = "en" if lang == "zh" else "zh"

    def t(key: str) -> str:
        try:
            return table[key]
        except KeyError:
            fail(f"missing i18n key '{key}' for lang '{lang}' (page {page})")

    def t2(key: str) -> str:  # same key in the other language (bilingual footer)
        return tables[other][key]

    def tg(slug: str) -> str:
        return cfg["deeplink"]["pattern"].format(bot=cfg["bot"], slug=slug)

    channel_url = f"https://t.me/{cfg['channel']}" if cfg.get("channel") else None

    def primary(slug: str) -> str:  # "join the free channel" CTA; channel null → bot deep link
        return channel_url or tg(slug)

    def url(rel_path: str, for_lang: str | None = None) -> str:  # '/disclaimer/' -> localized path
        return f"{lang_prefix(for_lang or lang)}{rel_path}"

    return {
        "lang": lang, "html_lang": HTML_LANG[lang], "other_lang": other, "is_zh": lang == "zh",
        "page": page, "t": t, "t2": t2, "tg": tg, "primary": primary, "url": url,
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


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--api-base", help="override api_base from site.config.json")
    args = ap.parse_args()

    cfg, tables, version = load_config(args.api_base), load_i18n(), git_sha()
    pages, env = page_targets(), make_env()

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(PUBLIC, DIST)
    font = PUBLIC / "fonts" / "JetBrainsMono-sub.woff2"
    if not font.exists():
        print("build.py: note: public/fonts/JetBrainsMono-sub.woff2 missing — system mono fallback "
              "will be used; see scripts/fonts.sh")

    count = 0
    for tpl_name, rel in pages:
        tpl = env.get_template(tpl_name)
        for lang in LANGS:
            ctx = build_context(cfg, tables, lang, Path(tpl_name).stem, rel, version)
            html = version_assets(tpl.render(**ctx), version)
            out = DIST / lang_prefix(lang).strip("/") / rel
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(html, encoding="utf-8")
            count += 1

    write_config_js(cfg, version)
    n_imports = version_module_imports(version)
    headers = env.get_template("_headers.tpl").render(cfg=cfg)
    (DIST / "_headers").write_text(headers.rstrip() + "\n", encoding="utf-8")
    write_sitemap(cfg, pages, datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    print(f"build.py: rendered {count} pages ({len(pages)} templates × {len(LANGS)} langs) "
          f"→ {DIST.relative_to(ROOT)}/  version={version}  api_base={cfg['api_base']}  "
          f"module imports versioned={n_imports}")


if __name__ == "__main__":
    main()
