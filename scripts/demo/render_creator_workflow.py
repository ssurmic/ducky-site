"""Offline edit of real, dated browser actions. No product/network/model access.

Screen crops and editorial callouts preserve source content. Edited motion is not
a recording of application latency. Use a new artifact directory for revisions.
"""
import argparse
import hashlib
import json
import math
import re
import subprocess
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

p = argparse.ArgumentParser()
p.add_argument('manifest', type=Path)
p.add_argument('artifacts', type=Path)
p.add_argument('--frames-only', action='store_true')
p.add_argument('--burn-captions', action='store_true')
p.add_argument('--language', choices=['zh', 'en'])
a = p.parse_args()
m = json.loads(a.manifest.read_text())
root = a.artifacts
out = root / 'render'
out.mkdir(exist_ok=True)
review = out / 'review'
review.mkdir(exist_ok=True)
W, H, FPS = 1920, 1080, 25
BG, FG, MUTED, GREEN, ORANGE = '#0a1017', '#f3f6f8', '#acb9c6', '#85e1b2', '#ffab35'
FONT = {'zh': '/System/Library/Fonts/STHeiti Medium.ttc', 'en': '/System/Library/Fonts/Supplemental/Arial.ttf'}
repo = Path(__file__).resolve().parents[2]
duck = Image.open(repo / 'public/avatar-duck-512.png').convert('RGBA')
mask = Image.new('L', duck.size)
ImageDraw.Draw(mask).ellipse((0, 0, duck.width - 1, duck.height - 1), fill=255)
duck.putalpha(mask)

def font(n, lang='en'):
    return ImageFont.truetype(FONT[lang], n)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def norm(s):
    return ''.join(c.lower() for c in s if c.isalnum())

def stamp(t):
    ms = round(t * 1000)
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d}.{ms % 1000:03d}'

def run(args):
    return subprocess.run(args, capture_output=True, text=True, check=True)

def text(draw, x, y, value, size, lang='en', color=FG):
    draw.text((x, y), value, font=font(size, lang), fill=color)

def centered(draw, y, value, size, lang='en', color=FG):
    f = font(size, lang)
    draw.text(((W - f.getlength(value)) / 2, y), value, font=f, fill=color)

def ease(t):
    return 1 - (1 - max(0, min(1, t))) ** 3

# [image stem, x, y, width, height, fraction of scene]. All crops are raw pixels.
# The checked creator point is cropped tightly so adjacent disputed points cannot
# enter a frame. Source-player crops omit unrelated recommendations/account UI.
SHOTS = {
 '01-watchlist': [[ '01-add-form', 410, 85, 1125, 480, 0], ['01-added', 410, 85, 1125, 580, .46]],
 '02-map-chart': [['02-map', 410, 365, 1125, 500, 0], ['02-price-modal-fixed', 544, 82, 640, 740, .31], ['02-chart', 410, 83, 1125, 650, .52]],
 '03-creator': [['03-creator', 427, 321, 1094, 345, 0]],
 '04-original': [['04-original', 16, 68, 1205, 670, 0]],
 '05-research': [['05-research-source', 430, 180, 518, 710, 0]],
 '06-opportunities': [['06-opportunities', 410, 82, 1125, 650, 0], ['06-index', 410, 83, 1125, 780, .46]],
 '07-filings': [['07-insider-cards', 393, 486, 1160, 227, 0], ['07-holdings-cards', 393, 450, 1160, 245, .48]],
 '08-daily': [['08-daily-events', 410, 80, 1125, 670, 0]],
}
OVERRIDES = {
 ('en', '02-map-chart'): [['02-map', 410, 365, 1125, 500, 0], ['02-price-modal-fixed', 544, 41, 640, 821, .31], ['02-chart', 410, 83, 1125, 650, .52]],
 ('en', '03-creator'): [['03-creator', 427, 439, 1094, 248, 0]],
 ('en', '04-original'): [['04-source-capture', 16, 56, 1205, 550, 0]],
 ('en', '06-opportunities'): [['06-opportunities-ready', 410, 82, 1125, 650, 0], ['06-index', 410, 83, 1125, 780, .46]],
}
proof = []
screens = {}
for lang in ['zh', 'en']:
    for s in m['scenes'][:-1]:
        shots = []
        for stem, x, y, w, h, at in OVERRIDES.get((lang, s['name']), SHOTS[s['name']]):
            path = root / 'captures' / f'{stem}.{lang}.png'
            raw = Image.open(path).convert('RGB')
            assert x >= 0 and y >= 0 and x + w <= raw.width and y + h <= raw.height, path
            shots.append((at, raw.crop((x, y, x+w, y+h))))
            proof.append({'language': lang, 'scene': s['name'], 'file': path.name,
                          'sha256': sha(path), 'crop': [x, y, w, h], 'at_fraction': at})
        screens[(lang, s['name'])] = shots

