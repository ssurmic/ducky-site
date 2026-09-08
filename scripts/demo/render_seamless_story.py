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
from functools import lru_cache
import array

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
W, H, FPS = 1920, 1080, 30
BG, FG, MUTED, GREEN, ORANGE = '#0a1017', '#f3f6f8', '#acb9c6', '#85e1b2', '#ffab35'
FONT = {'zh': '/System/Library/Fonts/STHeiti Medium.ttc', 'en': '/System/Library/Fonts/Supplemental/Arial.ttf'}
repo = Path(__file__).resolve().parents[2]
duck = Image.open(repo / 'public/avatar-duck-512.png').convert('RGBA')
mask = Image.new('L', duck.size)
ImageDraw.Draw(mask).ellipse((0, 0, duck.width - 1, duck.height - 1), fill=255)
duck.putalpha(mask)

@lru_cache(maxsize=100)
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

# Actual screen captures, reframed for one continuous route through the product.
# No UI data, prices or underlying charts are changed by this edit.
oldroot=root.parent/'creator-workflow-v1'/'captures'
proof=[]
@lru_cache(maxsize=100)
def screen(stem,lang,crop):
    path=root/'captures'/f'{stem}.{lang}.png'
    if stem=='pelosi-source':path=root/'captures'/'pelosi-source.png'
    if not path.exists():path=oldroot/f'{stem}.{lang}.png'
    raw=Image.open(path).convert('RGB');x,y,w,h=crop
    assert x>=0 and y>=0 and x+w<=raw.width and y+h<=raw.height,(path,crop)
    proof.append({'file':str(path),'sha256':sha(path),'crop':crop})
    return raw.crop((x,y,x+w,y+h))

CAPTURES={
 'zh':{
 'add':('01-add-form',(410,85,1125,480)), 'added':('01-added',(410,85,1125,580)),
 'map':('02-map',(410,365,1125,500)), 'creator':('03-creator',(427,321,1094,345)),
 'source':('04-original',(16,68,1205,670)), 'chart':('02-chart',(410,83,1125,650)),
 'pelosi':('pelosi-list',(394,270,1150,560)), 'record':('pelosi-record',(518,150,912,430)),
 'filing':('pelosi-source',(606,58,817,840)), 'daily':('daily',(413,260,1100,454)),
 'history':('daily-history',(413,265,1100,600)),
 'oversold':('06-opportunities',(410,82,1125,650)), 'alerts':('alerts',(410,80,1125,365))},
 'en':{
 'add':('01-add-form',(410,85,1125,480)), 'added':('01-added',(410,85,1125,580)),
 'map':('02-map',(410,365,1125,500)), 'creator':('03-creator',(427,439,1094,248)),
 'source':('04-source-capture',(16,56,1205,454)), 'chart':('02-chart',(410,83,1125,650)),
 'pelosi':('pelosi-list',(394,270,1150,560)), 'record':('pelosi-record',(518,150,912,430)),
 'filing':('pelosi-source',(606,58,817,840)), 'daily':('daily',(413,300,1100,454)),
 'history':('daily',(413,300,1100,454)),
 'oversold':('06-opportunities-ready',(410,82,1125,650)), 'alerts':('alerts',(410,80,1125,365))}
}
@lru_cache(maxsize=60)
def getshot(key,lang):
    stem,crop=CAPTURES[lang][key]
    return screen(stem,lang,crop)

TITLE={
 'zh':['想关注它，从这里开始','观点，点开就是原话','谁买了？直接看披露','每天，把相关信息串起来','超跌与事件，设好提醒','Robinhood · 董事真实买入','Nokia · 合作消息与价格回落','少翻消息，把时间留给自己'],
 'en':['Your stocks. Start here.','A view. One click to the source.','Who bought? Check the filing.','Your stocks. Your daily briefing.','Oversold stocks. Your alerts.','Robinhood · A director buys shares','Nokia · A partnership, then a pullback','Less scrolling. More time for you.']}
SUB={
 'zh':['自选股 → 信息导图','投资 TALK 君 · AVGO · 2026-09-03','佩洛西配偶 · INTC · 披露于 2026-08-21','AI 个股简报 · 资料检查于 2026-09-08','在已有覆盖中检查 · 历史案例回放 ↓','历史股价对照 · 2025-06-17 → 2025-07-17','历史条件回放 · 2025-11-20 → 2026-09-04','先关注一只，开始积累你的投资记录'],
 'en':['Watchlist → Information Map','Parkev Tatevosian, CFA · NVDA · September 7, 2026','Pelosi’s spouse · INTC · Filed August 21, 2026','AI stock brief · Evidence checked September 8, 2026','Within covered stocks · Historical replay below','Historical price comparison · June 17 → July 17, 2025','Historical condition replay · Nov 20, 2025 → Sep 4, 2026','Start with one stock. Build your investment history.']}
