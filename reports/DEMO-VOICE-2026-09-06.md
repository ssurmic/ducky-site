# Bilingual product walkthrough — September 6, 2026

The voice-v3 build replaces the first Tingting narration with separately written Chinese
and English voiceovers, more conversational delivery, and recorded UI interactions.
The earlier 0.6B audition was rejected by the owner and is not published. The final
videos use Qwen 1.7B stock speakers, Chinese Dylan and English Aiden; no voice is cloned.

## What changed

- The introduction animates a source-attributed creator view through verification,
  stock research, calendar and alert steps. It is labeled illustrative and time compressed,
  not presented as a measured processing or notification latency.
- The creator summary expands into source timestamps. The actual public example is
  Wall Street Millennial's September 4 memory-industry video; it is not relabeled as a
  recommendation for a stock the author did not call out.
- The native portfolio component changes from 20% to 40% cash and recomputes the chart.
  The fictional path and the possibility of missing a rebound remain visible.
- Native radar controls combine sector, company size, oversold conditions and verified
  open-market buying. The recording creates no saved filter, notification or promised match.
- The calendar opens PPI history for NVDA: 45 available five-session observations,
  corresponding trading dates, stock/SPY returns and losses remain visible. Actual cached
  public evidence is used; no prediction-market probability is fabricated.
- The macro panel switches between the environment score, QQQ/SPY and ten-year yields.
  It retains the data date, reconstruction label and loss-inclusive historical comparison.
- Each homepage language selects its own video, poster and default caption track. Both
  languages remain available as captions. No autoplay, preloading, external player or tracker.

This is an edited sequence of Browser MCP captures and intermediate UI states, not a
continuous real-time screen recording. Recording-only layout and public fixtures are in
`scripts/demo/recording`, outside the site's public build. Financial calculations, production
research models, permissions, payments and alert behavior are unchanged.

## Model choice and size

The official Qwen implementation discards `instruct` for 0.6B, so a conversational prompt
cannot control that checkpoint. The 1.7B CustomVoice variant supports instruction control.
The pinned revision is `0c0e3051f131929182e2c023b9537f8b1c68adfe`, Apache 2.0, with
4,520,217,432 bytes of inference files in the complete download manifest.
[Official model](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice),
[official inference implementation](https://github.com/QwenLM/Qwen3-TTS/blob/main/qwen_tts/inference/qwen3_tts_model.py).

The bilingual script requests a relaxed laptop walkthrough, short natural pauses and no
announcer delivery. The generated speech keeps its own speed and pitch. Larger weights
and ASR similarity are not guarantees of subjective voice naturalness; sample clips were
provided to the owner for comparison.

Other researched candidates:

| Candidate | Why it was not used for this release |
|---|---|
| [Kokoro 82M](https://huggingface.co/hexgrad/Kokoro-82M) | Very small English option; the separate [v1.1 Chinese variant](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh) is not a universal upgrade and uses different voice files. |
| [CosyVoice](https://github.com/FunAudioLLM/CosyVoice) | Complete queried snapshot was about 9.75 GB, including alternative weights; ARM64 runtime dependencies made isolation more involved. |
| [ElevenLabs](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform) | Free-plan audio does not include commercial usage rights; no paid account or purchase was assumed. |

## DGX isolation and cleanup

Everything is under `~/.local/share/ducky-tts`, separate from the production repository and
venv. The tested runtime uses CPU Torch 2.9.1, qwen-tts 0.1.1 and Transformers 4.57.3.
The pinned package lock, capped/checksummed downloader and reproduction commands are in
[scripts/demo/README.md](../scripts/demo/README.md). Model weights are not committed.

Synthesis was a transient CPU-only job with a 12 GiB cgroup limit, four-core CPU quota,
no swap allowance, low scheduling priority and a 40-minute runtime limit. The sampled
cgroup peak was 9,570,783,232 bytes; process `ru_maxrss` was 11,694,332 KiB. These are
separate counters and are not added. No GPU inference, Ollama unload, production venv
change or recurring TTS service was introduced.

After verification, the discarded 0.6B model and both temporary ASR models were removed.
The task directory fell from 8.0G to **5.7G** in `du`; the retained model is 4.3G and
runtime 1.5G (rounded separately). Both TTS/ASR jobs are inactive. API, market-context
and earnings-context timers remain active; available host memory returned to 25GiB.
Active-state snapshots do not establish zero scheduling contention or measure API latency.
Evidence is in `scripts/demo/evidence/resource-{running,final}.txt` and the checksum log.

## Build acceptance

| Video | Duration | Size | Final loudness / true peak |
|---|---:|---:|---:|
| Chinese | 74.221 s | 2,765,518 bytes | -16.58 LUFS / -1.31 dBTP |
| English | 66.141 s | 2,463,734 bytes | -16.41 LUFS / -1.43 dBTP |

Both are 1920×1080 H.264, yuv420p/BT.709, 25 fps, AAC/48 kHz, fast-start MP4.
Two-pass normalization targets -16 LUFS / -1.5 dBTP per scene; the table measures the
final AAC streams. The codec's small peak overshoot is reflected in those measurements.
The first encoding exposed inherited full-range pixel metadata; explicit limited-range
BT.709 conversion fixed it before publication.

- All 16 WAVs passed finite/nonclipping/silence guards and independent CPU ASR review.
  Reviewed differences were punctuation, simplified/traditional Chinese, number formatting
  and homophones such as `due/do` and `只/支`; no obvious omitted or repeated sentence
  appeared in the independent transcripts. This is not a claim of human listening approval.
- Independent media verification: 1,829 checks, zero failures. Four caption tracks retain
  every scripted sentence in order, with valid, nonoverlapping bounds. Captions are timed
  approximately within recognized speech boundaries, not word-perfect alignment.
- Full decoding and final loudness analysis completed for both videos.
- 126 frontend tests pass. Build, copy lint and all 718 internal links pass.
- Browser playback confirmed the Chinese and English sources, durations, active matching
  captions, advancing playheads and no media error. At 390px both pages have no horizontal
  overflow; native fullscreen controls and transcript remain available.

The source, SHA-256 references, generation log, ASR output, timeline, caption validation,
and audio measurements are versioned under `scripts/demo/`. Video generation never runs
on a page request or in the normal build. The frontend includes company-context changes
from `ca2a576`; its existing application modules are preserved. Earlier dated media remain
available for rollback. Deployment commit and live verification are recorded in the
backend product tracker after publishing.
