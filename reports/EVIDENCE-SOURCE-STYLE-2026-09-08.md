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

Production release verification will be recorded after publication. Synthetic examples above are layout fixtures only and are not investment records.
