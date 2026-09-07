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
  * app modules live together under /app-assets/<content hash>/ with relative imports. Their
    bytes never change at a published URL, including when a browser ignores a query cache key.
    Other local asset URLs and legacy app paths retain the ?v=<git sha8> convention.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import re
import shutil
import subprocess
import sys
import tarfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape
from markupsafe import Markup

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
APP_RELEASE_HISTORY = 32  # bounded complete graphs, not individual files from mixed releases


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


def validate_app_strings(html: str, table: dict, lang: str) -> None:
    match = re.search(r'<script type="application/json" id="ducky-strings">(.*?)</script>', html, re.S)
    expected = {k[4:]:v for k,v in table.items() if k.startswith("app.")}
    if not match or json.loads(match.group(1)) != expected:
        fail(f"incomplete embedded app translations: {lang}")


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


def load_home_stories() -> list[dict]:
    """Small, dated landing examples derived from the existing public evidence artifact."""
    doc = json.loads((PUBLIC / 'media/ducky-demo-cases-2026-09-07.json').read_text())
    stories = []
    for key, window in [('nok', 'first_20_after_announcement'), ('glw', 'whole_path'), ('hood', 'after_disclosure_20')]:
        source = doc['cases'][key]
        data = source[window]
        points = data['path']
        values = [p['return_pct'] for p in points]
        if not values or any(not math.isfinite(v) for v in values):
            fail('invalid homepage historical path: ' + key)
        low, high = min(0, min(values)), max(0, max(values))
        span = high - low or 1
        coords = ' '.join(f'{12 + i / max(1,len(values)-1) * 336:.2f},{16 + (high-v)/span*72:.2f}' for i,v in enumerate(values))
        stories.append(dict(key=key, ticker=key.upper(), source_url=source['source_url'],
            start=data['start'], end=data['end'], change=f"{data['return_pct']:+.1f}%",
            negative=data['return_pct'] < 0, points=coords, zero_y=16+high/span*72,
            price_start=f"{data['base_close']:.2f}", price_end=f"{data['end_close']:.2f}"))
    return stories


def lang_prefix(lang: str) -> str:
    return "" if lang == "zh" else f"/{lang}"


def page_url(lang: str, rel: str) -> str:
    """Public URL path of an output file, e.g. ('en', 'disclaimer/index.html') -> '/en/disclaimer/'."""
    path = rel[: -len("index.html")] if rel.endswith("index.html") else rel
    return f"{lang_prefix(lang)}/{path}"


def app_icon_sprite() -> Markup:
    """Ship the shared local symbols with the revalidated app shell, not a stale CDN URL."""
    namespace = "http://www.w3.org/2000/svg"
    ET.register_namespace("", namespace)
    svg = ET.parse(PUBLIC / "vendor" / "lucide" / "icons.svg").getroot()
    svg.attrib.update({"class": "app-icon-defs", "width": "0", "height": "0",
                       "aria-hidden": "true", "focusable": "false"})
    seen = set()
    for symbol in svg:
        name = symbol.get("id", "")
        if symbol.tag != f"{{{namespace}}}symbol" or not re.fullmatch(r"[a-z][a-z0-9-]*", name) or name in seen:
            fail("invalid or duplicate app icon symbol")
        seen.add(name)
        symbol.set("id", "ducky-icon-" + name)
    return Markup(ET.tostring(svg, encoding="unicode"))


def make_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(TEMPLATES),
        autoescape=select_autoescape(["html", "tpl"], default=True),
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )


def version_assets(html: str, version: str, app_version: str) -> str:
    def replace(match):
        path = match.group(2)
        if path.startswith("/js/app/"):
            path = path.replace("/js/app/", f"/app-assets/{app_version}/", 1)
            return f"{match.group(1)}{path}{match.group(3)}"
        return f"{match.group(1)}{path}?v={version}{match.group(3)}"
    return ASSET_RE.sub(replace, html)


