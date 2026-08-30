# ducky-site — agent notes

**Read first:** `/Users/zizhaozhang/dev/ducky-bot/SYSTEMDESIGN.md` — §0 invariants (esp. 5: compliance strings),
§1 (what the web layer is for), §5 (frontend: stack, pages, CSP, CI, config). That file is the single source of
truth; this one only points at it.

## Rules that CI enforces
- `python3 build.py` renders `templates/*.html` × {zh, en} → `dist/` (zh, no prefix) and `dist/en/`. Copy lives
  only in `i18n/zh.json` + `i18n/en.json` (flat keys). The build fails if the two key sets differ.
- `scripts/lint_copy.py` fails on: `ALL-IN` `买这只` `目标价` `满仓` `buy now` `现在买` `建议买入`; any
  `data-winrate` without `data-n`; missing disclaimer lines; leaked private ids; any `<script src="http…">`.
- **No third-party scripts on the landing.** CSP is `script-src 'self' https://telegram.org` (only the Login
  Widget in `/app/` is whitelisted). No analytics, no fonts from Google, no CDN. Everything is self-hosted.
- No inline `<script>` (CSP has no `'unsafe-inline'` for scripts). Inline `style=""` is allowed.
- The K<1 band is called **资本臣服 / capitulation** — never the code's internal label.
- Every win-rate carries `data-winrate` + `data-n` and a visible `n =` note; BACKTEST and LIVE are badged and
  never mixed; losers are never removed from the ledger.
- ¥ prices appear only inside `#pricing`. The mobile sticky bar shows free + `$12/mo` only.
- Telegram CTAs use `https://t.me/<bot>?start=src_<slug>` (see `site.config.json` → `deeplink`). When
  `channel` is `null`, "join the free channel" CTAs fall back to the bot deep link automatically.

## File ownership (packs)
| Owner | Paths |
|---|---|
| **S1 site pipeline + landing (this pack)** | `build.py`, `site.config.json`, `i18n/`, `templates/_base.html`, `templates/_headers.tpl`, `templates/index.html`, `templates/_partials/**`, `templates/disclaimer.html`, `templates/404.html`, `public/css/`, `public/js/lang.js`, `public/js/site.js`, `public/favicon.svg`, `public/robots.txt`, `public/_redirects`, `public/manifest.webmanifest`, `public/og.svg`, `scripts/lint_copy.py`, `scripts/check_links.py`, `scripts/serve.sh`, `scripts/fonts.sh`, `.github/workflows/check.yml`, `README.md`, this file |
| Track record pack | `templates/track-record.html`, `public/js/track.js`, `scripts/push_track_record.sh` |
| Trending / ideas pack | `templates/trending.html`, `templates/ideas*.html` |
| App / Mini App pack | `templates/app.html`, `public/js/app/**`, `public/vendor/**` |
| Go-links pack | `functions/**` (`/go/<slug>` Pages Function) |

Later packs add pages by dropping `templates/<name>.html` (rendered to `/<name>/` and `/en/<name>/`) and adding
their keys to **both** i18n files. `window.DUCKY` (from generated `dist/config.js`) exposes `API_BASE`, `BOT`,
`MINIAPP`, `CHANNEL`, `TRACK_JSON`, `FEED_JSON`, `PRICES`, `VERSION`.
