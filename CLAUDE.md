# ducky-site — agent notes

**Read first:** `/Users/zizhaozhang/dev/ducky-bot/SYSTEMDESIGN.md` — §0 invariants (esp. 5: compliance strings),
§1 (what the web layer is for), §5 (frontend: stack, pages, CSP, CI, config). That file is the single source of
truth; this one only points at it.

## Rules that CI enforces
- `python3 build.py` renders `templates/*.html` × {zh, en} → `dist/en/` and `dist/zh/`, with English aliases at `dist/`. Copy lives
  only in `i18n/zh.json` + `i18n/en.json` (flat keys). The build fails if the two key sets differ.
- `scripts/lint_copy.py` fails on: `ALL-IN` `买这只` `目标价` `满仓` `buy now` `现在买` `建议买入`; any
  `data-winrate` without an integer `data-n` (the landing's K-index N comes from `public/track-record.json`
  `backtest.kindex.n` at build time — `build.py: load_track_n`, template var `track_n`); missing disclaimer
  lines; leaked private ids; any `<script src="http…">`.
- `lint_copy.py` also enforces SYSTEMDESIGN §5.1 brand/tech rules (`BANNED_IMPL`, everywhere except `vendor/` and
  the nightly data exports): the product is **Ducky Bot** (owner correction, 2026-09-07; supersedes "Ducky TradeBot"); the tech is described as
  "AI-backed / AI 驱动 / AI 引擎" only — no model, hardware, storage or competitor names in user-facing copy.
- The 🌊 liquidity receipt card + `/track-record/#liquidity` render from `public/receipts/liquidity-2026.json` and
  `liquidity-score-2026.csv` at build time (`build.py: load_liquidity`, `tf()` = `t()` + `str.format`).
- Brand mark: `public/duck-head-cutout-v1.png` is the owner's fluffy green homepage duck,
  shared by nav, hero, app, favicon and installation icons. Keep its versioned filename URL
  stable (no per-release query); legacy `/favicon.ico`, `/favicon.svg` and `/favicon.png`
  redirect to it. Do not regenerate favicon.svg from the older vector mascot. A future
  changed brand image needs a new versioned filename and coordinated reference updates.
- **No third-party scripts on the landing.** CSP is `script-src 'self' https://telegram.org` (only the Login
  Widget in `/app/` is whitelisted). No analytics, no fonts from Google, no CDN. Everything is self-hosted.
- No inline `<script>` (CSP has no `'unsafe-inline'` for scripts). Inline `style=""` is allowed.
- The K<1 band is called **资本臣服 / capitulation** — never the code's internal label.
- Every win-rate carries `data-winrate` + `data-n` and a visible `n =` note; BACKTEST and LIVE are badged and
  never mixed; losers are never removed from the ledger.
- ¥ prices appear only inside `#pricing`. The mobile sticky bar shows free + `$12/mo` only.
- Telegram CTAs use `https://t.me/<bot>?start=src_<slug>` (see `site.config.json` → `deeplink`). When
  `channel` is `null`, "join the free channel" CTAs fall back to the bot deep link automatically.

## Mobile browser acceptance (owner, 2026-09-07)

After every UI change, visually check the affected routes on phone browser layouts, including short
available viewports (320 and 390/393px wide; 600–700px high), both languages and color schemes.
Measure the remaining content height after the app header/navigation, the first useful content's
position, and visible rows. Browser chrome consumes screen height; overflow-free is not sufficient.
Keep input text 16px and common tap targets at least 44px while using compact reading text. Calendar
phone dates are 18px, event/weekday labels 12px, quiet day cards start at 68px and grow with events.
Check dialogs, menus, focus restoration and desktop layout. Shared CSS/navigation changes require
a route sweep of watchlist, briefing, chart, calendar, radar, alerts, creators, profile and billing.
Record viewport simulation, touch emulation and physical-device checks separately and honestly.

