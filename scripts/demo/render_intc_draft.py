"""Local editorial cut from dated real UI captures; no product or model access.

Run with the bundled Pillow runtime. Inputs are immutable screenshots, generated
WAVs and provider word timings. The output is a review draft, never auto-published.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import wave

from PIL import Image, ImageDraw, ImageFont, ImageOps

P = argparse.ArgumentParser()
P.add_argument('manifest', type=Path)
P.add_argument('artifacts', type=Path)
P.add_argument('--frames-only', action='store_true')
P.add_argument('--native-captions', action='store_true', help='Make a web edition with separate native captions')
A = P.parse_args()
M = json.loads(A.manifest.read_text())
ROOT = A.artifacts
OUT = ROOT / 'render'
OUT.mkdir(exist_ok=True)
FRAMES = ROOT / 'frames'
FRAMES.mkdir(exist_ok=True)
W, H, FPS = 1920, 1080, 25
BG, FG, MUTED, ACCENT = '#090e15', '#f3f5f7', '#a8b7c6', '#ffab2e'
FONT_ZH = '/System/Library/Fonts/STHeiti Medium.ttc'
FONT_EN = '/System/Library/Fonts/Supplemental/Arial.ttf'
BRAND = Path(__file__).resolve().parents[2] / 'public/avatar-duck-512.png'
DUCK = Image.open(BRAND).convert('RGBA')
duck_mask = Image.new('L',DUCK.size,0)
ImageDraw.Draw(duck_mask).ellipse((0,0,DUCK.width-1,DUCK.height-1),fill=255)
DUCK.putalpha(duck_mask)

def font(size, lang='zh'):
    return ImageFont.truetype(FONT_ZH if lang == 'zh' else FONT_EN, size)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)

def wrap(text, f, max_width, lang):
    tokens = list(text) if lang == 'zh' else text.split(' ')
    join = '' if lang == 'zh' else ' '
    lines, line = [], ''
    for token in tokens:
        candidate = (line + join + token) if line else token
        if f.getlength(candidate) > max_width and line:
            lines.append(line)
            line = token
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines

def text_lines(draw, xy, lines, f, fill=FG, gap=12):
    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=f, fill=fill)
        y += f.size + gap

LABELS = {
 'zh': [
  ['盯着几只股票，', '消息却看不完？'], ['打开 INTC', '信息导图'],
  ['他说，', '继续持有英特尔'], ['找到原话，', '回到这一刻'],
  ['把关注点', '写成提醒条件'], ['选择你的', '接收方式'],
  ['重要事件，', '提前留意'], ['从你关注的', '股票开始。']],
 'en': [
  ['Your stocks.', 'So many updates.'], ['Explore Intel’s', 'Information Map.'],
  ['He said he was', 'holding Intel.'], ['Go straight', 'to the original.'],
  ['Your condition.', 'Your alert.'], ['Choose how', 'to stay updated.'],
  ['Know what’s', 'coming next.'], ['Start with the stocks', 'you care about.']]}
DETAILS = {
 'zh': [
  ['从自选名单开始'], ['公司披露 · 博主观点'],
  ['投资 TALK 君', '2026-08-24 · 作者自述持有'],
  ['投资 TALK 君 · 04:06', '原视频保留当时上下文'],
  ['填写条件示例', '尚未核对、启用'],
  ['邮箱可用 · Telegram 待关联', '此处展示设置，未发送通知'],
  ['财报 · 宏观数据 · 交易安排'], ['duckybot.app']],
 'en': [
  ['Start with your watchlist'], ['Company filings · Creator views'],
  ['TALK · August 24, 2026', 'A self-reported holding at the time'],
  ['TALK · 04:06', 'See the original context'],
  ['Example condition', 'Not reviewed or enabled'],
  ['Email ready · Telegram not linked', 'Settings shown; no message sent'],
  ['Earnings · Economic releases', 'Market sessions'], ['duckybot.app']]}

# Pixel crops of unmodified browser screenshots, inspected before rendering.
# Profile crops exclude account identity fields above the delivery controls.
CROPS = {
 '01-overload': {'zh': (840, 85, 1120, 850), 'en': (840, 85, 1120, 850)},
 '02-map': {'zh': (845, 365, 1100, 650), 'en': (845, 380, 1100, 690)},
 '03-creator': {'zh': (855, 148, 1100, 370), 'en': (855, 525, 1100, 370)},
 '04-source': {'zh': (16, 68, 1205, 680), 'en': (16, 68, 1205, 680)},
 '05-alert': {'zh': (925, 95, 965, 470), 'en': (925, 95, 965, 490)},
 '06-channels': {'zh': (930, 630, 940, 300), 'en': (930, 630, 940, 315)},
 '07-calendar': {'zh': (845, 85, 1120, 700), 'en': (845, 85, 1120, 700)},
}

records = []
cached_frames = {}
for lang in M['render_languages']:
    for i, scene in enumerate(M['scenes']):
        name = scene['name']
        editorial = M.get('editorial_overrides',{}).get(name,{}).get(lang,{})
        labels = editorial.get('labels',LABELS[lang][i])
        details = editorial.get('details',DETAILS[lang][i])
        base = Image.new('RGB', (W, H), BG)
        draw = ImageDraw.Draw(base)
        base.paste(DUCK.resize((76, 76)), (82, 36), DUCK.resize((76, 76)))
        draw.text((180, 49), 'Ducky', font=font(48, 'en'), fill=FG)
        badge = M.get('review_label',{}).get(lang,'实景草稿' if lang == 'zh' else 'Preview cut')
        draw.text((1838-font(29,lang).getlength(badge), 65), badge, font=font(29, lang), fill=MUTED)
        draw.line((82, 131, 1838, 131), fill='#23313f', width=2)
        source = None
        if i == 7:
            icon = DUCK.resize((210, 210))
            base.paste(icon, (855, 210), icon)
            for n, line in enumerate(LABELS[lang][i]):
                f = font(86, lang)
                draw.text(((W-f.getlength(line))/2, 460+n*108), line, font=f, fill=FG)
            draw.rounded_rectangle((734, 717, 1186, 815), 32, fill=ACCENT)
            label = '免费开始  →' if lang == 'zh' else 'Start free  →'
            f = font(43, lang)
            draw.text(((W-f.getlength(label))/2, 740), label, font=f, fill=BG)
            draw.text((805, 840), 'duckybot.app', font=font(43, 'en'), fill=MUTED)
        else:
            draw.text((96, 198), f'{i+1:02d} / 08', font=font(30, 'en'), fill=ACCENT)
            text_lines(draw, (96, 292), labels, font(59 if lang=='zh' else 55,lang), gap=23)
            text_lines(draw, (100, 516), details, font(27 if lang=='en' else 29,lang), MUTED, gap=20)
            capture = M.get('capture_files',{}).get(name,{}).get(lang)
            source = ROOT/'captures'/(capture or ('04-source-ready.zh.png' if i == 3 else name+'.'+lang+'.png'))
            image = Image.open(source).convert('RGB')
            crop_box = M.get('capture_crops',{}).get(name,{}).get(lang,CROPS[name][lang])
            x, y, width, height = crop_box
            assert x+width <= image.width and y+height <= image.height
            crop = image.crop((x, y, x+width, y+height))
            crop_path = FRAMES/(name+'.'+lang+'.crop.png')
            crop.save(crop_path)
            card = Image.new('RGB', (1210, 655), '#121a24')
            quote = M.get('source_quote',{})
            if quote.get('scene') == name:
                cd = ImageDraw.Draw(card)
                header = '原视频字幕摘录 · ' if lang=='zh' else 'Original Chinese captions · '
                cd.text((44,28),header+quote['timestamp'],font=font(34,lang),fill=ACCENT)
                text_lines(cd,(44,102),quote['display_lines'],font(67,'zh'),FG,gap=16)
                if lang=='en':
                    cd.text((45,284),quote['translation'],font=font(38,'en'),fill=MUTED)
                cd.line((42,354,1167,354),fill='#344b5d',width=2)
                cd.text((44,378),'产品中的原文摘录' if lang=='zh' else 'Source excerpt in Ducky',font=font(29,lang),fill=MUTED)
                fit=ImageOps.contain(crop,(1120,180),Image.Resampling.LANCZOS)
                card.paste(fit,((1210-fit.width)//2,432))
            else:
                fit = ImageOps.contain(crop, (1180, 625), Image.Resampling.LANCZOS)
                card.paste(fit, ((1210-fit.width)//2, (655-fit.height)//2))
            base.paste(card, (630, 185))
            draw.rounded_rectangle((629,184,1841,841), 18, outline='#364b5c', width=2)
            if i in (2,3) or editorial.get('footer'):
                label = editorial.get('footer') or ('历史原话 · 8月24日发表 / 9月6日收录' if lang=='zh' else 'Historical source · published Aug 24 / recorded Sep 6')
                draw.text((635, 857), label, font=font(26,lang), fill=MUTED)
            for n in range(8):
                draw.rounded_rectangle((100+n*50, 815, 132+n*50, 822), 3, fill=ACCENT if n<=i else '#34414f')
        cached_frames[(lang,i)] = base
        base.save(FRAMES/(name+'.'+lang+'.png'))
        records.append({'scene':name,'language':lang,'raw_capture':str(source) if source else None,
            'raw_sha256':digest(source) if source else None,'crop':crop_box if source else None,
            'frame_sha256':digest(FRAMES/(name+'.'+lang+'.png'))})

# Also retain a larger per-language review sheet.
for lang in ['zh','en']:
    sheet = Image.new('RGB',(1920,2160),BG)
    for i in range(8):
        sheet.paste(cached_frames[(lang,i)].resize((960,540)),((i%2)*960,(i//2)*540))
    sheet.save(OUT/('contact-'+lang+'.jpg'),quality=92)
(OUT/'frame-provenance.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
if A.frames_only:
    raise SystemExit(0)

render_report = {'version':M['version'],'kind':'edited_real_UI_capture_review_draft','fps':FPS,'videos':{},
    'not_continuous_screen_recording':True,'dgx_used':False,'notifications_sent':False,
    'audio_processing':'Whole-track two-pass loudnorm -16 LUFS / -2 dBTP; original speech speed and pitch',
    'caption_processing':'Full sentence cues bounded by original provider first/last word; separate native tracks' + ('' if A.native_captions else '; primary captions also burned in'),
    'listening_acceptance':'not certified; review draft'}

def vtt_time(sec):
    ms = round(sec*1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'

for lang in M['render_languages']:
    chunks, timeline, start = [], [], 0.0
    for i, scene in enumerate(M['scenes']):
        stem = scene['name']+'.'+lang
        source_dir = next(folder for folder in [ROOT/'audio-v2-alert-refinement',ROOT/'audio-v2-changes',ROOT/'audio-revision',ROOT/'audio'] if (folder/(stem+'.wav')).exists())
        path = source_dir/(stem+'.wav')
        with wave.open(str(path)) as wav:
            assert wav.getnchannels()==1 and wav.getsampwidth()==2 and wav.getframerate()==24000
            speech_seconds = wav.getnframes()/24000
            audio = wav.readframes(wav.getnframes())
        seconds = math.ceil(max(scene['minimum_seconds'], speech_seconds+0.32)*FPS)/FPS
        words = [json.loads(line) for line in (source_dir/(stem+'.words.jsonl')).read_text().splitlines()]
        cue_start = max(0.12, 0.16+words[0]['offset']/1e7-0.03)
        cue_end = min(seconds-0.05, 0.16+(words[-1]['offset']+words[-1]['duration'])/1e7+0.22)
        assert 0<=cue_start<cue_end<=seconds
        lead = int(.16*24000)
        total = round(seconds*24000)
        chunks.append(b'\0\0'*lead+audio+b'\0\0'*(total-lead-len(audio)//2))
        timeline.append({'scene':scene['name'],'start':start,'seconds':seconds,'speech_seconds':speech_seconds,
            'audio_path':str(path),'audio_sha256':digest(path),'cue_start':start+cue_start,'cue_end':start+cue_end})
        start += seconds
    raw = OUT/(lang+'-raw.wav')
    with wave.open(str(raw),'wb') as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(24000);wav.writeframes(b''.join(chunks))
    measure = run(['ffmpeg','-hide_banner','-i',str(raw),'-af','loudnorm=I=-16:TP=-2:LRA=7:print_format=json','-f','null','-']).stderr
    loud = json.loads(measure[measure.rfind('{'):measure.rfind('}')+1])
    norm = (f"loudnorm=I=-16:TP=-2:LRA=7:measured_I={loud['input_i']}:measured_TP={loud['input_tp']}:"
            f"measured_LRA={loud['input_lra']}:measured_thresh={loud['input_thresh']}:offset={loud['target_offset']}:linear=true")
    final_audio = OUT/(lang+'-voice.wav')
    run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',norm,'-ar','48000',str(final_audio)])
    for subtitle_lang in ['zh','en']:
        cues = ['WEBVTT','']
        for i,row in enumerate(timeline):
            lines = wrap(M['scenes'][i][subtitle_lang],font(M.get('caption_font_size',74),subtitle_lang),1720,subtitle_lang)
            assert len(lines)<=2,(subtitle_lang,i,lines)
            cues += [str(i+1),vtt_time(row['cue_start'])+' --> '+vtt_time(row['cue_end']),*lines,'']
        (OUT/f'ducky-intc-draft.{lang}.{subtitle_lang}.vtt').write_text('\n'.join(cues)+'\n')
    output = OUT/f'ducky-intc-{"tutorial" if A.native_captions else "draft"}.{lang}.mp4'
    command = ['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}',
        '-r',str(FPS),'-i','pipe:0','-i',str(final_audio),'-c:v','libx264','-preset','fast','-crf','20',
        '-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ar','48000',
        '-movflags','+faststart','-t',str(start),str(output)]
    process = subprocess.Popen(command,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    for i,row in enumerate(timeline):
        base = cached_frames[(lang,i)]
        f = font(M.get('caption_font_size',74),lang)
        lines = wrap(M['scenes'][i][lang],f,1740,lang)
        assert len(lines)<=2
        for frame_i in range(round(row['seconds']*FPS)):
            t = frame_i/FPS
            frame = base.copy()
            # Editorial camera movement in the screenshot area; never invent UI states.
            if i!=7:
                panel = base.crop((630,185,1840,840))
                zoom = 1.0+0.012*(t/row['seconds'])
                panel = panel.resize((round(1210*zoom),round(655*zoom)),Image.Resampling.BICUBIC)
                px,py=(panel.width-1210)//2,(panel.height-655)//2
                frame.paste(panel.crop((px,py,px+1210,py+655)),(630,185))
            d = ImageDraw.Draw(frame)
            if not A.native_captions and row['cue_start']-row['start']<=t<=row['cue_end']-row['start']:
                d.rectangle((0,910,W,H),fill=BG)
                bounds=[f.getbbox(line) for line in lines]
                total_height=sum(b[3]-b[1] for b in bounds)+10*(len(lines)-1)
                y=910+(H-910-total_height)//2
                for n,line in enumerate(lines):
                    d.text(((W-f.getlength(line))/2,y-bounds[n][1]),line,font=f,fill=FG)
                    y+=bounds[n][3]-bounds[n][1]+10
            process.stdin.write(frame.tobytes())
        print(lang,row['scene'],row['seconds'],flush=True)
    process.stdin.close()
    error = process.stderr.read().decode()
    assert process.wait()==0,error
    render_report['videos'][lang]={'path':str(output),'seconds_without_aac_padding':start,
        'sha256':digest(output),'timeline':timeline,'loudness_input':loud}
    (OUT/('native-render-report.json' if A.native_captions else 'render-report.json')).write_text(json.dumps(render_report,ensure_ascii=False,indent=2)+'\n')
