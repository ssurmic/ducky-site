"""Offline public-demo narration; no build or product import. Retain source words."""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path
import subprocess
import edge_tts

parser = argparse.ArgumentParser()
parser.add_argument('manifest', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--language', choices=['zh', 'en'])
args = parser.parse_args()
manifest = json.loads(args.manifest.read_text())
config = manifest['synthesis']
args.output.mkdir(parents=True, exist_ok=True)

async def main():
    records = []
    for language in ([args.language] if args.language else manifest['render_languages']):
        for scene in manifest['scenes']:
            stem = scene['name'] + '.' + language
            mp3, words, wav = [args.output / (stem + ext) for ext in ('.mp3', '.words.jsonl', '.wav')]
            if any(p.exists() for p in (mp3, words, wav)):
                raise FileExistsError('Use a new output directory')
            spoken = scene.get('spoken_' + language, scene[language])
            voice = manifest['speakers'][language]
            await edge_tts.Communicate(spoken, voice, rate=config['rate'], pitch=config['pitch'],
                boundary='WordBoundary', connect_timeout=15, receive_timeout=60).save(str(mp3), str(words))
            subprocess.run(['ffmpeg', '-v', 'error', '-i', str(mp3), '-ac', '1', '-ar', '24000',
                            '-c:a', 'pcm_s16le', str(wav)], check=True)
            metadata = [json.loads(line) for line in words.read_text().splitlines()]
            assert metadata and all(row['type'] == 'WordBoundary' for row in metadata)
            row = {'scene':scene['name'], 'language':language, 'voice':voice, 'spoken_text':spoken,
                   'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (mp3, words, wav)}}
            records.append(row)
            (args.output / ('generation-' + (args.language or 'both') + '.json')).write_text(
                json.dumps({'config':config, 'scenes':records}, ensure_ascii=False, indent=2) + '\n')
            print(scene['name'], language, len(metadata), flush=True)

asyncio.run(main())
