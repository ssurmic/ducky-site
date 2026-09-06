# COPY-04 · Remove production details from product copy

Owner correction, September 6, 2026: voice gender and production notes do not
help a visitor use Ducky. Remove them and audit the rest of the site for the
same problem. Hiding unnecessary details in an expander is not a fix.

## Changes

- Deleted the Demo metadata row and synthetic-narration paragraph, including
  their Chinese and English translation keys. Shortened the Chinese heading
  to fit a 390px viewport without an orphaned final word. Kept recording date,
  historical-example labels, subtitle controls, six seek buttons and seven
  independent feature links.
- Removed creator source hashes, caption-segment counts and processing chunk
  counters from rendering. The source-grounding gate still requires its hash
  and segment evidence. Original video links, dates, source type and incomplete
  caption coverage remain available.
- Reworded creator retry/availability, radar update/gap, earnings estimate and
  technical-indicator states in both languages. Automatic audio transcription
  remains identified, without describing the local machine or model pipeline.
- Made the guide explicit that the available topic is semiconductors and the
  topic inbox requires Pro. Browser notifications still require enabling.
- Removed internal-engine and compiled-rule wording from legacy authored
  fragments, and replaced their unsupported delivery-speed comparison with
  source/date information. These fragments were not on the active homepage.
- Added authored-translation lint for rejected production details and updated
  existing tests to verify source provenance survives the display cleanup.

## Audit scope and retained information

Reviewed both complete translation files, templates and the 26 App view
modules for production/voice/model/queue/cache/hash/chunk terminology. The build
checks all 20 generated pages. This is a source-wide copy audit, not a claim
that every authenticated production route was visited in this release.

Retained meaningful dates, stale/missing/delayed states, source reliability,
historical-reconstruction and loss disclosures, actual Free/Pro boundaries,
privacy/security disclosures and genuine local-preview recovery guidance.
Social record IDs were explicitly requested in SOCIAL-01 and remain available
for traceability; they are not confused with original post IDs. Attributed
research, strategy rules, source exports and internal reproduction evidence
were not rewritten. The previously released v5 media files are unchanged.

## Validation

- Final full frontend suite: **196 passed, 0 failed**.
- Build: **20 pages**; copy lint: **1,634 files**; links: **728**, no warnings.
- CUA browser review: Chinese and English Demo at 390×844 and 1440×960.
  No horizontal overflow; removed voice details are absent even when the guide
  is expanded. Both languages retain six chapters and seven feature links.
- Chinese chapter 3 loaded at **12.92 seconds**, paused and ready; player
  duration **33.421333 seconds**. No video source, caption or seek-code change.
- Existing creator history test verifies the raw hash/count are absent while
  the automatic-transcript label, dates and original URL remain available.
- Evidence: [Chinese phone](copy-details-2026-09-06/zh-mobile.png),
  [English phone](copy-details-2026-09-06/en-mobile.png) and
  [Chinese desktop](copy-details-2026-09-06/zh-desktop.png).

Production verification is appended after deployment. No backend runtime,
strategy, entitlement or notification delivery changes are included.