def canvas(lang, i, fraction):
    s = m['scenes'][i]
    base = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(base)
    # Quiet lines, moving progress, and one duck asset keep the video consistent.
    icon = duck.resize((62, 62), Image.Resampling.LANCZOS)
    base.paste(icon, (70, 35), icon)
    text(d, 150, 43, 'Ducky Bot', 38)
    text(d, 1718, 46, f'{i+1:02d} / 09', 28, color=MUTED)
    d.line((70, 112, 1850, 112), fill='#263543', width=2)
    if i == 8:
        for j, ticker in enumerate(['NVDA', 'AVGO', 'GOOGL', 'INTC', 'NKE', 'HOOD']):
            xx = 70 + j*298 + 22*math.sin(fraction*2.3+j)
            yy = 182 + 14*math.cos(fraction*3+j)
            d.rounded_rectangle((xx, yy, xx+230, yy+73), 28, fill='#182820', outline='#365246', width=2)
            mini = duck.resize((46, 46), Image.Resampling.LANCZOS)
            base.paste(mini, (round(xx+13), round(yy+13)), mini)
            text(d, xx+78, yy+23, ticker, 28, color=GREEN)
        big = duck.resize((150, 150), Image.Resampling.LANCZOS)
        base.paste(big, (885, 310), big)
        centered(d, 496, s['title_'+lang], 77, lang)
        centered(d, 612, 'X / Reddit · 接入进行中' if lang=='zh' else 'X / Reddit integrations in progress', 38, lang, MUTED)
        d.rounded_rectangle((704, 727, 1216, 825), 28, fill=ORANGE)
        centered(d, 749, '免费开始  →' if lang=='zh' else 'Start free  →', 44, lang, BG)
        centered(d, 847, 'duckybot.app', 35, 'en', MUTED)
        return base
    title = s['title_'+lang]
    text(d, 78, 135, title, 53 if lang=='en' else 57, lang)
    shots = screens[(lang, s['name'])]
    shot_i = max(j for j, (at, _) in enumerate(shots) if at <= fraction)
    at, screen = shots[shot_i]
    next_at = shots[shot_i+1][0] if shot_i+1 < len(shots) else 1
    local = (fraction-at)/(next_at-at)
    if i == 4:
        # Labelled editorial comparison alongside the unchanged real history card.
        panel = ImageOps.contain(screen, (550, 655), Image.Resampling.LANCZOS)
        base.paste(panel, (155, 235))
        text(d, 830, 266, '投资 TALK 君 · GOOGL' if lang=='zh' else 'TALK · GOOGL', 40, lang, MUTED)
        text(d, 830, 345, '发表后 20 个交易日' if lang=='zh' else '20 sessions after publication', 43, lang)
        text(d, 830, 418, '-1.5%', 116, 'en', '#ef8d91')
        text(d, 830, 569, '2026-06-09  $364.26', 39)
        text(d, 830, 625, '2026-07-09  $358.89', 39)
        text(d, 830, 706, '发表前已完成收盘 → 第 20 个收盘' if lang=='zh' else 'Prior completed close → 20th close', 29, lang, MUTED)
        text(d, 830, 757, '历史股价对照 · 亏损也保留' if lang=='zh' else 'Historical price comparison · losses retained', 29, lang, MUTED)
    else:
        fit = ImageOps.contain(screen, (1690, 667), Image.Resampling.LANCZOS)
        panel = Image.new('RGB', (1696, 673), '#131d27')
        px, py = (1696-fit.width)//2, (673-fit.height)//2
        panel.paste(fit, (px, py))
        # A brisk arrival and small camera drift; no data is created between cuts.
        zoom = 1 + .014*local
        bigger = panel.resize((round(1696*zoom), round(673*zoom)), Image.Resampling.BICUBIC)
        cx, cy = (bigger.width-1696)//2, (bigger.height-673)//2
        panel = bigger.crop((cx, cy, cx+1696, cy+673))
        slide = round(34*(1-ease(local*7)))
        base.paste(panel, (112+slide, 224))
        d.rounded_rectangle((111+slide, 223, 1809+slide, 898), 17, outline='#354b59', width=2)
        if i == 2:
            text(d, 124, 200, '2026-09-03 · 作者原观点' if lang=='zh' else 'September 7, 2026 · Creator’s original view', 20, lang, MUTED)
        if i == 3:
            text(d, 123, 200, '投资 TALK 君 · 2026-09-03' if lang=='zh' else 'Parkev Tatevosian, CFA · September 7, 2026', 20, lang, MUTED)
        if i == 7:
            text(d, 125, 200, '自选股日报 · 2026-09-08' if lang=='zh' else 'Watchlist event digest · September 8, 2026', 20, lang, MUTED)
    for n in range(9):
        x = 78+n*198
        d.rounded_rectangle((x, 930, x+172, 935), 2, fill='#253440')
        if n<i:d.rounded_rectangle((x,930,x+172,935),2,fill=GREEN)
        elif n==i:d.rounded_rectangle((x,930,x+max(1,172*fraction),935),2,fill=GREEN)
    return base