def app_graph_version(files: dict[str, bytes]) -> str:
    digest = hashlib.sha256()
    for name, data in sorted(files.items()):
        digest.update(name.encode() + b"\0")
        digest.update(len(data).to_bytes(8, "big") + data)
    return digest.hexdigest()[:20]


def committed_app_graphs() -> list[dict[str, bytes]]:
    """Rebuild prior graphs from git so clean CI and local deployments retain the same URLs.

    A Pages deployment replaces dist, including old content-hash directories. Existing
    tabs still request those directories on their first visit to a lazy route. Reading
    committed source also avoids carrying a stale/untrusted dist across deployments.
    """
    try:
        revisions = subprocess.check_output(
            ["git", "rev-list", f"--max-count={APP_RELEASE_HISTORY}", "HEAD", "--", "public/js/app"],
            cwd=ROOT, timeout=10, stderr=subprocess.PIPE).decode().splitlines()
        graphs = []
        for revision in revisions:
            raw = subprocess.check_output(["git", "archive", revision + ":public/js/app"],
                                          cwd=ROOT, timeout=10, stderr=subprocess.PIPE)
            with tarfile.open(fileobj=io.BytesIO(raw)) as archive:
                files = {}
                for member in archive.getmembers():
                    if not member.isfile():
                        continue
                    path = Path(member.name)
                    if path.is_absolute() or ".." in path.parts:
                        fail("invalid historical app asset path")
                    files[path.as_posix()] = archive.extractfile(member).read()
                graphs.append(files)
        return graphs
    except (OSError, subprocess.SubprocessError, tarfile.TarError):
        # Source archives without git can still build; hosted deployments require history.
        print("build.py: note: app release history unavailable; refresh recovery remains available")
        return []


def publish_app_modules(*, retain_history: bool = False) -> str:
    """Snapshot the entire import graph so auth and routing share one store.

    Query-versioned paths served mixed generations in production after OAuth:
    auth.js imported the prior store while router.js imported the current store.
    Hash file names AND bytes, including uncommitted edits, before copying. Plain
    relative imports stay inside this snapshot; no dependency points at a mutable
    legacy URL. Retain complete committed graphs for pages already open during a deployment.
    """
    source = DIST / "js" / "app"
    files = {p.relative_to(source).as_posix(): p.read_bytes() for p in source.rglob("*") if p.is_file()}
    version = app_graph_version(files)
    retained = []
    for graph in [files] + (committed_app_graphs() if retain_history else []):
        graph_version = app_graph_version(graph)
        if graph_version in retained:
            continue
        retained.append(graph_version)
        for name, data in graph.items():
            target = DIST / "app-assets" / graph_version / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    (DIST / "app-release.json").write_text(json.dumps({"version": version, "retained": retained}) + "\n")
    return version


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


def load_oversold_research():
    path = PUBLIC / "oversold-research.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    run = data["evaluation"]
    rows = run["curve"]
    lo = min(1.0, min(r[k] for r in rows for k in ("nav", "spy", "qqq")))
    hi = max(1.0, max(r[k] for r in rows for k in ("nav", "spy", "qqq")))
    span = max(hi-lo, .01)
    lo -= span*.06; hi += span*.06
    width, height, left, right, top, bottom = 720, 320, 64, 18, 24, 48
    # Keep the same trading-session scale for lines, tick marks and the date inspector.
    def x(i):
        return round(left+(width-left-right)*i/max(1, len(rows)-1), 2)
    def y(value):
        return round(top+(height-top-bottom)*(hi-value)/(hi-lo), 2)
    def points(key):
        return " ".join(f"{x(i)},{y(r[key])}" for i,r in enumerate(rows))
    raw_step = (hi-lo)*100/5
    magnitude = 10 ** math.floor(math.log10(raw_step))
    step = next(s*magnitude for s in (1, 2, 2.5, 5, 10) if s*magnitude >= raw_step)
    hi = math.ceil((hi-1)*100/step)*step/100+1
    tick_values = [i*step for i in range(math.ceil((lo-1)*100/step), math.floor((hi-1)*100/step)+1)]
    dates = [0] + [i for i in range(1, len(rows)) if rows[i]["d"][:4] != rows[i-1]["d"][:4]] + [len(rows)-1]
    dates = list(dict.fromkeys(dates))
    data["plot"] = {"w":width,"h":height,"left":left,"right":right,"top":top,"bottom":bottom,
                    "lo":lo,"hi":hi,"lines":{k:points(k) for k in ("nav","spy","qqq")},
                    "ticks":[{"value":v/100+1,"y":y(v/100+1),"label":f"{v:+g}%" if v else "0%"} for v in tick_values],
                    "dates":[{"i":i,"x":x(i),"label":rows[i]["d"][:7],"d":rows[i]["d"],
                              "anchor":"start" if i == 0 else "end" if i == len(rows)-1 else "middle"} for i in dates]}
    data["chart_data"] = {"rows": rows, "plot": {k: v for k, v in data["plot"].items() if k != "lines"}}
    data["validation"] = data["comparisons"][data["selected_rule"]]["validation"]
    return data


