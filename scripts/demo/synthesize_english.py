"""Offline English Demo narration; isolated from all production request paths.

Usage: synthesize_english.py MANIFEST MODEL_DIRECTORY OUTPUT_DIRECTORY
Kokoro 0.9.4 / Misaki 0.9.4; reuse CPU Torch only in a separate virtualenv.
"""
import hashlib
import json
import os
from pathlib import Path
import sys
import time

os.environ['CUDA_VISIBLE_DEVICES'] = ''
os.environ['OMP_NUM_THREADS'] = '2'
import numpy as np
import soundfile as sf
import torch
from huggingface_hub import hf_hub_download
from kokoro import KModel, KPipeline

torch.set_num_threads(2)
torch.manual_seed(6092026)
manifest_path, model_path, output_path = map(Path, sys.argv[1:4])
manifest = json.loads(manifest_path.read_text())
speed = float(manifest.get('english_synthesis', {}).get('speed', 1.0))
if not 0.8 <= speed <= 1.3:
    raise ValueError('Narration speed must stay within a clear spoken range')
revision = 'f3ff3571791e39611d31c381e3a41a3af07b4987'
files = ['config.json', 'kokoro-v1_0.pth', 'voices/af_heart.pt']
assets = {}
for filename in files:
    path = Path(hf_hub_download('hexgrad/Kokoro-82M', filename,
                              revision=revision, local_dir=model_path))
    if path.stat().st_size > 400_000_000:
        raise ValueError('Unexpected model asset size')
    assets[filename] = {'bytes': path.stat().st_size,
                        'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
if assets['kokoro-v1_0.pth']['sha256'] != '496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4':
    raise ValueError('Official model checksum mismatch')
model = KModel(repo_id='hexgrad/Kokoro-82M', config=str(model_path / 'config.json'),
               model=str(model_path / 'kokoro-v1_0.pth')).eval().to('cpu')
pipeline = KPipeline(lang_code='a', model=model, device='cpu')
output_path.mkdir(parents=True, exist_ok=True)
(output_path / 'model-manifest.json').write_text(json.dumps({
    'repo': 'hexgrad/Kokoro-82M', 'revision': revision, 'files': assets,
    'speaker': 'af_heart', 'language': 'American English', 'synthesis_speed': speed,
    'post_synthesis_speed_change': False}, indent=2) + '\n')
rows = []
for scene in manifest['scenes']:
    target = output_path / (scene['name'] + '.en.wav')
    if target.exists():
        raise FileExistsError('Use a new output directory; reviewed audio is immutable')
    started = time.monotonic()
    parts = list(pipeline(scene['en'], voice=str(model_path / 'voices/af_heart.pt'),
                          speed=speed, split_pattern=None))
    samples = np.concatenate([part.audio.detach().cpu().numpy() for part in parts])
    if not np.isfinite(samples).all() or np.max(np.abs(samples)) >= 1:
        raise ValueError('Invalid or clipped narration')
    sf.write(target, samples, 24000, subtype='PCM_16')
    row = {'file': target.name, 'seconds': len(samples) / 24000,
           'generation_seconds': round(time.monotonic() - started, 2),
           'speaker': 'af_heart', 'peak': float(np.max(np.abs(samples))),
           'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
    rows.append(row)
    print(json.dumps(row), flush=True)
    (output_path / 'generation.json').write_text(json.dumps(rows, indent=2) + '\n')
