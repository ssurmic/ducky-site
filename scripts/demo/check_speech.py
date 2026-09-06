"""Offline ASR review aid. A transcript check does not grade subjective voice quality."""
import argparse
import json
from pathlib import Path
import os
os.environ['CUDA_VISIBLE_DEVICES'] = ''
os.environ['OMP_NUM_THREADS'] = '2'
from faster_whisper import WhisperModel

p = argparse.ArgumentParser()
p.add_argument('model_dir', type=Path)
p.add_argument('audio_dir', type=Path)
args = p.parse_args()
model = WhisperModel(str(args.model_dir), device='cpu', compute_type='int8',
                     cpu_threads=2, num_workers=1, local_files_only=True)
results = []
for wav in sorted(args.audio_dir.glob('*.wav')):
    lang = wav.stem.rsplit('.', 1)[1]
    if lang not in ('zh', 'en'):
        continue
    # No prompt/transcript supplied: this must independently decode the actual audio.
    segments, info = model.transcribe(str(wav), language=lang, beam_size=5,
                                     word_timestamps=True, condition_on_previous_text=False)
    segments = list(segments)
    result = {'file': wav.name, 'language': lang, 'duration': info.duration,
              'text': ''.join(s.text for s in segments),
              'segments': [{'start': s.start, 'end': s.end, 'text': s.text,
                            'words': [{'start': w.start, 'end': w.end,
                                       'word': w.word, 'probability': w.probability}
                                      for w in (s.words or [])]} for s in segments]}
    results.append(result)
    print(json.dumps({k:v for k,v in result.items() if k != 'segments'}, ensure_ascii=False), flush=True)
(args.audio_dir / 'speech-check.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
