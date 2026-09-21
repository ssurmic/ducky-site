# Language preference persistence · 2026-09-20

Status: implemented and locally verified; push/PR and hosted CI receipts are recorded
in the pull request. This record does not claim a production deployment.

Base: `4e8436d11a62f9fce2f2cf8142b4e4706295e0ba` (`origin/main`).

## Behavior

- Header/footer language switches save only `en` or `zh` in `ducky_lang` for one
  year, `Path=/`, `SameSite=Lax`, and `Secure` on HTTPS. A blocked cookie does not
  disable the switch. The choice applies across public pages and the app.
- No-prefix pages select saved choice, then the first supported language in the
  browser profile, then its singular language, then English. Regional Chinese
  preferences are supported. Automatic detection does not write a cookie.
- Explicit `/en/` and `/zh/` URLs stay in their requested language and do not
  overwrite a saved choice. Static English aliases, canonical tags, hreflang,
  and sitemap stay intact.
- A small synchronous same-origin script runs before page/app scripts. Chinese
  neutral entries redirect once, preserving the full path, query and fragment.
  English neutral entries already have the correct content and do not redirect.
- Legacy no-prefix OAuth/reset links retain their existing routing. Reset views
  may handle their own switch navigation; cookie capture does not store tokens
  or bypass that handler. No backend API, session, account setting or data changes.

## Verification

- Existing complete JavaScript suite: 771 passed. New focused preference suite:
  12 passed, covering default selection, cookie precedence/attributes, blocked
  storage, explicit links, delegated controls, and auth/deep-link preservation.
- Python suite: 21 passed, 1 existing skip. Copy lint: 3,711 files; link check:
  2,160 links, both passed. Final complete-suite and CI counts are in the PR.
- Chromium and WebKit: 24 cases across English/Chinese browser profiles,
  light/dark, 320×600, 393×650 and 1440×900 viewports. Actual toggle clicks,
  cookie persistence, refresh, returning in a new browser context, app login
  routing and query/fragment retention all passed, with no page errors.
- Short phone layouts retained at least 489px of content height and no horizontal
  page overflow. This is browser/viewport emulation, not physical-device QA;
  authenticated API behavior and external sign-in providers were stubbed.
- Local browser receipts/screenshots: `/tmp/ducky-language-browser/`.
  Early harness attempts selected a hidden duplicate navigation control or
  a hidden invitation field; corrected selectors completed the matrix.

## Release and rollback

Source push is authorized by the owner. Production deployment is not performed
by this task. Reverting the preference script and its two template inclusions
restores prior navigation; an unused preference cookie is harmless until expiry.