report = {'version': m['version'], 'capture_provenance': proof, 'videos': {},
          'editing': 'Edited actual UI actions, with editorial camera movement; no application-latency claim.',
          'audio': 'No time stretching. Two-pass loudnorm -16 LUFS / -2 dBTP; 48 kHz AAC.',
          'caption_method': 'Authored short semantic phrases, aligned to native-language provider word boundaries.'}
for lang in ([a.language] if a.language else ['zh','en']):
    timeline, chunks, total = [], [], 0.0
    for s in m['scenes']:
        name = s['name']
        path = root/'audio-revision'/f'{name}.{lang}.wav'
        if not path.exists():path=root/'audio'/f'{name}.{lang}.wav'
        with wave.open(str(path)) as wav:
            assert (wav.getnchannels(),wav.getsampwidth(),wav.getframerate()) == (1,2,24000)
            speech=wav.readframes(wav.getnframes())
            speech_seconds=wav.getnframes()/wav.getframerate()
        lead, tail = .12, .22 if name!='09-start' else .60
        seconds = math.ceil((speech_seconds+lead+tail)*FPS)/FPS
        words=[json.loads(line) for line in path.with_suffix('.words.jsonl').read_text().splitlines()]
        assert norm(''.join(w['text'] for w in words)) == norm(s[lang]),(name,lang)
        assert norm(''.join(s['caption_groups'][lang])) == norm(s[lang])
        letter_spans=[]
        for w in words:
            for c in norm(w['text']):letter_spans.append((w['offset']/1e7,(w['offset']+w['duration'])/1e7))
        captions=[]; pos=0
        for phrase in s['caption_groups'][lang]:
            n=len(norm(phrase)); start=lead+letter_spans[pos][0]; end=lead+letter_spans[pos+n-1][1]+.07
            captions.append({'text':phrase,'start':start,'end':min(end,seconds-tail+.1)})
            pos+=n
        for j in range(len(captions)-1):captions[j]['end']=min(captions[j]['end'],captions[j+1]['start'])
        assert pos==len(letter_spans)
        for c in captions:
            assert 0<=c['start']<c['end']<=seconds
            assert len(c['text'].splitlines()) <= 2
            for line in c['text'].splitlines():
                assert font(16,lang).getlength(line)<235,(lang,name,line)
        pad=round(seconds*24000)-len(speech)//2-round(lead*24000)
        assert pad>=0
        chunks.append(b'\0\0'*round(lead*24000)+speech+b'\0\0'*pad)
        timeline.append({'scene':name,'start':total,'seconds':seconds,'speech_seconds':speech_seconds,
                         'audio_file':str(path),'audio_sha256':sha(path),'captions':captions})
        total+=seconds
    raw=out/f'{lang}-voice-raw.wav'
    with wave.open(str(raw),'wb') as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(24000);wav.writeframes(b''.join(chunks))
    measure=run(['ffmpeg','-hide_banner','-i',str(raw),'-af','loudnorm=I=-16:TP=-2:LRA=7:print_format=json','-f','null','-']).stderr
    measured=json.loads(measure[measure.rfind('{'):measure.rfind('}')+1])
    loud=(f"loudnorm=I=-16:TP=-2:LRA=7:measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
          f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:offset={measured['target_offset']}:linear=true")
    voice=out/f'{lang}-voice.wav'
    run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',loud,'-ar','48000',str(voice)])
    for caption_lang in ['zh','en']:
        lines=['WEBVTT','']
        for i,row in enumerate(timeline):
            groups=m['scenes'][i]['caption_groups'][caption_lang]
            assert len(groups)==len(row['captions'])
            for phrase,c in zip(groups,row['captions']):
                lines += [stamp(row['start']+c['start'])+' --> '+stamp(row['start']+c['end'])+' line:88% position:50% size:94% align:center',phrase,'']
        (out/f'ducky-walkthrough-{m["version"]}.{lang}.{caption_lang}.vtt').write_text('\n'.join(lines).rstrip()+'\n')
    for i,row in enumerate(timeline):
        for j,at in enumerate([.10,.60,.90]):canvas(lang,i,at).save(review/f'{i+1:02d}-{j}.{lang}.jpg',quality=94)
    if a.frames_only:
        report['videos'][lang]={'seconds':total,'timeline':timeline}
        continue
    filename=f'ducky-walkthrough-{m["version"]}.{lang}{".review" if a.burn_captions else ""}.mp4'
    output=out/filename
    command=['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0',
             '-i',str(voice),'-c:v','libx264','-preset','fast','-crf','20','-threads','2','-pix_fmt','yuv420p',
             '-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart','-t',str(total),str(output)]
    process=subprocess.Popen(command,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    for i,row in enumerate(timeline):
        for n in range(round(row['seconds']*FPS)):
            t=n/FPS
            frame=canvas(lang,i,t/row['seconds'])
            if a.burn_captions:
                c=next((c for c in row['captions'] if c['start']<=t<c['end']),None)
                if c:
                    d=ImageDraw.Draw(frame);f=font(58,lang)
                    lines=c['text'].splitlines()
                    for line_i,line in enumerate(lines):
                        d.text(((W-f.getlength(line))/2,944+line_i*64),line,font=f,fill=FG)
            process.stdin.write(frame.tobytes())
        print(lang,row['scene'],row['seconds'],flush=True)
    process.stdin.close();error=process.stderr.read().decode();assert process.wait()==0,error
    poster=canvas(lang,0,.7)
    ImageDraw.Draw(poster).rounded_rectangle((637,950,1283,1042),28,fill=ORANGE)
    centered(ImageDraw.Draw(poster),969,'看看怎么用  ▶' if lang=='zh' else 'See how it works  ▶',43,lang,BG)
    poster.save(out/f'ducky-walkthrough-{m["version"]}.{lang}.jpg',quality=93)
    report['videos'][lang]={'path':str(output),'seconds':total,'sha256':sha(output),'timeline':timeline,'input_loudness':measured}
(out/('frames-report.json' if a.frames_only else 'render-report'+('-review' if a.burn_captions else '')+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
