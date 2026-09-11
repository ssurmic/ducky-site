# Fluffy homepage duck favicon · 2026-09-10

The owner supplied a Google result showing an older bright circular avatar and
asked for the fluffy green duck used on the homepage. Reuse the existing original
`public/duck-head-cutout-v1.png` (1254 × 1254, transparent PNG); no new mascot or
resampled image is introduced.

Public and app templates declare that PNG once with its actual size. The build
retains its stable versioned filename without a changing release query. Hero,
navigation, favicon and installation icons share the same asset. Legacy
`/favicon.ico`, `/favicon.svg` and `/favicon.png` redirect to it. The old vector
favicon file and its automatic build regeneration are removed.

## Acceptance before publication

- Full frontend suite: 660 passed, 0 failed.
- Asset pipeline suite: 4 passed, 1 existing conditional skip.
- Copy lint: 3,371 files checked; internal links: 1,252 checked; both pass.
- Built HTML declares one stable icon with matching PNG dimensions; installation
  manifests point to the same original asset, which byte-matches the source.
- Compatibility redirects are present and the build does not recreate the old SVG.

No page layout, investment calculation, backend request or source-data behavior
changes. Exact release and live browser receipts are recorded after deployment.
Prior production for rollback: Pages `e3a15d95-440e-4196-a5c1-56962106e0c7`,
source `e08402696589a3e2a382d40d679a76a8bcb34c83`.

## Published and checked

PR32 merged as `1f6d9ac2f0c49398a8dd56b2d1dda2e72322c4ea`. Exact main CI
`34552713444` passed. Pages `f6960534-86c4-4505-8ca8-b34f6f890bd3` is the
production deployment at https://duckybot.app/ (2026-09-10 PDT).

Ten actual public paths passed HTTP checks: both language homepages and app
entries, both installation manifests, the original PNG, and three legacy icon
paths. Each legacy path returns 301 to the PNG; all image responses byte-match
the original (SHA256 `37acdda70dc75920c3b64200097c2a752584a9c89dba3ea05efcf59b6c8c27b5`).
All four HTML entries contain exactly one icon declaration with the stable URL
and actual dimensions. Chrome's reloaded homepage displays all five existing
duck images successfully at 1254px natural size using the same stable URL; the
installation icon matches. The CUA browser badge overrides tab-icon DOM at
runtime, so the published favicon declaration was verified from the HTTP HTML.

An initial Python urllib probe received HTTP 403. Ordinary curl checks and the
actual browser succeeded; no site security settings were changed. No claim is
made that Google's search result or an already-installed phone shortcut has
refreshed its cache yet.

## Search indexing limit

Website publication does not prove Google has replaced its cached search icon.
Its [favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search?hl=en)
requires a stable, crawlable square icon and says recrawling can take several days
to several weeks. Search-result refresh remains externally controlled.
