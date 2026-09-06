#!/usr/bin/env python3
"""Read-only media gate using ffprobe and Python's standard library.

python3 verify_media.py MANIFEST AUDIO_DIR OUTPUT_DIR [--frames-dir DIR]

Checks expected bilingual scene audio/ASR, render-report hashes and timelines,
H.264/AAC MP4 delivery, and complete nonoverlapping bilingual WebVTT scripts.
ASR mismatch is a review warning, never a voice-quality grade.
"""
from __future__ import annotations

import argparse
import array
import difflib
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys
import wave

LANGUAGES = ('zh', 'en')
SHA = re.compile(r'^[a-f0-9]{64}$')
STAMP = r'(?:\d{2,}:)?\d{2}:\d{2}\.\d{3}'
TIMING = re.compile(r'^(' + STAMP + r')\s+-->\s+(' + STAMP + r')(?:\s+.*)?$')


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def compact(text):
    return re.sub(r'\s+', '', text)


def asr_text(text):
    return ''.join(c.casefold() for c in text if c.isalnum())


def seconds(stamp):
    parts = stamp.split(':')
    if len(parts) == 2:
        parts.insert(0, '0')
    hours, minutes, remainder = int(parts[0]), int(parts[1]), float(parts[2])
    if minutes >= 60 or remainder >= 60:
        raise ValueError('Invalid WebVTT clock field')
    return hours * 3600 + minutes * 60 + remainder


def read_vtt(path):
    text = path.read_text(encoding='utf-8-sig').replace('\r\n', '\n')
    blocks = re.split(r'\n\s*\n', text.strip())
    if not blocks or not blocks[0].startswith('WEBVTT'):
        raise ValueError('Missing WEBVTT header')
    cues = []
    for block in blocks[1:]:
        lines = block.splitlines()
        if lines[0].startswith(('NOTE', 'STYLE', 'REGION')):
            continue
        position = 0 if '-->' in lines[0] else 1
        if position >= len(lines):
            raise ValueError('Cue has no timing')
        match = TIMING.fullmatch(lines[position])
        if not match or not lines[position + 1:]:
            raise ValueError('Invalid or empty WebVTT cue')
        cues.append((seconds(match[1]), seconds(match[2]), '\n'.join(lines[position + 1:])))
    if not cues:
        raise ValueError('No WebVTT cues')
    return cues


def mp4_atoms(path):
    atoms, length = [], path.stat().st_size
    with path.open('rb') as handle:
        while handle.tell() < length:
            start = handle.tell()
            header = handle.read(8)
            if len(header) != 8:
                raise ValueError('Truncated MP4 atom header')
            size, kind = struct.unpack('>I4s', header)
            minimum = 8
            if size == 1:
                large = handle.read(8)
                if len(large) != 8:
                    raise ValueError('Truncated extended MP4 atom')
                size, minimum = struct.unpack('>Q', large)[0], 16
            elif size == 0:
                size = length - start
            if size < minimum or start + size > length:
                raise ValueError('Invalid MP4 atom size')
            atoms.append((kind.decode('ascii', errors='replace'), start))
            handle.seek(start + size)
    return atoms


class Audit:
    def __init__(self):
        self.failures, self.warnings, self.checks, self.assets = [], [], 0, {}

    def check(self, condition, message):
        self.checks += 1
        if not condition:
            self.failures.append(message)
        return bool(condition)

    def warning(self, message):
        self.warnings.append(message)

    def file(self, path):
        if not self.check(path.is_file(), 'Missing asset: ' + str(path)):
            return False
        self.assets[str(path)] = {'bytes': path.stat().st_size, 'sha256': digest(path)}
        return True

    def guarded(self, label, operation):
        try:
            return operation()
        except (OSError, ValueError, KeyError, TypeError, IndexError, ZeroDivisionError,
                subprocess.SubprocessError, wave.Error) as error:
            self.failures.append(f'{label}: {type(error).__name__}: {error}')
            return None


def probe(ffprobe, path):
    result = subprocess.run([ffprobe, '-v', 'error', '-show_streams', '-show_format',
                             '-of', 'json', str(path)], check=True, capture_output=True,
                            text=True, timeout=30)
    return json.loads(result.stdout)