STORY={0:0,1:1,2:2,3:3,4:4,5:4,6:4,7:4}
case_data=json.loads((repo/'public/media/ducky-demo-cases-2026-09-07.json').read_text())

def pill(base,xy,label,lang='en',active=True,size=28):
    d=ImageDraw.Draw(base);x,y=xy;f=font(size,lang);ww=f.getlength(label)+38
    d.rounded_rectangle((x,y,x+ww,y+49),22,fill='#203f36' if active else '#16222d',outline='#497764' if active else '#304250',width=1)
    d.text((x+19,y+10),label,font=f,fill=GREEN if active else MUTED)
    return ww

def header(lang,i,p):
    base=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(base)
    icon=duck.resize((48,48),Image.Resampling.LANCZOS);base.paste(icon,(55,27),icon)
    text(d,116,32,'Ducky',34)
    labels=['自选','观点','披露','汇总','提醒'] if lang=='zh' else ['Stocks','Views','Filings','Briefs','Alerts']
    for j,label in enumerate(labels):
        x=916+j*176
        text(d,x,38,label,26,lang,GREEN if j==STORY[i] else '#718392')
        if j<4:d.line((x+101,53,x+147,53),fill='#344b58',width=2)
    # A single moving thread connects the story; no numbered feature slides.
    x0=916+176*STORY[i]
    d.rounded_rectangle((x0,78,x0+87,81),1,fill=GREEN)
    text(d,58,110,TITLE[lang][i],58 if lang=='en' else 64,lang)
    text(d,61,185,SUB[lang][i],29 if lang=='en' else 32,lang,MUTED)
    return base

