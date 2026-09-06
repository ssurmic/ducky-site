# Ducky product walkthrough · September 6, 2026

The first release below has been superseded by the bilingual voice-v3 walkthrough. See [updated production and verification](DEMO-VOICE-2026-09-06.md). Earlier media remain available for rollback.

The homepage now includes a 65-second narrated walkthrough before the interactive stock example. The hero's secondary link opens it. Native controls, no autoplay, preload none, a dated poster, Chinese and English WebVTT captions and an expandable transcript keep it usable on phones and without sound. No external video platform or tracker is required.

## What the film shows

| Time | Actual component / scene | Evidence boundary |
|---|---|---|
| 0:00 | Stock-centered introduction | Staged presentation; one existing duck brand asset |
| 0:07 | Public YouTube example, source and timestamps | Wall Street Millennial, September 4, 2026; author's opinion, not our endorsement |
| 0:15 | Creator portfolio simulation | Explicit fictional path, 20% cash / 40% stock; no claimed historical creator return |
| 0:23 | Changing cash to 40% | Actual interactive component; includes the possibility of missing a rebound |
| 0:31 | Same-stock composite screen | Technology, cap floor, oversold plus strict open-market buying; draft only, no match claim or saved notification |
| 0:40 | Event calendar | Existing public dates and partial-coverage status; ORCL/NVDA are example selections |
| 0:47 | Macro Beta line chart | Frozen v2 historical reconstruction, as of September 4; never presented as a market-timing prediction |
| 0:58 | Free entry, Pro $9/month | Current plan, no checkout or purchase performed |

## Production and verification

Captured actual web components using Browser MCP / CUA on a local read-only staging server. This Browser MCP version does not expose continuous screen recording; the deliverable edits eight verified interface captures into a narrated MP4. The staging server rejects POSTs and contains no account token, user holdings or private creator feed. It uses an explicitly public creator example and a deliberately demonstrated macro chart. Local fixture files are not published.

Narration uses the macOS Tingting synthetic voice at 190 words/minute. No person is impersonated. Eight AIFF segments and screenshots were assembled with FFmpeg H.264 / AAC, 1920×1080, yuv420p, faststart. Result: 64.71 seconds, 1,512,620 bytes (about 1.5 MB), audio 48 kHz. Both caption tracks were checked against the complete transcript, without dropping text.

Files in `public/media/`: `ducky-walkthrough-2026-09.mp4`, `.jpg`, `.zh.vtt`, `.en.vtt`. The recording is intentionally dated; replace it with a newly dated file when important functionality or prices change. Keep screenshots and narration consistent, never use staged performance as evidence. Captures and assembly script for this release remain in the operator's `/tmp/ducky-demo-stage` workspace; the published MP4, captions, transcript and poster are versioned here.

The operator does not need to record a video for this version. A later founder voiceover can replace the synthetic narration without changing the truthful source and scenario labels.
