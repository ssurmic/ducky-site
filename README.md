# ducky-site 🦆

Public website and authenticated app for **Ducky Bot** (`duckybot.app`), built with
Python/Jinja2 and a vanilla ES-module SPA. English pages use `/` and `/en/`; Chinese pages use `/zh/`.
Cloudflare Pages serves the generated site and `/app/` shell; shared research comes from the backend API.

Engineering entry: [AGENTS.md](AGENTS.md) · [frontend rules](CLAUDE.md). The private backend owns the
[shared current design](https://github.com/ssurmic/ducky-bot/blob/codex/design-current-status-20260912/design-current-status.md) and
[continuation / review record](https://github.com/ssurmic/ducky-bot/blob/codex/design-current-status-20260912/continuation.md); both repositories reference those same documents.
Backend `SYSTEMDESIGN.md` retains the detailed invariant and ownership contracts.

## Build

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # or use ducky-bot's venv
python3 build.py                      # → dist/  (English at / and /en/, Chinese at /zh/, config.js, _headers, sitemap.xml)
python3 build.py --api-base http://localhost:8787   # point config.js + CSP connect-src at a local API
python3 scripts/lint_copy.py          # compliance lint (banned strings, N beside win-rates, disclaimer)
python3 scripts/check_links.py        # internal links + anchors
scripts/serve.sh                      # http://localhost:8000/
```

Research Brief is explicitly enabled by `research_brief_preview: true` in `site.config.json`.
Without that setting it stays disabled. `python3 build.py --no-research-brief-preview` builds
a rollback with the preview route and navigation disabled; `--research-brief-preview` enables it
for a local preview. The switch does not change API authentication or data access.

Copy lives in `i18n/zh.json` and `i18n/en.json` (flat keys, identical key sets — the build fails otherwise).
Prices, bot handle, channel and API base live in `site.config.json`. App modules share a content-addressed
directory `/app-assets/<hash>/`; all relative imports remain inside it so authentication and routing use
the same session store. Other assets keep `?v=<git sha8>`.

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

Release: `scripts/deploy_pages.sh` (Direct Upload Pages project — a git push never publishes; see the script header). `dist/_headers` carries the CSP from SYSTEMDESIGN §5; `functions/` (later pack) provides `/go/<slug>` 302s.
CI (`.github/workflows/check.yml`) runs build + lint + link check on every push / PR.