def load_track_stats() -> dict:
    """§5.3.4/5: the proof stats band + the hero slide-2 战绩卡, computed from the nightly notary at
    build time. Total signal count, the LIVE hit20 of the largest-N source (with its own denominator
    as the printed N=), and the LIVE equity curve (nav vs SPY) as two ready-to-print polylines.
    Graceful: returns {'ok': False} when the JSON is missing or malformed — the band and slide-2 curve
    simply don't render (load_track_n still hard-fails the build for the K-index N)."""
    try:
        doc = json.loads(TRACK_JSON.read_text(encoding="utf-8"))
        rows = doc.get("rows") or []
        total = len(rows)
        live = sum(1 for r in rows if isinstance(r, dict) and r.get("mode") == "LIVE")
        srcs = [s for s in (doc.get("by_source") or [])
                if isinstance(s, dict) and s.get("mode") == "LIVE"
                and s.get("hit20") is not None and s.get("n_hit20")]
        best = max(srcs, key=lambda s: (s.get("n_hit20", 0), s.get("n", 0)), default=None)
        eq = [p_ for p_ in (doc.get("equity") or [])
              if isinstance(p_, dict) and p_.get("v") is not None and p_.get("spy") is not None]
        if not (total and best and len(eq) >= 2):
            return {"ok": False}
        w, h, pad = 360, 160, 12
        left = 42
        vals = [p_["v"] for p_ in eq] + [p_["spy"] for p_ in eq]
        lo, hi = min(min(vals), 1.0), max(max(vals), 1.0)
        margin = max((hi - lo) * .12, .005)
        lo -= margin
        hi += margin
        span = (hi - lo) or 1.0
        n = len(eq)

        def pts(key: str) -> str:
            return " ".join(
                f"{round(left + (w - left - pad) * (i / (n - 1)), 1)},"
                f"{round(pad + (h - 2 * pad) * (1 - (p_[key] - lo) / span), 1)}"
                for i, p_ in enumerate(eq))

        # §5.2/§5.3 landing receipts: the strongest "推送后至今 / since push" number is a REAL figure from
        # the notary (rows[].rnow, as of rows[].rnow_d) — never invented. `top_kindex` = the single best K-index
        # dip-buy rnow (the SMH capitulation receipt the landing showcases, honestly BACKTEST-labeled); `rnow_by`
        # maps "<TICKER>@<signal-date>" → the same figure so the curated example cards render their own rnow.
        def _rnpct(v: float) -> str:
            return f"{v:+.1f}%"

        rnow_by: dict[str, dict] = {}
        for r in rows:
            if not isinstance(r, dict):
                continue
            rn = r.get("rnow")
            if not isinstance(rn, (int, float)):
                continue
            key = f"{r.get('ticker')}@{str(r.get('ts') or '')[:10]}"
            rnow_by[key] = {"rnow": round(rn, 1), "rnow_pct": _rnpct(rn), "rnow_d": r.get("rnow_d") or ""}

        kx = [r for r in rows if isinstance(r, dict) and r.get("kind") == "kindex"
              and isinstance(r.get("rnow"), (int, float))]
        top_kindex = None
        if kx:
            b = max(kx, key=lambda r: r["rnow"])
            top_kindex = {
                "ticker": b.get("ticker") or "—",
                "date": str(b.get("ts") or "")[:10],
                "rnow": round(b["rnow"], 1), "rnow_pct": _rnpct(b["rnow"]),
                "rnow_d": b.get("rnow_d") or "", "mode": b.get("mode") or "BACKTEST",
            }

        # §5.3.5 slide 4 (market weather): real regime read from regimes_today, resolved to a fixed
        # weather token here so the template's t() lookup can never miss a key (build-fatal otherwise).
        rt = doc.get("regimes_today") or {}
        regime = None
        raw = rt.get("regime")
        if raw:
            tok = {"calm-up": "calmup", "calm-down": "calmdown",
                   "stress": "stress", "capitulation": "capitulation"}.get(raw, "unknown")
            vc, tr = rt.get("vix_close"), rt.get("spx_vs_200dma")
            regime = {
                "wx_key": f"hero.s4_wx_{tok}",
                "vix": f"{vc:.1f}" if isinstance(vc, (int, float)) else "—",
                "trend": f"{tr * 100:+.1f}%" if isinstance(tr, (int, float)) else "—",
                "d": rt.get("d") or "",
            }
        cases = []
        for ticker, day, key, horizon in [("VRT", "2026-07-29", "vrt", "r20"),
                                           ("SMH", "2026-04-07", "smh", "r20"),
                                           ("TTMI", "2026-08-26", "ttmi", "rnow")]:
            row = next((r for r in rows if r.get("ticker") == ticker and
                        str(r.get("ts", "")).startswith(day)), None)
            if not row or not isinstance(row.get(horizon), (int, float)):
                continue
            value = row[horizon]
            cases.append({"ticker": ticker, "date": day, "key": key, "horizon": horizon,
                          "mode": row.get("mode", "BACKTEST"), "value": value,
                          "display": f"{value:+.1f}%", "asof": row.get("rnow_d", ""),
                          "summary": row.get("summary") or "—"})
        return {
            "ok": True, "total": total, "cases": cases, "live": live, "regime": regime,
            "top_kindex": top_kindex, "rnow_by": rnow_by,
            "hit20": int(round(best["hit20"])), "hit20_n": int(best["n_hit20"]), "hit20_kind": best["kind"],
            "eq": {"w": w, "h": h, "nav": pts("v"), "spy": pts("spy"),
                    "left": left, "right": w-pad,
                    "ticks": [{"y": round(pad+(h-2*pad)*(1-(v-lo)/span),1), "label": f"{(v-1)*100:+.0f}%"} for v in sorted({lo+margin, 1.0, hi-margin})],
                    "first": eq[0]["d"], "last": eq[-1]["d"],
                    "nav_last": f"{(eq[-1]['v'] - 1) * 100:+.1f}%",
                    "spy_last": f"{(eq[-1]['spy'] - 1) * 100:+.1f}%"},
        }
    except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError):
        return {"ok": False}


