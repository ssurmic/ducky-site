"""Assemble reviewed UI captures and narration into language-specific static media.

No TTS on build or request paths. Scene duration follows audio; no pitch/time stretching.
Usage: assemble.py MANIFEST AUDIO_DIR OUTPUT_DIR --ffmpeg /path/to/ffmpeg
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import tempfile
import textwrap
import wave

parser = argparse.ArgumentParser()
parser.add_argument('manifest', type=Path)
parser.add_argument('audio_dir', type=Path)
parser.add_argument('output_dir', type=Path)
parser.add_argument('--ffmpeg', default='ffmpeg')
parser.add_argument('--language', choices=['zh', 'en'], help='Render only this voice; keep both caption languages')
parser.add_argument('--frames-dir', type=Path, help='Dated captures; preserve earlier reviewed frames')
args = parser.parse_args()
root = Path(__file__).resolve().parent
frames = (args.frames_dir or root / 'frames').resolve()
manifest = json.loads(args.manifest.read_text())
args.output_dir.mkdir(parents=True, exist_ok=True)
stem = 'ducky-walkthrough-' + manifest['version']
asr = {row['file']: row for row in json.loads((args.audio_dir / 'speech-check.json').read_text())}

def run(cmd):
    result = subprocess.run([args.ffmpeg, '-hide_banner', '-nostdin', *cmd],
                            capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('FFmpeg failed: ' + result.stderr[-5000:])
    return result

def stamp(seconds):
    n = round(seconds * 1000)
    return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02}.{n%1000:03}'

def caption_chunks(text, language):
    clauses = [x for x in re.split(r'(?<=[。？！.!?])\s*', text) if x]
    if language == 'zh':
        pieces = []
        for clause in clauses:
            pieces.extend(textwrap.wrap(clause, width=30, break_long_words=True,
                                       break_on_hyphens=False))
        return pieces
    return [x for clause in clauses for x in textwrap.wrap(clause, width=74,
            break_long_words=False, break_on_hyphens=False)]

report = {'version': manifest['version'], 'audio_processing':
          'Two-pass EBU R128 -16 LUFS / -2 dBTP per scene, with AAC headroom; no speech speed changes',
          'frame_processing': 'Normalize every capture to one 1920x1080 RGB canvas before concatenating; constant 25 fps',
          'caption_presentation': 'Native WebVTT in each scene’s reserved caption area; demonstration footer visible',
          'videos': {}}
with tempfile.TemporaryDirectory(prefix='ducky-demo-encode-') as directory:
    temporary = Path(directory)
    normalized_frames = {}
    for language in ([args.language] if args.language else ['zh', 'en']):
        segments, timeline, cues = [], [], {'zh': [], 'en': []}
        start = 0.0
        for row in manifest['scenes']:
            name = row['name']
            image = frames / language / f'{name}.png'
            audio = args.audio_dir / f'{name}.{language}.wav'
            assert image.is_file() and audio.is_file()
            with wave.open(str(audio)) as handle:
                speech_seconds = handle.getnframes() / handle.getframerate()
            # Short pauses protect endings and let the next scene settle before its first word.
            timing = manifest.get('timing', {})
            lead, tail = timing.get('lead', 0.22), timing.get('tail', 0.38)
            fade = timing.get('fade', 0.16)
            assert 0 <= lead <= 1 and 0 <= tail <= 1 and 0 <= fade <= 0.5
            duration = math.ceil(max(speech_seconds + lead + tail, row.get("minimum_seconds", 0)) * 25) / 25
            segment = temporary / f'{name}-{language}.mp4'
            measurement = run(['-i', str(audio), '-af',
                               'loudnorm=I=-16:TP=-2:LRA=7:print_format=json',
                               '-f', 'null', '-']).stderr
            # FFmpeg can append muxer statistics after loudnorm's JSON block.
            measured, _ = json.JSONDecoder().raw_decode(measurement[measurement.rfind('{'):])
            loudnorm = ('loudnorm=I=-16:TP=-2:LRA=7:'
                        f"measured_I={measured['input_i']}:"
                        f"measured_TP={measured['input_tp']}:"
                        f"measured_LRA={measured['input_lra']}:"
                        f"measured_thresh={measured['input_thresh']}:"
                        f"offset={measured['target_offset']}:linear=true")
            vf = (f'fps=25,scale=1920:1080:force_original_aspect_ratio=decrease:'
                  f'in_range=full:out_range=limited:out_color_matrix=bt709,'
                  f'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x090d0a,setsar=1,'
                  f'format=yuv420p,setparams=range=limited:color_primaries=bt709:'
                  f'color_trc=bt709:colorspace=bt709,'
                  f'fade=t=in:st=0:d={fade},fade=t=out:st={duration-fade}:d={fade}')
            af = (f'{loudnorm},aresample=48000,afade=t=in:d=0.008,'
                  f'adelay={round(lead*1000)}:all=1,apad,atrim=duration={duration}')
            shots = row.get('shots', {}).get(language, [{'file': image.name, 'at': 0}])
            assert shots[0]['at'] == 0
            assert all(0 <= shot['at'] < 1 for shot in shots)
            assert all(a['at'] < b['at'] for a,b in zip(shots, shots[1:]))
            stills = temporary / f'{name}-{language}-frames.txt'
            lines = []
            for j, shot in enumerate(shots):
                frame = frames / language / shot['file']
                assert frame.is_file() and frame.resolve().is_relative_to(frames.resolve())
                # A size change within an image concat reinitializes fps and can drop
                # frames. Normalize stills first so every scene keeps a continuous clock.
                key = str(frame.resolve())
                if key not in normalized_frames:
                    normalized = temporary / ('frame-' + hashlib.sha256(key.encode()).hexdigest()[:16] + '.png')
                    run(['-loglevel', 'error', '-i', str(frame), '-vf',
                         'scale=1920:1080:force_original_aspect_ratio=decrease,'
                         'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x090d0a,setsar=1,format=rgb24',
                         '-frames:v', '1', str(normalized)])
                    normalized_frames[key] = normalized
                frame = normalized_frames[key]
                next_at = shots[j+1]['at'] if j+1 < len(shots) else 1
                lines.extend([f"file '{frame.as_posix()}'", f"duration {(next_at-shot['at'])*duration:.6f}"])
            lines.append(f"file '{frame.as_posix()}'")
            stills.write_text('\n'.join(lines) + '\n')
            run(['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
                 '-i', str(stills), '-i', str(audio), '-t', str(duration),
                 '-vf', vf, '-af', af, '-r', '25', '-fps_mode', 'cfr', '-c:v', 'libx264', '-preset', 'veryfast',
                 '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k',
                 '-ar', '48000', '-movflags', '+faststart', str(segment)])
            segments.append(segment)
            transcript = asr[audio.name]
            words = [w for s in transcript['segments'] for w in s['words']]
            speech_start = words[0]['start'] if words else 0
            speech_end = min(speech_seconds, words[-1]['end']) if words else speech_seconds
            for caption_language in cues:
                chunks = row.get('caption_chunks', {}).get(caption_language) or caption_chunks(row[caption_language], caption_language)
                assert ''.join(''.join(chunks).split()) == ''.join(row[caption_language].split())
                caption_line = row.get('caption_line', 70)
                assert 0 <= caption_line <= 90
                total = sum(len(chunk) for chunk in chunks)
                at = start + lead + speech_start
                # Exact reviewed script, timed within independently recognized speech boundaries.
                for chunk in chunks:
                    end = at + (speech_end - speech_start) * len(chunk) / total
                    display = '\n'.join(textwrap.wrap(chunk, width=38,
                              break_long_words=False, break_on_hyphens=False)) if caption_language == 'en' else chunk
                    cues[caption_language].append(f'{stamp(at)} --> {stamp(end)} line:{caption_line}%\n{display}')
                    at = end
            timeline.append({'scene': name, 'start': round(start, 3), 'duration': duration,
                             'speech_seconds': speech_seconds,
                             'audio_sha256': hashlib.sha256(audio.read_bytes()).hexdigest(),
                             'frame_sha256': hashlib.sha256(image.read_bytes()).hexdigest(),
                             'shots': shots})
            start += duration
        concat = temporary / f'{language}.txt'
        concat.write_text('\n'.join(f"file '{path.as_posix()}'" for path in segments) + '\n')
        output = args.output_dir / f'{stem}.{language}.mp4'
        if output.exists():
            raise FileExistsError('Use a new output directory/version; do not overwrite published media')
        run(['-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(concat),
             '-c', 'copy', '-movflags', '+faststart', str(output)])
        run(['-loglevel', 'error', '-ss', '1', '-i', str(output), '-frames:v', '1',
             '-q:v', '3', str(args.output_dir / f'{stem}.{language}.jpg')])
        for caption_language, lines in cues.items():
            (args.output_dir / f'{stem}.{language}.{caption_language}.vtt').write_text(
                'WEBVTT\n\n' + '\n\n'.join(lines) + '\n')
        report['videos'][language] = {'file': output.name, 'seconds': round(start, 3),
                                      'bytes': output.stat().st_size, 'scenes': timeline}
        print(json.dumps({'language': language, 'seconds': start, 'bytes': output.stat().st_size}), flush=True)
(args.output_dir / 'render-report.json').write_text(json.dumps(report, indent=2) + '\n')
