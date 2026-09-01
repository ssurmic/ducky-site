#!/usr/bin/env python3
"""check_links.py — simple internal-link check over dist/ (CI).

For every href/src in every dist/**/*.html:
  * site-local absolute paths (/x, /en/x/, /css/site.css?v=…) must resolve to a file in dist/
  * in-page anchors (#proof) must exist as an id in that document
  * external URLs are not fetched (no network in CI); only their scheme is sanity-checked
Paths of pages owned by later packs (track-record, trending, ideas, app) are allowed to be missing
when the link carries data-planned — they are reported as warnings, not errors.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PLANNED_PREFIXES = ("/track-record/", "/trending/", "/ideas/", "/app/", "/en/track-record/", "/en/trending/",
                    "/en/ideas/", "/en/app/", "/go/")
ATTR = re.compile(r"""<(a|link|script|img|source)\b[^>]*?\b(?:href|src)=["']([^"']+)["'][^>]*>""", re.IGNORECASE)
ID = re.compile(r"""\bid=["']([^"']+)["']""")


def resolve(path: str) -> bool:
    p = DIST / path.lstrip("/")
    return p.is_file() or (p.is_dir() and (p / "index.html").is_file())


def main() -> int:
    if not DIST.is_dir():
        print("check_links: dist/ missing — run build.py first")
        return 1
    errors, warnings, checked = [], [], 0
    for page in sorted(DIST.rglob("*.html")):
        rel = page.relative_to(DIST)
        text = page.read_text(encoding="utf-8")
        ids = set(ID.findall(text))
        for m in ATTR.finditer(text):
            tag, url = m.group(1).lower(), m.group(2)
            planned = "data-planned" in m.group(0)
            checked += 1
            if url.startswith(("mailto:", "tel:", "data:")):
                continue
            parts = urlsplit(url)
            if parts.scheme:
                if parts.scheme not in ("http", "https"):
                    errors.append(f"{rel}: odd scheme {url}")
                continue
            if url.startswith("#"):
                if url.startswith("#/"):  # hash-router route inside /app/ (SPA), not an in-page anchor
                    continue
                if url != "#" and url[1:] not in ids:
                    errors.append(f"{rel}: anchor {url} not found in page")
                continue
            if not url.startswith("/"):
                errors.append(f"{rel}: relative URL {url!r} (use absolute site paths)")
                continue
            if not resolve(parts.path):
                if planned or parts.path.startswith(PLANNED_PREFIXES):
                    warnings.append(f"{rel}: {parts.path} not built yet (later pack)")
                else:
                    errors.append(f"{rel}: broken internal link {url}")
            elif parts.fragment.startswith("/"):
                continue  # hash-router route on another page (/app/#/creators) — SPA view, not an element id
            elif parts.fragment and parts.path.rstrip("/") != str(rel.parent).rstrip("/"):
                target = DIST / parts.path.lstrip("/")
                target = target / "index.html" if target.is_dir() else target
                if parts.fragment not in set(ID.findall(target.read_text(encoding="utf-8"))):
                    errors.append(f"{rel}: anchor #{parts.fragment} not found in {parts.path}")
    for w in sorted(set(warnings)):
        print("  warn: " + w)
    if errors:
        print("check_links: FAIL")
        for e in errors:
            print("  " + e)
        return 1
    print(f"check_links: OK — {checked} links checked, {len(set(warnings))} planned-page warnings")
    return 0


if __name__ == "__main__":
    sys.exit(main())
