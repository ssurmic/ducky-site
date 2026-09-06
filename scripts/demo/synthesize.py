"""Offline demo narration. Isolated CPU environment; never imported by the website.

Usage: synthesize.py MANIFEST MODEL_DIR OUTPUT_DIR [--sample] [--language zh|en]
Run in a bounded one-shot cgroup; no server, CUDA, credentials or product DB access.
"""
import argparse
import json
import os
from pathlib import Path
import resource
import time

os.environ['CUDA_VISIBLE_DEVICES'] = ''
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['OMP_NUM_THREADS'] = '4'

parser = argparse.ArgumentParser()
parser.add_argument('manifest', type=Path)
parser.add_argument('model_dir', type=Path)
parser.add_argument('output_dir', type=Path)
parser.add_argument('--sample', action='store_true')
parser.add_argument('--language', choices=['zh', 'en'])
parser.add_argument('--speaker')
args = parser.parse_args()

import numpy as np
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

torch.set_num_threads(4)
torch.set_num_interop_threads(1)
torch.manual_seed(6092026)
manifest = json.loads(args.manifest.read_text())
model = Qwen3TTSModel.from_pretrained(
    str(args.model_dir), device_map='cpu', dtype=torch.float32,
    attn_implementation='sdpa', local_files_only=True,
)
print(json.dumps({'loaded': manifest['model'], 'device': 'cpu',
                  'speakers': model.get_supported_speakers()}), flush=True)
args.output_dir.mkdir(parents=True, exist_ok=True)
rows = manifest['scenes'][:1] if args.sample else manifest['scenes']
results = []
for language in ([args.language] if args.language else ['zh', 'en']):
    for row in rows:
        target = args.output_dir / f"{row['name']}.{language}.wav"
        if target.exists():
            raise FileExistsError(f'Refusing to overwrite reviewed audio: {target.name}')
        started = time.monotonic()
        speaker = args.speaker or manifest['speakers'][language]
        # 1.7B supports style instructions; 0.6B ignores them in the official implementation.
        with torch.inference_mode():
            waves, sample_rate = model.generate_custom_voice(
                text=row[language], language={'zh': 'Chinese', 'en': 'English'}[language],
                speaker=speaker, instruct=manifest.get('instructions', {}).get(language),
                max_new_tokens=500,
                do_sample=True, temperature=0.7, top_p=0.8,
            )
        wave = np.asarray(waves[0], dtype=np.float32)
        seconds = len(wave) / sample_rate
        if not np.isfinite(wave).all() or not 1 < seconds < 40:
            raise ValueError('Invalid or unbounded narration output')
        if np.max(np.abs(wave)) >= 1 or np.sqrt(np.mean(wave ** 2)) < 0.005:
            raise ValueError('Clipped or effectively silent narration')
        sf.write(target, wave, sample_rate, subtype='PCM_16')
        result = {'file': target.name, 'language': language,
                  'speaker': speaker, 'seconds': seconds,
                  'generation_seconds': round(time.monotonic() - started, 2),
                  'peak': float(np.max(np.abs(wave))),
                  'rss_peak_kib': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss}
        results.append(result)
        print(json.dumps(result), flush=True)
        (args.output_dir / 'generation.json').write_text(json.dumps(results, indent=2) + '\n')