def verify_audio(audit, path, row, script):
    with wave.open(str(path)) as handle:
        duration = handle.getnframes() / handle.getframerate()
        audit.check(handle.getnchannels() == 1, f'{path.name}: expected mono WAV')
        audit.check(handle.getframerate() == 24000, f'{path.name}: expected 24 kHz source')
        audit.check(handle.getsampwidth() == 2, f'{path.name}: expected 16-bit PCM')
        audit.check(1 < duration < 40, f'{path.name}: unexpected source duration {duration}')
        samples = array.array('h', handle.readframes(handle.getnframes()))
    if sys.byteorder != 'little':
        samples.byteswap()
    peak = max(abs(v) for v in samples) / 32768 if samples else 0
    rms = math.sqrt(sum(v * v for v in samples) / len(samples)) / 32768 if samples else 0
    audit.check(rms >= .005, f'{path.name}: silence or near-silence ({rms:.5f} RMS)')
    if peak >= 32767 / 32768:
        audit.warning(f'{path.name}: full-scale PCM sample; inspect for clipping')
    audit.check(finite(row.get('duration')) and abs(row['duration'] - duration) <= .12,
                f'{path.name}: ASR duration differs from source WAV')
    audit.check(bool(row.get('text', '').strip()), f'{path.name}: empty independent ASR text')
    previous = 0.0
    words = 0
    for segment in row.get('segments', []):
        start, end = segment['start'], segment['end']
        audit.check(finite(start) and finite(end) and 0 <= start <= end <= duration + .15,
                    f'{path.name}: invalid ASR segment bounds')
        audit.check(start >= previous - .05, f'{path.name}: overlapping ASR segments')
        previous = end
        prior_word = start
        for word in segment.get('words', []):
            first, last = word['start'], word['end']
            audit.check(finite(first) and finite(last) and start - .1 <= first <= last <= end + .1,
                        f'{path.name}: invalid ASR word bounds')
            audit.check(first >= prior_word - .05, f'{path.name}: overlapping ASR words')
            prior_word = last
            words += 1
    audit.check(words > 0, f'{path.name}: word timestamps missing')
    expected, recognized = asr_text(script), asr_text(row.get('text', ''))
    similarity = difflib.SequenceMatcher(None, expected, recognized, autojunk=False).ratio()
    if expected != recognized:
        audit.warning(f'{path.name}: ASR differs from script (similarity {similarity:.3f}); review pronunciation/content, not an automatic rejection')
    return {'duration': duration, 'peak_pcm': peak, 'rms_pcm': rms,
            'asr_similarity': round(similarity, 4), 'asr_words': words}


