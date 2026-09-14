# HD fluffy duck across the product · 2026-09-14

Status: implemented; local test, copy-lint and browser acceptance gates passed.
Not merged or deployed.

The owner clarified that all product logos should use the detailed fluffy green
duck shown in the reference. The existing 1254 × 1254 RGBA original is retained at
its stable URL, `/duck-head-cutout-v1.png`. Its SHA-256 is
`37acdda70dc75920c3b64200097c2a752584a9c89dba3ea05efcf59b6c8c27b5`.
No new image resolution or redesigned mascot is claimed.

The remaining older round avatars in app empty states and notifications are replaced
with that original. The social preview is recomposed from the same master; evidence
card exports draw the mark at 54 × 54 instead of stretching it to 54 × 64.
Page branding, browser/install icons,
onboarding and other existing consumers remain consistent. Legacy image files remain
historical assets, not current consumer defaults.

## Verification

The existing navigation and search-metadata tests now check consistency with the
current browser icon. A brand contract checks that the master is a square HD PNG
with an alpha channel, survives the build byte-for-byte, and has matching icon and
manifest dimensions. Current page/runtime consumers must not select the retired
artwork; the notification test checks the actual icon and badge payload.

Results against app asset graph `5b3e68dc0ed896de5ed7`:

- Full JavaScript suite: 771 passed, 0 failed.
- Python suite: 22 tests, 21 passed and one existing conditional skip.
- Copy lint: 3,812 files checked, 0 failures.
- Internal links: 2,127 checked, 0 failures.
- Chromium: all 12 width/language/theme combinations passed at 320 × 650,
  393 × 650 and 1440 × 900, English/Chinese and light/dark. Each covers homepage,
  community illustration, synthetic watchlist and the actual empty-state mark.
- WebKit: 393 × 650, English/dark passed with the same image and empty-state checks.
- Shared route sweep: 36 checks passed (watchlist, briefing, chart, calendar,
  radar/boards, alerts, creators, profile and billing; both languages at narrow
  phone/dark and desktop/light). No horizontal document overflow or page errors.
- The 32/48/96/192-pixel light/dark image sheet, new 1200 × 630 social preview and
  real canvas card export were visually inspected. The exported card reads the
  canonical PNG and draws it square at 54 × 54. Browser pixel inspection confirms
  real transparency (525,789 fully transparent pixels).

| Layout | App mark | Content height below navigation | First watchlist row | Visible rows |
| --- | --- | --- | --- | --- |
| 320 × 650 | 30 × 30 | 522 px | 381.97 px from top | 3 intersecting rows |
| 393 × 650 | 34 × 34 | 522 px | 381.97 px from top | 3 intersecting rows |
| 1440 × 900 | 40 × 40 | 838 px | 385.39 px from top | 4 rows |

The empty-state image is 72 × 72 with `contain` sizing, no circular crop and no
background. Initial captures landed during the existing 450 ms empty-state reveal
delay; final captures wait for opacity 1 and confirm the modal is hidden. This was
a harness timing correction, not an app defect. On phones the empty message ends
above the navigation boundary at 583 px.

The QA server is loopback-only. External requests, including public price reads
initiated by the homepage, were blocked; app data is synthetic. HTTP writes were
blocked, and no account mutation, notification send or research generation occurred.
The notification icon/badge was checked through the existing mocked worker test.
Viewport/touch-capability simulation and WebKit are not a physical phone check.

Logs, JSON measurements, screenshots, the icon size sheet and synthetic card export
are retained in the separate `fluffy-logo-hd-20260914` acceptance evidence directory.

## Gate issue found during verification

The first copy-lint run matched a banned implementation name inside random base64
bytes in the embedded PNG. Visible SVG copy was valid. A narrow correction to
exclude strict base64 PNG payloads in parsed SVG image attributes passed its focused
regressions (3 tests) and the full 3,812-file gate. Visible text, metadata and other
attributes remain checked; malformed XML/data and external URLs receive no exemption.

## Search presentation boundary

The pre-change live audit found consistent current favicon links and `Ducky Bot`
site-name metadata. A screenshot alone does not identify Google's cached source
image or prove that the website omitted a preferred site name. Google separately
chooses the site name displayed above a result; it is not the page-title link.

The [favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search)
and [site-name guidance](https://developers.google.com/search/docs/appearance/site-names)
explain that updates require crawling and processing and may take days to weeks.
Website publication is not evidence that either search presentation has refreshed.

## Release boundary

Frontend base: `a8b392990c7fc7187a24ff4a898a86bacacc162b` (Pages release
`7e1d05cb-6752-407f-8355-e161482ca7fb`). This slice changes branding assets and
their consumers; it introduces no API or data contract. Final source/deployment
receipts belong in the release record after the owner-authorized release.
