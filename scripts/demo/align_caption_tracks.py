"""Align authored bilingual phrase groups to each voice's provider word boundaries.

Usage: python3 align_caption_tracks.py MANIFEST AUDIO_DIR NEW_MANIFEST
The output must be new; existing released manifests are never overwritten.
"""
import argparse,json,wave
from pathlib import Path
from word_captions import align_chunks
p=argparse.ArgumentParser();p.add_argument('manifest',type=Path);p.add_argument('audio_dir',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
if a.output.exists():raise FileExistsError('Use a new output manifest')
m=json.loads(a.manifest.read_text())
for scene in m['scenes']:
 chunks=scene['caption_chunks'];assert len(chunks['en'])==len(chunks['zh']), 'Author matching semantic groups first'
 for lang in ('en','zh'):assert ''.join(''.join(chunks[lang]).split())==''.join(scene[lang].split())
 scene['caption_timings']={}
 for voice in ('en','zh'):
  audio=a.audio_dir/(scene['name']+'.'+voice+'.wav')
  with wave.open(str(audio)) as w:duration=w.getnframes()/w.getframerate()
  words=[json.loads(s) for s in audio.with_suffix('.words.jsonl').read_text().splitlines()]
  native=align_chunks(chunks[voice],words,duration);other='zh' if voice=='en' else 'en'
  scene['caption_timings'][voice]={voice:native,other:[dict(cue,text=text) for cue,text in zip(native,chunks[other])]}
a.output.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