def verify_video(audit, ffprobe, language, video, manifest, frames, audio_dir, output_dir, audio):
    filename = video['file']
    if not audit.check(Path(filename).name == filename, f'{language}: video filename must be local basename'):
        return
    path = output_dir / filename
    if not audit.file(path):
        return
    doc = probe(ffprobe, path)
    streams = doc['streams']
    visuals = [s for s in streams if s.get('codec_type') == 'video']
    voices = [s for s in streams if s.get('codec_type') == 'audio']
    audit.check(len(visuals) == 1 and len(voices) == 1, f'{filename}: expected exactly one video and one audio stream')
    duration = float(doc['format']['duration'])
    audit.check(0 < duration < 600, f'{filename}: unreasonable duration')
    audit.check(abs(duration - video['seconds']) <= .15, f'{filename}: MP4 and report durations differ')
    audit.check(video['bytes'] == path.stat().st_size, f'{filename}: report file size mismatch')
    if visuals:
        v = visuals[0]
        audit.check((v.get('codec_name'), v.get('width'), v.get('height'), v.get('pix_fmt')) ==
                    ('h264', 1920, 1080, 'yuv420p'), f'{filename}: unexpected video delivery format')
        numerator, denominator = map(int, v['avg_frame_rate'].split('/'))
        audit.check(abs(numerator / denominator - 25) < .02, f'{filename}: expected 25 fps')
    if voices:
        a = voices[0]
        audit.check(a.get('codec_name') == 'aac' and int(a.get('sample_rate', 0)) == 48000,
                    f'{filename}: expected AAC / 48 kHz')
        audit.check(abs(float(a.get('duration', duration)) - duration) <= .2,
                    f'{filename}: audio stream does not cover video duration')
    if visuals and voices:
        audit.check(abs(float(visuals[0].get('duration', duration)) -
                        float(voices[0].get('duration', duration))) <= .2,
                    f'{filename}: audio/video duration mismatch')
    atoms = dict(mp4_atoms(path))
    audit.check('moov' in atoms and 'mdat' in atoms and atoms['moov'] < atoms['mdat'],
                f'{filename}: missing fast-start MP4 layout')
    poster = path.with_suffix('.jpg')
    if audit.file(poster):
        with poster.open('rb') as handle:
            audit.check(handle.read(2) == b'\xff\xd8', f'{poster.name}: invalid JPEG header')

    timeline = video['scenes']
    audit.check([r['scene'] for r in timeline] == [r['name'] for r in manifest['scenes']],
                f'{filename}: report does not cover manifest scenes in order')
    expected_start = 0.0
    for reported, scene in zip(timeline, manifest['scenes']):
        name = scene['name']
        audit.check(finite(reported['start']) and abs(reported['start'] - expected_start) <= .002,
                    f'{filename}/{name}: noncontiguous timeline')
        audit.check(finite(reported['duration']) and reported['duration'] > 0,
                    f'{filename}/{name}: invalid scene duration')
        expected_start += reported['duration']
        wav = audio_dir / f'{name}.{language}.wav'
        frame = frames / language / f'{name}.png'
        for field, asset in [('audio_sha256', wav), ('frame_sha256', frame)]:
            if audit.file(asset):
                audit.check(bool(SHA.fullmatch(reported.get(field, ''))) and digest(asset) == reported[field],
                            f'{filename}/{name}: {field} mismatch')
        measured = audio.get(wav.name)
        if measured:
            audit.check(abs(reported['speech_seconds'] - measured['duration']) < .05,
                        f'{filename}/{name}: reported speech duration mismatch')
            audit.check(reported['duration'] >= measured['duration'] + .58,
                        f'{filename}/{name}: scene truncates speech or its intended padding')
        expected_shots = scene.get('shots', {}).get(language, [{'file': f'{name}.png', 'at': 0}])
        shots = reported.get('shots', [])
        audit.check(shots == expected_shots, f'{filename}/{name}: shots differ from manifest')
        audit.check(bool(shots) and shots[0]['at'] == 0, f'{filename}/{name}: first shot must start at 0')
        previous = -1.0
        for shot in shots:
            at, shotname = shot['at'], shot['file']
            audit.check(finite(at) and previous < at < 1, f'{filename}/{name}: invalid shot order or fraction')
            previous = at
            asset = (frames / language / shotname).resolve()
            if audit.check(asset.is_relative_to(frames.resolve()), f'{filename}/{name}: shot escapes frames directory'):
                audit.file(asset)
    audit.check(abs(expected_start - video['seconds']) < .003, f'{filename}: report timeline total mismatch')

    for caption_language in LANGUAGES:
        caption = path.with_suffix(f'.{caption_language}.vtt')
        if not audit.file(caption):
            continue
        cues = read_vtt(caption)
        previous = 0.0
        for index, (start, end, text) in enumerate(cues, 1):
            audit.check(0 <= start < end <= duration + .02, f'{caption.name}: cue {index} outside video bounds')
            audit.check(start >= previous, f'{caption.name}: cue {index} overlaps previous cue')
            previous = end
        expected = ''.join(scene[caption_language] for scene in manifest['scenes'])
        actual = ''.join(cue[2] for cue in cues)
        audit.check(compact(actual) == compact(expected), f'{caption.name}: captions do not cover the exact complete manifest script (ignoring whitespace only)')
        assigned = 0
        for rendered, scene in zip(timeline, manifest['scenes']):
            first = rendered['start']
            last = first + rendered['duration']
            within = [cue for cue in cues if cue[0] >= first - .002 and cue[1] <= last + .002]
            assigned += len(within)
            audit.check(compact(''.join(cue[2] for cue in within)) == compact(scene[caption_language]),
                        f'{caption.name}/{scene["name"]}: script captions do not match this scene window')
        audit.check(assigned == len(cues), f'{caption.name}: cue crosses a scene boundary')
        print(f'CHECK {caption.name}: {len(cues)} cues, final end {previous:.3f}s')
    print(f'CHECK {filename}: {duration:.3f}s, {path.stat().st_size:,} bytes, {len(timeline)} scenes')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('audio_dir', type=Path)
    parser.add_argument('output_dir', type=Path)
    parser.add_argument('--frames-dir', type=Path)
    parser.add_argument('--ffprobe', default=shutil.which('ffprobe') or 'ffprobe')
    parser.add_argument('--report', type=Path, help='Override OUTPUT_DIR/render-report.json')
    parser.add_argument('--json-out', type=Path, help='Optional new verification artifact (never overwritten)')
    parser.add_argument('--language', choices=LANGUAGES, help='Check only this voice; still require both caption languages')
    args = parser.parse_args()
    languages = (args.language,) if args.language else LANGUAGES
    expected_count = 0
    audit = Audit()
    frames = args.frames_dir or args.manifest.parent / 'frames'
    manifest = audit.guarded('manifest', lambda: json.loads(args.manifest.read_text()))
    audio, speech = {}, {}
    if manifest and audit.file(args.manifest):
        scenes = manifest.get('scenes', [])
        audit.check(1 <= len(scenes) <= 20, 'Expected one to twenty manifest scenes')
        names = [scene['name'] for scene in scenes]
        audit.check(len(set(names)) == len(names), 'Duplicate manifest scene names')
        audit.check(all(re.fullmatch(r'[a-zA-Z0-9_-]+', name) for name in names), 'Unsafe scene basename')
        expected = {f'{name}.{lang}.wav' for name in names for lang in languages}
        expected_count = len(expected)
        asr_path = args.audio_dir / 'speech-check.json'
        if audit.file(asr_path):
            rows = audit.guarded('speech-check', lambda: json.loads(asr_path.read_text()))
            audit.check(isinstance(rows, list), 'speech-check must be a JSON array')
            if isinstance(rows, list):
                filenames = [row.get('file') for row in rows]
                audit.check(len(rows) == expected_count and len(set(filenames)) == expected_count, 'speech-check must contain each selected segment exactly once')
                audit.check(set(filenames) == expected, 'speech-check segment names do not match the selected manifest voices')
                speech = {row['file']: row for row in rows}
        for scene in scenes:
            for lang in languages:
                name = f"{scene['name']}.{lang}.wav"
                path = args.audio_dir / name
                exists = audit.file(path)
                script = scene.get(lang, '')
                audit.check(isinstance(script, str) and bool(script.strip()), f'{name}: missing manifest narration')
                if name in speech and exists:
                    row = speech[name]
                    audit.check(row.get('language') == lang, f'{name}: wrong ASR language')
                    result = audit.guarded(name, lambda p=path, r=row, s=script: verify_audio(audit, p, r, s))
                    if result:
                        audio[name] = result
                        print(f"CHECK {name}: {result['duration']:.3f}s, ASR similarity {result['asr_similarity']:.3f}")
        audit.check(len(audio) == expected_count, 'Every selected ASR/WAV segment must be checked')
        report_path = args.report or args.output_dir / 'render-report.json'
        if audit.file(report_path):
            report = audit.guarded('render-report', lambda: json.loads(report_path.read_text()))
            if report:
                audit.check(report.get('version') == manifest.get('version'), 'Render report version differs from manifest')
                audit.check(set(report.get('videos', {})) == set(languages), 'Render report must cover exactly the selected voices')
                for lang in languages:
                    if lang in report.get('videos', {}):
                        maximum = manifest.get('delivery', {}).get('maximum_seconds')
                        if maximum is not None:
                            audit.check(finite(maximum) and 0 < maximum and report['videos'][lang].get('seconds', float('inf')) <= maximum,
                                        f'{lang}: video exceeds the manifest duration limit')
                        audit.guarded(lang + ' media', lambda language=lang: verify_video(
                            audit, args.ffprobe, language, report['videos'][language], manifest,
                            frames, args.audio_dir, args.output_dir, audio))
        for path, recorded in list(audit.assets.items()):
            audit.check(digest(Path(path)) == recorded['sha256'], 'Asset changed during verification: ' + path)
    for warning in audit.warnings:
        print('REVIEW ' + warning)
    for failure in audit.failures:
        print('FAIL ' + failure)
    status = 'FAIL' if audit.failures else 'PASS'
    print(f'{status}: {audit.checks} checks; {len(audit.failures)} failures; {len(audit.warnings)} review notes; {len(audio)}/{expected_count} ASR/WAV segments checked.')
    print('This gate checks technical/content integrity. It does not certify naturalness or replace listening.')
    if args.json_out:
        result = {'status': status, 'checks': audit.checks, 'failures': audit.failures,
                  'review_notes': audit.warnings, 'audio': audio, 'assets': audit.assets}
        with args.json_out.open('x') as handle:
            json.dump(result, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
    return 1 if audit.failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
