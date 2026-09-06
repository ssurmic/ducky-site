# Offline demo production

These tools author static media. They are never imported by the application, web build,
API, research workers, or alert delivery. Do not put model files or environments in Git.
The September 6 voice-v3 recording uses the pinned Qwen 1.7B stock voices Dylan (Chinese)
and Aiden (English). No reference voice or cloning is involved.

The voice-v5 cut uses stock female speaker Serena in both languages, with five connected
scenes and no artificial speed changes. The selected narration plans a 33.40-second Chinese
cut and a 38.96-second English cut. `evidence/voice-v5/` retains all ten selected WAVs,
their hashes, pinned source manifests, generation details and independent speech checks.
The v4 quicklook remains an unpublished audition. Website guide descriptions explain
controls and research uses independently of the narration. Player captions remain available.

## Isolated CPU runtime

The operator's ARM64 DGX environment is `~/.local/share/ducky-tts/venv`, separate from
production. The exact installed packages are in `requirements-linux-aarch64.lock`.
For a new Python 3.12 virtualenv, install that lock with `--no-deps` and the CPU wheel
index `--extra-index-url https://download.pytorch.org/whl/cpu`. The ordinary qwen-tts
extra dependency resolver can pull large CUDA or interactive-demo packages; this lock
is for the tested offline stock-voice path only. Never replace the production venv.

`download_model.py MANIFEST OUTPUT_DIR` fetches a pinned snapshot, caps total file sizes,
and verifies sizes and published LFS SHA-256 hashes. `model-download.json` includes the
complete inference weights (about 4.52 GB); `asr-download.json` is an optional 486 MB
independent speech-check model. The original production run hard-linked its identical
speech tokenizer while comparing candidates. A clean installation needs only the final
model, not both candidates. No Ollama model changes or service restarts are required.

Run synthesis as a transient user service, not a daemon or recurring timer:

```bash
systemd-run --user --collect --unit=ducky-demo-voice-UNIQUE \
  -p MemoryMax=12G -p MemorySwapMax=0 -p CPUQuota=400% -p Nice=10 \
  -p RuntimeMaxSec=2400 \
  /path/to/isolated/venv/bin/python synthesize.py \
  voiceover-2026-09-06.json /path/to/model /path/to/new-audio-directory
```

The script itself selects CPU, offline model access, and four threads. Use `--sample`
for a short bilingual audition. Keep output directories distinct: existing WAVs are
never overwritten. If a segment needs replacing, synthesize a small manifest in a new
directory and record that decision. Test the resulting speech; model size is not a
naturalness guarantee. No hosted-service purchase is part of this workflow.

## Record UI actions

For v5, `frames-v5/` contains new production browser captures, with dates, URLs and crop
bounds in `capture-provenance.json`. Capture only public research content and unsaved
example conditions; exclude private watchlists and account details. Any historical inbox
test must keep its Demo label and original source date. A manual device test does not
prove automatic detection of a new market event. The final captures, composition inputs and render reports are retained for verification.
`recording/short-stage.html` composes unchanged source screenshots with dated context
for the historical filing, topic inbox and end card; it is not part of the public site.

The earlier v3 read-only recording stage is retained for reproducibility:

`python3 recording/serve.py` serves only on `127.0.0.1:8778`. It uses the current repo's
native public components and saved public snapshots; all write methods return 405.
Open `/?scene=newview`, `creator`, `simulation`, `screen`, `calendar`, `briefing`, or `end`.
English uses `/en.html?scene=...`. Do not publish this recording server or fixtures.

Capture through Browser MCP at 1920 x 1080. The `frames/` files are actual UI captures;
`shots` in the narration manifest orders them at fractions of each scene's audio-led
runtime. This is an edited walkthrough, not continuous screen-recording or measured
notification latency. The introductory flow is explicitly illustrative and time
compressed. The portfolio path is explicitly fictional. Calendar and macro figures
retain source dates, losses, observation windows, and uncertainty. Never turn the public
memory-industry video into an unsupported stock endorsement.

## Assemble and check

```bash
/path/to/isolated/venv/bin/python check_speech.py /path/to/asr-model /path/to/audio
python3 assemble.py voiceover-2026-09-06.json /path/to/audio /path/to/new-media \
  --ffmpeg /path/to/ffmpeg
python3 verify_media.py voiceover-2026-09-06.json /path/to/audio /path/to/new-media \
  --ffprobe /path/to/ffprobe --json-out /path/to/new-verification.json
```

For the v5 edit, use `voiceover-2026-09-06-v5.json`, `evidence/voice-v5/` as the audio
directory, and `--frames-dir frames-v5` on both assembly and verification. All paths
are relative to `scripts/demo/` in this example. Output to a new directory first. Differently sized captures are normalized to the same
1920×1080 RGB canvas before concatenation, then encoded at a constant 25 fps.

Bound the ASR job separately (2 CPU cores, 2 GiB, 10 minutes). ASR is an independent
review aid for omissions, repeats, and endings. It is not a listening test or voice
quality score. Review differences rather than rewriting the intended script to match
an ASR homophone. Captions use the complete reviewed script with approximate phrase
timing. Audio keeps its generated speed/pitch and is normalized in two passes to
-16 LUFS / -2 dBTP per scene before AAC encoding, leaving codec peak headroom.
Native captions use 70% vertical positioning above narrow-player controls; the creator
scene uses 5% so its dated prices and benchmark results remain visible. The manifest
can supply semantic caption chunks without changing the complete narration text.

Copy only the two MP4s, posters and four VTTs into `public/media/`. Preserve the dated
manifest, generation/verification evidence, and render report. Verify local and live
bilingual playback, captions and narrow-screen layout before considering delivery done.
Use a new versioned filename when replacing published video; keep earlier media for
rollback. Stop transient jobs and remove discarded task-owned model weights afterwards.

For a single-language revision, pass `--language zh` to synthesis, assembly and verification.
The selected voice still requires both complete caption tracks. Use that version's manifest,
scene count and independent ASR report; do not mix another voice's report into the new cut.
Update website chapter start times from the final render report, then check seeking before
and after metadata loads. No chapter click should start audio automatically.