def build_context(cfg: dict, tables: dict, lang: str, page: str, rel: str, version: str, liq: dict,
                  track_n: int = 0, track_stats: dict | None = None) -> dict:
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
        "navigation": json.loads((ROOT / "product-navigation.json").read_text()),
        "desk_quotes": {row['ticker']: row for row in json.loads((ROOT / cfg['desk_prices']).read_text())['quotes']},
        "app_strings": {k[4:]:v for k,v in table.items() if k.startswith("app.")},
        "app_icon_sprite": app_icon_sprite() if page == "app" else "",
        "lang": lang, "html_lang": HTML_LANG[lang], "other_lang": other, "is_zh": lang == "zh",
        "page": page, "t": t, "t2": t2, "tf": tf, "tg": tg, "primary": primary, "url": url, "liq": liq,
        "track_n": track_n, "track_stats": track_stats or {"ok": False},
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


def write_manifests(tables):
    """Use the page's language when installing; keep one identity and the same duck."""
    base = json.loads((PUBLIC / "manifest.webmanifest").read_text(encoding="utf-8"))
    for lang in LANGS:
        manifest = dict(base, id="/", scope="/", lang=HTML_LANG[lang],
                        start_url=page_url(lang, "index.html"), description=tables[lang]["meta.description"])
        out = DIST / lang_prefix(lang).strip("/") / "manifest.webmanifest"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")