def panel(base,key,lang,progress,box=(62,244,1796,619),zoom=.04):
    im=getshot(key,lang);x,y,w,h=box
    fit=ImageOps.contain(im,(w,h),Image.Resampling.LANCZOS)
    # Smooth camera move within an intact capture, and a rounded viewport.
    scale=1+zoom*ease(progress)
    fit=fit.resize((round(fit.width*scale),round(fit.height*scale)),Image.Resampling.BICUBIC)
    layer=Image.new('RGB',(w,h),'#101820')
    layer.paste(fit,((w-fit.width)//2,(h-fit.height)//2))
    mask=Image.new('L',(w,h));ImageDraw.Draw(mask).rounded_rectangle((0,0,w-1,h-1),22,fill=255)
    base.paste(layer,(x,y),mask)
    ImageDraw.Draw(base).rounded_rectangle((x,y,x+w,y+h),22,outline='#344752',width=2)

def sequence(base,lang,p,shots):
    n=max(i for i,s in enumerate(shots) if p>=s[0]);at,key=shots[n];end=shots[n+1][0] if n+1<len(shots) else 1
    local=(p-at)/(end-at);panel(base,key,lang,local)
    # A six-frame-style visual bridge instead of a frozen feature card.
    if n+1<len(shots) and local>.89:
        other=base.copy();panel(other,shots[n+1][1],lang,0)
        base=Image.blend(base,other,ease((local-.89)/.11))
    return base,key,local

def focus(base,x,y,p):
    d=ImageDraw.Draw(base);r=11+round(21*(p%1))
    d.ellipse((x-r,y-r,x+r,y+r),outline=ORANGE,width=3)
    d.polygon([(x,y),(x+8,y+24),(x+13,y+15),(x+24,y+12)],fill=FG)

def callout(base,label,lang,progress=1):
    d=ImageDraw.Draw(base);f=font(35,lang);ww=f.getlength(label)+70
    x=round(960-ww/2);yy=882+round(14*(1-ease(progress)))
    d.rounded_rectangle((x,yy,x+ww,yy+65),22,fill='#1b322b',outline='#51806b',width=1)
    text(d,x+35,yy+15,label,35,lang,GREEN)

def chart_case(base,lang,key,p):
    d=ImageDraw.Draw(base)
    hood=key=='hood';row=case_data['cases'][key]['after_disclosure_20' if hood else 'after_alert'];path=row['path']
    # The path is the saved full daily-close series, including every loss.
    x,y,w,h=865,425,932,321
    lo=min(q['close'] for q in path)*.90;hi=max(q['close'] for q in path)*1.055
    def point(j):return (x+j/(len(path)-1)*w,y+h-(path[j]['close']-lo)/(hi-lo)*h)
    for q in range(4):
        py=y+q*h/3;d.line((x,py,x+w,py),fill='#243947',width=1)
        text(d,800,py-13,f'{hi-q*(hi-lo)/3:.0f}',21,color=MUTED)
    count=max(2,min(len(path),round(len(path)*min(1,p/.77))))
    points=[point(j) for j in range(count)]
    d.line(points,fill=GREEN,width=5,joint='curve')
    dotx,doty=points[-1];d.ellipse((dotx-7,doty-7,dotx+7,doty+7),fill=GREEN)
    text(d,x,y+h+19,row['start'],26,color=MUTED);text(d,x+w-151,y+h+19,row['end'],26,color=MUTED)
    text(d,855,255,f"${row['base_close']:.2f}",72)
    text(d,1150,275,'→',48,color=MUTED)
    text(d,1240,255,f"${row['end_close']:.2f}",72)
    text(d,1590,270,f"+{row['return_pct']:.1f}%",48,color=GREEN)
    text(d,860,347,'收盘价对照' if lang=='zh' else 'Daily close comparison',30,lang,MUTED)
    text(d,77,264,'HOOD' if hood else 'NOK',76,color=GREEN)
    if hood:
        lines=['2025-06-13 · 董事 Payne','26,500 股 · 均价 $74.19','2025-06-17 · SEC 披露'] if lang=='zh' else ['June 13, 2025 · Director Payne','26,500 shares · $74.19 average','June 17, 2025 · SEC filing']
        note=['披露之后，再看价格怎么走','20 个交易日'] if lang=='zh' else ['What happened after the filing?','20 trading sessions']
    else:
        lines=['2025-10-28 · NVIDIA 合作','10 亿美元股权投资','示例条件：收盘价 ≤ $6'] if lang=='zh' else ['Oct 28, 2025 · NVIDIA partnership','$1 billion equity investment','Example condition: close ≤ $6']
        note=['11 月 20 日 · 首次满足条件','先回落，再追踪后续变化'] if lang=='zh' else ['Nov 20 · First condition match','Track the pullback and what follows']
    for j,line in enumerate(lines):text(d,80,391+j*56,line,33 if lang=='en' else 36,lang)
    for j,line in enumerate(note):text(d,80,608+j*56,line,30 if lang=='en' else 35,lang,MUTED)
    dd=row['max_close_drawdown_pct']
    text(d,863,806,('区间最大收盘回撤 ' if lang=='zh' else 'Maximum close drawdown ')+f'−{abs(dd):.1f}%',31,lang,'#eda0a2')
    if not hood:text(d,80,741,'公告后首 20 日：−22.0%' if lang=='zh' else 'First 20 sessions after news: −22.0%',28,lang,'#eda0a2')
    footer='历史回放 · 并非当时推送记录 · 不含分红及交易成本' if lang=='zh' else 'Historical replay · No past delivery claim · Excludes dividends and trading costs'
    callout(base,footer,lang)
    return base

def canvas(lang,i,fraction):
    p=max(0,min(1,fraction));base=header(lang,i,p)
    if i==0:
        base,key,local=sequence(base,lang,p,[(0,'add'),(.19,'added'),(.33,'map')])
        if key=='map':focus(base,959,551,local*2)
        callout(base,'你的股票，相关观点与事件' if lang=='zh' else 'Your stocks, connected to relevant views and events',lang)
    elif i==1:
        base,key,local=sequence(base,lang,p,[(0,'creator'),(.33,'source'),(.82,'chart')])
        label=('投资 TALK 君 · 原话 16:13' if lang=='zh' else 'Parkev · Original words at 9:45') if key!='chart' else ('习惯看 K 线？也在这里' if lang=='zh' else 'Prefer charts? They’re here too.')
        if key=='creator':focus(base,1576,707,local*2)
        callout(base,label,lang)
    elif i==2:
        # The actual record stays beside the official filing, preserving actor/date.
        if p<.48:
            base,key,local=sequence(base,lang,p/.48,[(0,'pelosi'),(.35,'record')])
        else:
            panel(base,'record',lang,p,box=(62,246,1050,615),zoom=0)
            panel(base,'filing',lang,p,box=(1140,246,718,615),zoom=.02)
        callout(base,'交易 → 披露 → 原始文件' if lang=='zh' else 'Trade → Disclosure → Original filing',lang)
    elif i==3:
        panel(base,'daily',lang,p,box=(65,246,1789,622),zoom=.025)
        if p>.65:focus(base,905 if lang=='en' else 806,806,p*2)
        callout(base,'每天更新 · 原始依据 · 历史简报' if lang=='zh' else 'Daily updates · Original evidence · Past briefs',lang)
    elif i==4:
        base,key,local=sequence(base,lang,p,[(0,'oversold'),(.43,'alerts')])
        callout(base,'超跌 · 价格条件 · 事件条件' if lang=='zh' else 'Oversold stocks · Price conditions · Event conditions',lang)
    elif i in (5,6):return chart_case(base,lang,'hood' if i==5 else 'nok',p)
    else:
        d=ImageDraw.Draw(base)
        # The same duck asset and stock chips move into the user's final timeline.
        labels=['NVDA','AVGO','INTC','HOOD','NOK']
        for j,label in enumerate(labels):
            x=195+j*308+round(90*(1-ease(min(1,p*3)))*(1 if j%2 else -1))
            y=295+round(18*math.sin(p*3+j))
            d.rounded_rectangle((x,y,x+230,y+91),33,fill='#192b2a',outline='#476359',width=2)
            ico=duck.resize((54,54),Image.Resampling.LANCZOS);base.paste(ico,(x+17,y+17),ico)
            text(d,x+89,y+27,label,36,color=GREEN)
        icon=duck.resize((133,133),Image.Resampling.LANCZOS);base.paste(icon,(893,459),icon)
        d.rounded_rectangle((698,660,1222,761),30,fill=ORANGE)
        centered(d,686,'免费关注一只  →' if lang=='zh' else 'Start free  →',44,lang,BG)
        centered(d,809,'duckybot.app',38,color=MUTED)
        centered(d,890,'X / Reddit · 接入进行中' if lang=='zh' else 'X / Reddit integrations in progress',30,lang,MUTED)
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
        lead, tail = 0, .12 if name!='08-start' else .90
        words=[json.loads(line) for line in path.with_suffix('.words.jsonl').read_text().splitlines()]
        # Remove provider end silence, retain the spoken tail and native timing.
        samples=array.array('h',speech)
        active=[j for j in range(0,len(samples),240) if max(map(abs,samples[j:j+240]),default=0)>90]
        end=max((words[-1]['offset']+words[-1]['duration'])/1e7+.12, ((active[-1]+240)/24000+.12) if active else 0)
        speech=speech[:min(len(speech),round(end*24000)*2)]
        speech_seconds=len(speech)/48000
        seconds=math.ceil((speech_seconds+lead+tail)*FPS)/FPS
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
            groups=m['scenes'][i].get('translation_groups',{}).get(lang,{}).get(caption_lang,m['scenes'][i]['caption_groups'][caption_lang])
            assert len(groups)==len(row['captions'])
            for j,(phrase,c) in enumerate(zip(groups,row['captions'])):
                if i==5 and caption_lang!=lang and j==3:continue
                if i==5 and caption_lang!=lang and j==2:
                    phrase=groups[2]+'\n'+groups[3];c={**c,'end':row['captions'][3]['end']}
                lines += [stamp(row['start']+c['start'])+' --> '+stamp(row['start']+c['end'])+' line:84% position:50% size:94% align:center',phrase,'']
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
            # A short continuous dissolve bridges scenes; audio remains native-speed.
            bridge=.18
            if i<len(timeline)-1 and t>row['seconds']-bridge:
                mix=(t-(row['seconds']-bridge))/bridge
                frame=Image.blend(frame,canvas(lang,i+1,0),ease(mix))
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
    poster=canvas(lang,0,.70)
    ImageDraw.Draw(poster).rounded_rectangle((637,950,1283,1042),28,fill=ORANGE)
    centered(ImageDraw.Draw(poster),969,'看看怎么用  ▶' if lang=='zh' else 'See how it works  ▶',43,lang,BG)
    poster.save(out/f'ducky-walkthrough-{m["version"]}.{lang}.jpg',quality=93)
    report['videos'][lang]={'path':str(output),'seconds':total,'sha256':sha(output),'timeline':timeline,'input_loudness':measured}
(out/('frames-report.json' if a.frames_only else 'render-report'+('-review' if a.burn_captions else '')+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