## File ownership (packs)
| Owner | Paths |
|---|---|
| **S1 site pipeline + landing (this pack)** | `build.py`, `site.config.json`, `i18n/`, `templates/_base.html`, `templates/_headers.tpl`, `templates/index.html`, `templates/_partials/**`, `templates/disclaimer.html`, `templates/404.html`, `public/css/`, `public/js/lang.js`, `public/js/site.js`, `public/favicon.svg`, `public/robots.txt`, `public/_redirects`, `public/manifest.webmanifest`, `public/og.svg`, `scripts/lint_copy.py`, `scripts/check_links.py`, `scripts/serve.sh`, `scripts/fonts.sh`, `.github/workflows/check.yml`, `README.md`, this file |
| Track record pack | `templates/track-record.html`, `public/js/track.js`, `scripts/push_track_record.sh` |
| Trending / ideas pack | `templates/trending.html`, `templates/ideas*.html` |
| App / Mini App pack | `templates/app.html`, `public/js/app/**`, `public/vendor/**` |
| Go-links pack | `functions/**` (`/go/<slug>` Pages Function) |

Later packs add pages by dropping `templates/<name>.html` (rendered to `/en/<name>/` and `/zh/<name>/`, plus a no-prefix English alias) and adding
their keys to **both** i18n files. `window.DUCKY` (from generated `dist/config.js`) exposes `API_BASE`, `BOT`,
`MINIAPP`, `CHANNEL`, `TRACK_JSON`, `FEED_JSON`, `PRICES`, `VERSION`.

## Calendar preview acceptance (owner, 2026-09-07)

A watchlisted earnings release must be named in the date cell, including when several companies
report on the same day. A star or generic “more” count is not sufficient. Preserve session closures
and source-linked company events; keep the complete source records and full-day details intact.
Test macro/earnings collisions, more watched earnings than preview slots, both calendar grids and
explicit category filters. Narrow month cells retain watched ticker labels when normal previews
are hidden. This is presentation priority, not a change to dates, facts or investing algorithms.

## Shared research and iteration records (owner, 2026-09-10)

The main workflow is Today → stock → dated evidence; Watchlist and Stock briefs read the same saved stock analysis. Keep expensive acquisition/inference off reads and out of each viewer's session. Prices and deterministic metrics come from the backend's provider APIs/calculations, never from an LLM.

Shared revalidation is an allowlisted GET operation: pause hidden/offline pages, honor account epochs and server access/source-withdrawal checks, preserve exact previous citations and the reader's expanded/focused state. Do not auto-replay search, history cursors, writes or settings. Backend workers own generation, retries, leases, reconciliation and shared version publication; frontend waiting copy must not claim those stages have succeeded.

For future iterations, update [CHANGELOG.md](CHANGELOG.md), the dated acceptance report and the backend's SYSTEMDESIGN/WORKFLOW tracker. Distinguish a proposal, merged code, deployment and actual delivered content. Record measured results, unresolved failures and rollback references, without secrets or per-user data. Read the central repository's latest AGENTS.md for API-first acquisition, bounded model admission and recovery requirements.

## Visible core workflow (owner, 2026-09-10, supersedes three-destination simplification)

Keep Today, Watchlist, Explore, Calendar and Creators in primary navigation. The information map,
source history and creator records are core capabilities, with a direct stock-page action and a
watchlist-row action. A pending paragraph must not hide already available evidence.

Watchlist enters List on desktop and phone; Overview is second. Put the saved overview in the list,
sort through column-header buttons with explicit ascending/descending state, keep unknown values
last, and preserve focus/scroll on updates. Phone tables scroll within their container with a fixed
stock column; don't replace this with a separate sorting menu or shrink tap targets below 44px.

Distinguish an unfinished read of saved research from a backend generation state. Prices and map
actions can render first; loading text must not claim the summary is missing. Once the response
arrives, use its actual status and sources. Do not erase accepted text merely to show refresh loading.

Explore and first-use Today must offer useful, clearly labelled examples even with no subscriptions.
Preserve historical case dates and losses. Evidence maps group bullish, factual/context and bearish
records in separate lanes. Group authors by stable identity, retain each point/source/date, and label
repeat source use without treating it as independent corroboration or merging opposing positions.

## Search and default language (owner, 2026-09-10)

English is the default at all no-prefix HTML routes; `/en/` remains the canonical English URL and `/zh/` is Chinese. Keep language toggles and reciprocal hreflang tags. The sitemap contains only canonical, indexable public pages; account/preview shells, generic record placeholders and 404s stay out. Do not stamp every build date as a content lastmod. The Google ownership meta tag is intentionally public and must remain after verification. Indexing and rankings require separate Search Console evidence.
