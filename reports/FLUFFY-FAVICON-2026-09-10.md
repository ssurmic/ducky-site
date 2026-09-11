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

## Search indexing limit

Website publication does not prove Google has replaced its cached search icon.
Its [favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search?hl=en)
requires a stable, crawlable square icon and says recrawling can take several days
to several weeks. Search-result refresh remains externally controlled.
