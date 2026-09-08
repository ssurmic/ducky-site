# Bilingual creator workflow demo — 2026-09-08

The main homepage demo now follows an actual watchlist → Information Map → chart → creator view → original video → historical price comparison workflow. Chinese and English use separately generated speech, matching source examples, short captions, and nine synchronized chapter links. The separate Intel tutorial remains available.

## Selected source examples

- Chinese: 投资 TALK 君, AVGO, video `3E-HXC2HUvg`, point `claim:75b2c484c5bc6622e1a45ec5`, published September 3, 2026. The source link opens 16:13. His fiscal 2028 EPS and valuation expectations remain attributed to him. Twenty trading sessions have not elapsed.
- English: Parkev Tatevosian, CFA, NVIDIA, `qleHy1oNdjU`, point `claim:7ce209bd72de40349998fe26`, published September 7, 2026. Source interval 585.4–595.08 seconds; the 9:45 link and original English transcript were checked. The captured player is paused at 9:49, inside that interval. The view is not a newly disclosed purchase and has no mature twenty-session outcome.
- Historical comparison: TALK, GOOGL, `Qb9Nl-3bOi8`, point `claim:18625b94c4ec70eeac2d4c94`, published June 10, 2026. The Google statement starts at 12:55; the 12:52 source link preserves context. Prior completed close June 9: $364.26; twentieth following session July 9: $358.89; change −1.5%. The historical content was collected September 8. This is not proof of an alert sent in June or an executable trading return.

Two independently found source-attribution problems were passed to the existing source owners: NVIDIA `934f140e67031c949a782a8d` in the September 3 AVGO discussion, and GOOGL `c0a36810fd60a80391e3399f` using Meta CTR/conversion figures. Neither disputed point appears in this film. The film does not depend on the unfinished NKE bindings.

The remaining scenes show current product screens for oversold candidates, QQQ/SPY market context, public executive-purchase and institutional-holding records, and upcoming events in the watchlist daily digest. The insider example includes COE's June 30 filing, which has transaction-linked confirmed open-market purchases and a separately unverified portion; the film does not narrate the total as entirely open-market. Institutional holdings are described as changes, not uniformly increases. The daily digest scene does not claim that pending AI stock analysis has finished. X and Reddit are described as integrations in progress.

## Production and implementation

- Version: `2026-09-08-creator-workflow-v1`.
- Chinese: 46.08 seconds. English: 43.48 seconds. H.264 1920×1080/25 fps, AAC 48 kHz, fast-start MP4.
- Xiaoxiao / Ava native language speech, rate +4%, no time stretching. Measured final loudness approximately −16.00 / −16.22 LUFS, true peaks −1.98 / −1.97 dBTP.
- Four WebVTT tracks cover both caption languages for each spoken version. Phrases follow native provider word boundaries. Explicit line breaks keep long subtitles complete at a 320px viewport. This is authored-script and technical verification, not independent ASR or a human listening certification.
- Real browser captures, edited cuts and camera motion. The video does not represent application latency. Source pages exclude unrelated recommendations and account controls.
- Production voice details remain in development files, not homepage copy. The user guide describes actual controls and outcomes independently of the narration.
- Fixed main-video mobile captions colliding with persistent controls: moved portrait cues upward and increased the main film's minimum caption font to 16px. The Intel tutorial's caption size and placement remain unchanged.
- Re-recorded the price modal after the UI owner's formatted-time fix; no raw microsecond timestamps remain in that shot. Disclosure scenes use actual record cards instead of filter/loading screens.

## Validation

- 442 JavaScript tests passed before the final caption position change; the 14 media/guide tests passed after it, including cold seek, delayed metadata, decoder clamping and caption clearance. Full suite also runs on the exact release commit in CI.
- Python tests: 8 run, 1 expected skip. Copy lint and internal link checks passed.
- Full MP4 decode, stream duration alignment, fast-start layout, waveform signal/peak checks, both language cue coverage, non-overlap and closing pause verified; see `scripts/demo/evidence/creator-workflow-v1/media-verification.json`.
- Real local browser checks exercised chapter seeking and playback; responsive previews at 390×650 and 320×600 exposed and verified the caption repairs. These are browser viewport tests, not physical-device certification.
- Main video has 9 timed chapters and 8 independent feature-guide entries; both source languages retain the existing separate Intel tutorial.
- Only the demo task's temporary INTC/MSFT watchlist additions were removed after filming. Other concurrent watchlist additions were retained. No notifications were sent, and account delivery settings and research/source records were not changed by the video work.

Private capture originals and source transcripts are retained in the task artifact directory; only selected cropped frames inside the videos, posters, and captions are published. No DGX model work, TTS job or backend deployment was used.
