"""Offline editor utility: synthesize public demo copy and retain word timestamps.

Not imported by builds or product code. The service exposes no immutable model version;
retain source MP3, word boundaries and selected WAV hashes. No API keys required.
Usage: python synthesize_edge.py MANIFEST OUTPUT_DIRECTORY
"""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path
import subprocess
import edge_tts

p=argparse.ArgumentParser();p.add_argument('manifest',type=Path);p.add_argument('output',type=Path)
a=p.parse_args();d=json.loads(a.manifest.read_text());a.output.mkdir(parents=True,exist_ok=True)
c=d['english_synthesis'];rows=[]
async def main():
 for scene in d['scenes']:
  stem=scene['name']+'.en';mp3=a.output/(stem+'.mp3');meta=a.output/(stem+'.words.jsonl');wav=a.output/(stem+'.wav')
  if any(x.exists() for x in (mp3,meta,wav)):raise FileExistsError('Use a new output directory')
  tts=edge_tts.Communicate(scene.get('spoken_en',scene['en']),c['voice'],rate=c['rate'],pitch=c['pitch'],boundary='WordBoundary',connect_timeout=15,receive_timeout=60)
  await tts.save(str(mp3),str(meta))
  subprocess.run(['ffmpeg','-v','error','-i',str(mp3),'-ac','1','-ar','24000','-c:a','pcm_s16le',str(wav)],check=True)
  words=[json.loads(line) for line in meta.read_text().splitlines()];assert words and all(w['type']=='WordBoundary' for w in words)
  row={'scene':scene['name'],'voice':c['voice'],'rate':c['rate'],'words':len(words),'mp3_sha256':hashlib.sha256(mp3.read_bytes()).hexdigest(),'wav_sha256':hashlib.sha256(wav.read_bytes()).hexdigest(),'metadata_sha256':hashlib.sha256(meta.read_bytes()).hexdigest()};rows.append(row)
  (a.output/'generation.json').write_text(json.dumps({'provider':c,'scenes':rows},indent=2)+'\n');print(json.dumps(row),flush=True)
asyncio.run(main())
