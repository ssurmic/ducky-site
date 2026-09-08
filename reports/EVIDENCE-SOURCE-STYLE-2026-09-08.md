# Evidence source identity and stance styling

The owner asked for recognizable YouTube source cards with a translucent logo, monochrome X marks, yellow macro cues and a small green bullish badge. This release adds these details to the information map and source dialogs.

## Meaning and presentation

- Every card has a visible source name and local SVG icon. YouTube, X and macro also have faint decorative watermarks. Source names, accents and watermarks identify provenance; the separate right-hand badge expresses the stored bullish, bearish or context classification.
- Domain matching uses parsed HTTPS URLs and exact domain boundaries. Names and titles do not guess platforms. Explicit platform metadata is a fallback only when the source URL is absent. Macro is identified by its stored kind/topic. Mixed sources have a neutral label and no single-platform watermark; their expanded records retain individual labels.
- Existing point IDs, counts, quotations, dates, ordering, source navigation and access checks are unchanged. No new request, model inference or trade calculation is introduced.
- The concurrent AI perspective, bullish/bearish copy and same-ticker refresh changes through `01113b8` are included. Directional colors remain in the outlined badge, connectors and filters; each mobile card has one stance badge and one source badge. Full-card directional tints were removed after the independent reviewer found they overrode the requested source palette. Removed priority jargon is not reintroduced.

## Verification

- 357 frontend tests passed, including strict source classification, mixed-source handling, source-dialog identity, unchanged evidence data and existing exact source navigation. Copy lint, 1,308 links and build assets passed (4 passed, 1 existing skip).
- Browser QA used explicitly labeled synthetic local data at 320/390 × 650px in both languages and color schemes and at 1200px desktop. Local fixtures covered YouTube, X, macro and mixed sources with each stance represented. This is viewport simulation, not a physical iPhone/Safari test.
- Phone badge rows remain visible; source and stance do not overlap or overflow. At the sampled 650px phone viewport, 520px remains after header/navigation and two complete first-group cards are visible. The source dialog fits at 390px, its close target is 44px and closing restores the source-card focus.
- Watermarks are `aria-hidden` with `pointer-events:none`; source text remains visible without relying on color. Small-screen labels and long English titles were independently reviewed by the UI audit agent.

## Release receipt

Published frontend `99ef6d2` to Pages `5495287e` on 2026-09-08. Production Chrome displayed real AVGO data: 18 points, one bullish and 17 context records at observation. The Sept 3 Investment TALK YouTube point has the explicit YouTube badge and watermark plus a green Bullish badge; other source records retain Context. The saved-analysis pending state remains truthful.

Actual production viewport measured 390 × 651 CSS px after compensating for the existing browser zoom; scrollWidth was 390. The long real bullish title wrapped within its card and the two badge labels remained separate. This real-data view contains one complete first-group card and part of the next group in the short viewport; the two-card count above applies to the synthetic fixture only. No physical iOS/Safari claim is made.

Production CSS, evidence source module and evidence view module exactly match the release build. Both localized app shells match after excluding the platform-injected Cloudflare beacon; no beacon was added by this change. Independent final UI review passed after removing the conflicting full-card directional tint. The agent exercised click/dialog/close flows; native Tab traversal was not separately exercised.

Synthetic examples above are layout fixtures only and are not investment records.