def load_video_example():
    """One intentionally public, source-reviewed sample; never read a member report."""
    sample = json.loads((PUBLIC / "examples" / "video-summary.json").read_text())
    if not re.fullmatch(r"https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}", sample["url"]):
        fail("public video example must link to its original YouTube video")
    sample["published"] = datetime.fromisoformat(sample["published_at"]).astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    duration = sample["source"]["duration_seconds"]
    sample["duration"] = f"{duration//60}:{duration%60:02}"
    for section in sample["sections"]:
        seconds = section["start_seconds"]
        if not isinstance(seconds, int) or not 0 <= seconds < duration:
            fail("public video example has an invalid source timestamp")
        section["time"] = f"{seconds//60:02}:{seconds%60:02}"
    return sample


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--api-base", help="override api_base from site.config.json")
    args = ap.parse_args()

    # refresh the static calendar fallback (deterministic index rebalances) so dates roll forward
    try:
        import subprocess
        subprocess.run([sys.executable, str(ROOT / "scripts" / "gen_calendar.py")], check=True)
    except Exception as e:  # noqa: BLE001
        print(f"[build] gen_calendar skipped: {e}")

    cfg, tables, version = load_config(args.api_base), load_i18n(), git_sha()
    pages, env, liq, track_n = page_targets(), make_env(), load_liquidity(), load_track_n()
    track_stats = load_track_stats()   # §5.3.4/5 — graceful {'ok': False} when the notary JSON is absent
    video_example = load_video_example()

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(PUBLIC, DIST)          # public/ is copied whole (avatar-group.jpg, mascot.svg, receipts/ …)
    from public_access import sanitize_public_payloads
    sanitize_public_payloads(DIST)
    from creator_public_access import sanitize_creator_catalog
    sanitize_creator_catalog(DIST)
    app_version = publish_app_modules(retain_history=True)
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
            ctx = build_context(cfg, tables, lang, Path(tpl_name).stem, rel, version, liq, track_n, track_stats)
            ctx["oversold"] = load_oversold_research()
            ctx["video_example"] = video_example
            ctx["demo_copy"] = {k[8:]: v for k, v in tables[lang].items() if k.startswith("demo.ui.")}
            ctx["home_stories"] = load_home_stories() if tpl_name == 'index.html' else []
            ctx["home_copy"] = {k[5:]:v for k,v in tables[lang].items() if k.startswith('home.')} if tpl_name == 'index.html' else {}
            html = version_assets(tpl.render(**ctx), version, app_version)
            if tpl_name == "app.html":
                validate_app_strings(html, tables[lang], lang)
            out = DIST / lang_prefix(lang).strip("/") / rel
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(html, encoding="utf-8")
            count += 1

    write_config_js(cfg, version)
    write_glossary(DIST)
    write_manifests(tables)
    n_imports = version_module_imports(version)
    headers = env.get_template("_headers.tpl").render(cfg=cfg)
    (DIST / "_headers").write_text(headers.rstrip() + "\n", encoding="utf-8")
    write_sitemap(cfg, pages, datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    print(f"build.py: rendered {count} pages ({len(pages)} templates × {len(LANGS)} langs) "
          f"→ {DIST.relative_to(ROOT)}/  version={version}  api_base={cfg['api_base']}  "
          f"app modules={app_version}  legacy imports versioned={n_imports}")


if __name__ == "__main__":
    main()
