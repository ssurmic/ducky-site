# Complete values in compact Indicators columns · 2026-09-30

Status: frontend follow-up candidate to released PR #129. Publication remains authorized by
the owner; the actual merged SHA, Pages deployment and canonical verification will be attached
to this pull request after the official publisher completes.

## Defect and change

The compact Indicators layout removed three repeated prose columns. A final screenshot review
found that the older one-line badge style still clipped net transaction amounts and fund
add/trim counts inside the narrower columns. Allow those primary values to wrap. Keep option
wall kind and price together where space permits, with the price distance on a separate line.
Do not alter the underlying values, source dates, sorting or the full source dialogs. Secondary
source previews can still be abbreviated; their complete records remain available on opening.

## Validation

- All 995 Node tests pass.
- Dedicated browser acceptance covers 320/390/820/1440/1920px, English/Chinese and dark/light
  (20 combinations). It checks primary amounts/counts and ready option-wall labels/prices/
  distances for clipping, comparison rows at most 150px, fourteen columns without repeated
  narrative cells, wide-desktop fit, persistent choices, focus clearance, reading-position
  restoration and theme contrast. Screenshots use synthetic records and simulated viewports.
- No production account was created and no physical-device test is claimed.

## Release boundary

PR #129 is already live: merge `d4935d8ba92cc5bb6e05abecb9bc48ba87cce6e6`, Pages
`e6140f5d`, canonical version/CSP verified at `2026-09-30T07:28:20Z`. That is the rollback
baseline for this three-rule CSS correction. This follow-up does not deploy or modify backend
services, financial calculations, permissions or stored data.
