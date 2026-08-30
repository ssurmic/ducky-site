# ducky-site 🦆

Public marketing site for **Ducky TradeBot** (`duckybot.app`): a static, bilingual (中文 at `/`, English at `/en/`),
zero-third-party-script landing + disclaimer, built with a ~200-line Jinja2 script. Track record, trending,
ideas and the `/app/` Mini App shell are added by later packs on top of the same pipeline.

Design authority: `ducky-bot/SYSTEMDESIGN.md` §5. Agent rules: `CLAUDE.md`.

## Build

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # or use ducky-bot's venv
python3 build.py                      # → dist/  (zh at /, en at /en/, config.js, _headers, sitemap.xml)
python3 build.py --api-base http://localhost:8787   # point config.js + CSP connect-src at a local API
python3 scripts/lint_copy.py          # compliance lint (banned strings, N beside win-rates, disclaimer)
python3 scripts/check_links.py        # internal links + anchors
scripts/serve.sh                      # http://localhost:8000/
```

Copy lives in `i18n/zh.json` and `i18n/en.json` (flat keys, identical key sets — the build fails otherwise).
Prices, bot handle, channel and API base live in `site.config.json`. Assets get `?v=<git sha8>`.

Font: `public/css/site.css` self-hosts `JetBrains Mono` from `public/fonts/JetBrainsMono-sub.woff2`; generate it
once with `scripts/fonts.sh <JetBrainsMono.ttf>` (pyftsubset). Until then the system mono stack is used.

## Deploy — Cloudflare Pages

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `python3 build.py` |
| Build output directory | `dist` |
| Environment | `PYTHON_VERSION=3.12` (Pages reads `.python-version` too); `pip install -r requirements.txt` runs via `python3 -m pip install -r requirements.txt && python3 build.py` if the image lacks Jinja2 |
| Custom domains | `duckybot.app` (apex) + `www.duckybot.app` (redirected to apex by `public/_redirects`) |

`dist/_headers` carries the CSP from SYSTEMDESIGN §5; `functions/` (later pack) provides `/go/<slug>` 302s.
CI (`.github/workflows/check.yml`) runs build + lint + link check on every push / PR.
