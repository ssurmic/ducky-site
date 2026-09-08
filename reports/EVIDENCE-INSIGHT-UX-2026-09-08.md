# Information Map: a saved overview first

The owner asked for a concise LLM synthesis on arrival, clearer bullish/bearish labels and stronger green, with background generation roughly every two hours. The frontend previously hid every analysis behind a primary button inside an otherwise empty card below the map.

## Delivered UI

- One overview above the map. Ready analyses show their actual generation time. The overview is visible immediately; reasons, risks and watch items use a compact native disclosure.
- The saved `analysis.overview` replaces the legacy duplicate summary. A valid legacy summary remains readable while a full analysis is pending. Source-changed/withdrawn analyses do not expose old prose or a misleading timestamp.
- Cited node IDs resolve to the same exact source dialog; closing restores focus. Opening reasons or citations makes no network request and never starts a model.
- Source-owned support/counter labels read 看多 / 看空 and Bullish / Bearish. Higher-contrast directional backgrounds, left edges and connectors retain textual labels on each mobile directional node. Context remains context; no direction is inferred by the client. Opaque priority labels are removed from primary cards and source dialogs; ordering remains unchanged.
- English creator sentiment labels match the map.

## Verification

354 frontend tests passed. Added behavioral coverage for immediate overview, local disclosure/citations, single placement, obsolete-source invalidation and missing states. Copy lint and 1,308 built links passed. Layout QA used an explicitly labeled synthetic local fixture, not a production analysis: 1,728px desktop dark, 393px mobile dark Chinese and light English; actual document scrollWidth equaled innerWidth. Citation dialog preserved source dates/passage and restored the triggering citation on close.

Backend cadence, review and warming remain owned by the existing shared analysis producer. Publication of this UI does not by itself prove that an issuer's analysis is ready. Record live output and producer acceptance separately after deployment.
