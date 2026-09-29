# Current-session Today overview — 2026-09-29

Status: implemented and locally verified; exact production release and live data acceptance pending. Previous frontend release: 9693cdb5 / Pages 8c3d5948. Shared backend current design and English Handoff remain authoritative.

## Behavior

Today puts the saved current-session market overview first: four index ETFs with their actual trade times and changes versus the previous close, followed by a short factual summary. Sector/asset quotes and provider details expand in place. Closing notes remain dated, expandable archives, including same-day editions. No private account writes, model requests or source acquisition occur on page reads.

The overview and macro cards use the same typed snapshot's canonical metrics and Fear & Greed source. Missing fields never fall back to conflicting old values. Historical comparison charts retain their actual ending date and are explicitly labelled historical. Current snapshot expiry is evaluated even if a refresh fails; earlier replica sequences and legacy responses cannot replace an already accepted current snapshot. Revoked access clears both DOM and the retained document.

## QA

909 Node tests passed. Python discovery: 18 passed, 1 skipped. Bilingual build, copy lint and 2,109 links passed. Independent review identified and helped close permission-revocation reappearance and legacy-response downgrade regressions; focused tests cover both alongside expiry/503, null/zero, dated close retention and quote clocks.

Eight synthetic phone-frame combinations cover 320×600 and 390×700, Chinese/English, light/dark. Available content heights: 494/594px. All four main indexes and the short summary fit before bottom navigation; summary bottom at 403–457px in 320px layouts and approximately384px in 390px layouts. No document overflow. Desktop1440×900 inspected visually. Quote disclosure retained its expanded state after manual refresh; no paid/provider/production connection. These are viewport simulations, not physical-device tests.

The existing whole-cache replication cycle is about120s after each pass; the visible page revalidates at least every60s. A minute producer is not a one-minute website SLA. Preserve actual source/publication clocks and measure live replication separately. Native creator worker remains paused; this change neither retries its failed videos nor certifies native source-to-web success.
