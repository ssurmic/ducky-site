"""Prepare short native caption phrases from the selected voice's word timings.

No audio is resampled or text omitted. The other-language track follows the same
semantic phrase groups. Run with the private render artifact directory and final
voiceover manifest; only VTT files are written under public/media.
"""
from pathlib import Path
import argparse,json,re
p=argparse.ArgumentParser();p.add_argument('artifacts',type=Path);p.add_argument('manifest',type=Path);a=p.parse_args()
m=json.loads(a.manifest.read_text());r=json.loads((a.artifacts/'render/native-render-report.json').read_text())
phrases={
'zh':[
 ['盯着几只股票，','却看不过来那么多消息？'],['在信息导图里，','找到和你有关的观点。'],
 ['这位博主当时说，','继续持有英特尔。'],['原字幕里，4:09，','就是英特尔的这句话。'],
 ['想设价格提醒？','先输入价位，','再核对条件。'],['接收方式，','在这里选择和连接。'],
 ['再看看日历，','重要事件提前了解。'],['从你关注的','股票开始。']],
'en':[
 ['Following a few stocks,','but buried in updates?'],['Find relevant views','in your Information Map.'],
 ["Here, this creator says","he's holding Intel."],['His exact words','are in the transcript at 4:09.'],
 ['For a price alert,','choose a price','and review the condition.'],['Choose and connect your','email or Telegram here.'],
 ['Check the calendar','for the next events to watch.'],['Start with the stocks','you care about.']]}
def norm(s):return ''.join(c for c in s.casefold() if c.isalnum())
def clock(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
evidence={}
for voice,v in r['videos'].items():
 cues=[]
 for i,row in enumerate(v['timeline']):
  parts=phrases[voice][i]
  assert norm(''.join(parts))==norm(m['scenes'][i][voice])
  words=[json.loads(s) for s in Path(row['audio_path']).with_suffix('.words.jsonl').read_text().splitlines()]
  normalized=[norm(w['text']) for w in words]
  end=0;groups=[]
  for part in parts:
   spoken=part.replace('4:09','四分零九秒' if voice=='zh' else 'four oh nine')
   target=norm(spoken);begin=end;combined=''
   while len(combined)<len(target):combined+=normalized[end];end+=1
   assert combined==target,(voice,i,combined,target)
   groups.append((begin,end-1))
  assert end==len(words)
  for j,(begin,end) in enumerate(groups):
   start=row['start']+.16+words[begin]['offset']/1e7-.03
   last=words[end];finish=row['start']+.16+(last['offset']+last['duration'])/1e7+.22
   if j+1<len(groups):finish=min(finish,row['start']+.16+words[groups[j+1][0]]['offset']/1e7-.04)
   finish=min(finish,row['start']+row['seconds']-.05)
   assert finish>start
   cues.append({'scene':row['scene'],'phrase':j,'start':start,'end':finish,'text':{lang:phrases[lang][i][j] for lang in ['zh','en']}})
 for lang in ['zh','en']:
  lines=['WEBVTT','']
  for n,c in enumerate(cues):
   assert len(c['text'][lang])<=(15 if lang=='zh' else 30)
   lines.extend([str(n+1),f"{clock(c['start'])} --> {clock(c['end'])} line:60% position:50% size:90% align:center",c['text'][lang],''])
  dest=Path('public/media')/f'ducky-intc-tutorial-2026-09-08-v2.{voice}.{lang}.vtt';dest.write_text('\n'.join(lines).rstrip()+'\n')
 evidence[voice]=cues
Path('scripts/demo/evidence/intc-v2/phrase-timings.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
print('Prepared 17 single-line phrases per voice, two caption languages; verified full text and word boundaries.')
