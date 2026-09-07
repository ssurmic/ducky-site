#!/usr/bin/env python3
"""Render an evidence-bound GLW storyboard insert; never alter source or live media.

Standard-library SVG generation. Review PNGs are captured from the rendered SVG.
RSI is the existing repository Wilder calculation, run on each price prefix.
"""
import base64
import csv
import hashlib
import html
import json
import math
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent
SITE = OUT.parents[1]
BOT = SITE.parent / 'ducky-bot'
sys.path.insert(0, str(BOT / 'bin'))
from technicals import rsi

INPUT = SITE / 'scripts/demo/evidence/voice-v9/market-inputs/GLW.json'
CASE = SITE / 'scripts/demo/evidence/voice-v9/case.json'
PUBLIC = SITE / 'public/media/ducky-demo-cases-2026-09-07.json'
source = json.loads(INPUT.read_text())
case = json.loads(CASE.read_text())
public = json.loads(PUBLIC.read_text())
glw = public['cases']['glw']
path = glw['whole_path']['path']
rows = source['rows']
assert len(rows) == 339 and len(path) == 85
assert [r['d'] for r in rows] == sorted(set(r['d'] for r in rows))
assert case['delivery_evidence']['historical_notifications_verified'] is False
assert case['glw']['traditional_warrant_exercise_price'] == 180
assert [r['d'] for r in path] == [r['d'] for r in rows if '2026-05-06' <= r['d'] <= '2026-09-04']
raw = {r['d']: r for r in rows}
rsi_by_day = {r['d']: rsi([x['Close'] for x in rows[:i + 1]]) for i, r in enumerate(rows)}
for row in path:
    original = raw[row['d']]
    assert (row['close'], row['low'], row['high']) == (original['Close'], original['Low'], original['High'])
    assert all(math.isfinite(original[k]) for k in ['Open', 'High', 'Low', 'Close'])
    assert 0 < original['Low'] <= min(original['Open'], original['Close']) <= max(original['Open'], original['Close']) <= original['High']
assert rsi_by_day['2026-07-28'] == glw['rsi_example']['value'] == 30.7
assert len([r for r in rows if r['d'] <= '2026-07-28']) == 311
assert min(path, key=lambda p: p['low'])['d'] == '2026-07-28'
assert min(p['low'] for p in path) == 114.5
assert raw['2026-07-29']['Close'] < raw['2026-07-28']['Close']
peak = path[0]['close']
drawdown = 0
for p in path:
    peak = max(peak, p['close'])
    drawdown = min(drawdown, (p['close'] / peak - 1) * 100)
assert abs(drawdown - glw['whole_path']['max_close_drawdown_pct']) < .0001

C = {'bg':'#f6f4ed', 'card':'#ffffff', 'ink':'#172c2a', 'muted':'#506562',
     'line':'#187c72', 'grid':'#dce5e0', 'orange':'#9d4f08', 'gold':'#edab51',
     'tint':'#fff1d9', 'loss':'#aa333d', 'slate':'#557185'}
COPY = {
 'zh': {
  'badge':'历史条件回放 · 非实际提醒', 'title':'GLW · 回看七月回落',
  'subtitle':'保留原始事件，再检查价格条件。85 个交易日的完整路径，包含后续下跌。',
  'price':'每日收盘价 · 美元', 'july':'2026 年 7 月', 'rsi':'RSI(14) · Wilder · 回溯计算',
  'rule':'示例条件 < 35', 'peak':'6/29 收盘', 'start':'5/6 收盘', 'end':'9/4 收盘',
  'low':['7/28 盘中最低 $114.50','当日收盘 $126.01'],
  'event_badge':'原始事件 · 2026-05-06', 'event_title':'NVIDIA × Corning',
  'event_lines':['两类认股权证合计 $5 亿','传统认股权证行权价 $180','行权价不是合作方买入股票的成本'],
  'replay_badge':'历史条件回放 · 2026-07-28', 'replay_lines':['用当日及此前收盘价重算','7/29 收盘继续回落至 $124.05','未找到对应的历史推送凭证'],
  'future_badge':'未来配置示意 · 未启用', 'future_title':'GLW + RSI(14) < 35',
  'future_lines':['条件再次成立时，带回这份旧记录','提醒内容还要说明：现在变了什么','当时的板块情绪 / Vibe Check：缺历史证据'],
  'loss':'区间股价变化 −15.0%     最大收盘回撤 −51.5%',
  'basis':'2026-05-06—09-04 · 未复权日线；非成交收益，不含股息、费用与税。回溯指标不能证明当时已收到提醒。',
  'source':'来源：Corning 8-K（2026-05-06） / Yahoo 冻结行情（取得于 2026-09-07 UTC）。完整数据和口径随图保存。',
 },
 'en': {
  'badge':'HISTORICAL REPLAY · NO VERIFIED ALERT', 'title':'GLW · Revisit the July pullback',
  'subtitle':'Keep the original event. Check the price condition. All 85 sessions remain, including later losses.',
  'price':'Daily close · USD', 'july':'JULY 2026', 'rsi':'RSI(14) · Wilder · Recomputed',
  'rule':'Example rule < 35', 'peak':'Jun 29 close', 'start':'May 6 close', 'end':'Sep 4 close',
  'low':['Jul 28 intraday low $114.50','Close that day $126.01'],
  'event_badge':'ORIGINAL EVENT · MAY 6, 2026', 'event_title':'NVIDIA × Corning',
  'event_lines':['$500m paid for two types of warrants','Traditional warrant exercise price: $180','Exercise price is not the stock purchase cost'],
  'replay_badge':'HISTORICAL REPLAY · JUL 28, 2026', 'replay_lines':['Recomputed using closes through that day','Jul 29 closed lower again, at $124.05','No matching historical alert receipt found'],
  'future_badge':'FUTURE SETUP EXAMPLE · NOT ENABLED', 'future_title':'GLW + RSI(14) < 35',
  'future_lines':['Bring back this record if the condition returns','Explain what has changed since the original','July mood / Vibe Check: historical data missing'],
  'loss':'Price change −15.0%     Max close drawdown −51.5%',
  'basis':'May 6–Sep 4, 2026 · Unadjusted daily prices; not trading returns. Dividends, fees and taxes excluded. Recomputed RSI is not proof of a past alert.',
  'source':'Sources: Corning 8-K (May 6, 2026) / frozen Yahoo prices (retrieved Sep 7, 2026 UTC). Full data and methods are saved with this chart.',
 }
}

def render(lang):
    t = COPY[lang]
    svg = []
    def add(s): svg.append(s)
    def text(x,y,value,size=24,fill=None,weight=400,anchor='start'):
        add(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill or C["ink"]}" text-anchor="{anchor}">{html.escape(str(value))}</text>')
    def rect(x,y,w,h,fill,rx=20,stroke=None):
        add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"'+(f' stroke="{stroke}"' if stroke else '')+'/>')
    def line(x1,y1,x2,y2,color,width=1,dash=None):
        add(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{color}" stroke-width="{width}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
    def circle(x,y,r,color):
        add(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r}" fill="{color}" stroke="white" stroke-width="3"/>')
    x0,x1 = 122,1186
    y0,y1 = 370,663
    xp = lambda i: x0+i*(x1-x0)/(len(path)-1)
    yp = lambda p: y1-(p-100)/170*(y1-y0)
    rp = lambda p: 866-(p-20)/70*107
    july = [i for i,p in enumerate(path) if p['d'].startswith('2026-07')]
    mark = next(i for i,p in enumerate(path) if p['d']=='2026-07-28')
    mark_x = xp(mark)
    add('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" role="img" aria-labelledby="title description">')
    add(f'<title id="title">{html.escape(t["title"])}</title><desc id="description">All 85 daily GLW closes from May 6 through September 4, 2026, with retrospectively recomputed Wilder RSI(14). July 28 intraday low 114.50 and close 126.01 are distinct; July 29 closes lower at 124.05. No matching historical alert was verified. $180 is a warrant exercise price, not stock purchase cost.</desc>')
    add('<style>text{font-family:"Arial","PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",sans-serif} .number{font-variant-numeric:tabular-nums}</style>')
    rect(0,0,1920,1080,C['bg'],0)
    avatar=base64.b64encode((SITE/'public/avatar-160.jpg').read_bytes()).decode()
    add('<defs><clipPath id="avatar"><circle cx="85" cy="69" r="23"/></clipPath><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#187c72" stop-opacity=".16"/><stop offset="100%" stop-color="#187c72" stop-opacity=".01"/></linearGradient></defs>')
    add(f'<image x="62" y="46" width="46" height="46" clip-path="url(#avatar)" href="data:image/jpeg;base64,{avatar}"/>')
    text(125,80,'Ducky TradeBot',27,weight=700)
    text(1856,78,t['badge'],22,C['orange'],600,'end')
    text(64,166,t['title'],56,weight=750)
    text(66,213,t['subtitle'],27,C['muted'])
    rect(64,250,1180,680,C['card'],28)
    text(100,299,t['price'],25,weight=600)
    text(1204,299,'2026-05-06 → 2026-09-04',23,C['muted'],anchor='end')
    rect(xp(july[0])-5,328,xp(july[-1])-xp(july[0])+10,350,'#fff6e8',8)
    text((xp(july[0])+xp(july[-1]))/2,351,t['july'],20,C['orange'],600,'middle')
    for val in [120,160,200,240,260]:
        y=yp(val);line(x0,y,x1,y,C['grid']);text(x0-18,y+7,str(val),20,C['muted'],anchor='end')
    points=' '.join(f'{xp(i):.2f},{yp(p["close"]):.2f}' for i,p in enumerate(path))
    add(f'<polygon points="{x0},{y1} {points} {x1},{y1}" fill="url(#area)"/>')
    add(f'<polyline id="all-85-closes" data-points="85" points="{points}" fill="none" stroke="{C["line"]}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>')
    for i,p in enumerate(path):
        add(f'<circle cx="{xp(i):.2f}" cy="{yp(p["close"]):.2f}" r="1.7" fill="{C["line"]}"><title>{p["d"]}: ${p["close"]:.2f}</title></circle>')
    line(mark_x,362,mark_x,873,C['orange'],1.7,'5 6')
    circle(mark_x,yp(126.01000213623047),6,C['orange'])
    line(mark_x,yp(126.01),mark_x,yp(114.5),C['orange'],2)
    circle(mark_x,yp(114.5),5,C['orange'])
    rect(mark_x+18,408,316,79,C['tint'],12)
    text(mark_x+32,438,t['low'][0],20,C['orange'],600)
    text(mark_x+32,468,t['low'][1],20,C['orange'])
    peak_i=max(range(len(path)),key=lambda i:path[i]['close'])
    for i,label,dx,dy,anchor in [(0,t['start'],0,32,'start'),(peak_i,t['peak'],0,-58,'middle'),(len(path)-1,t['end'],-4,-54,'end')]:
        x,y=xp(i),yp(path[i]['close']);circle(x,y,5,C['line']);text(x+dx,y+dy,label,19,C['muted'],anchor=anchor);text(x+dx,y+dy+28,f'${path[i]["close"]:.2f}',25,C['line'],700,anchor)
    ticks=[(0,'5/6'),(next(i for i,p in enumerate(path) if p['d']=='2026-06-01'),'6/1'),(july[0],'7/1'),(mark,'7/28'),(next(i for i,p in enumerate(path) if p['d']=='2026-08-03'),'8/3'),(84,'9/4')]
    for i,label in ticks:text(xp(i),702,label,20,C['muted'],anchor='middle')
    text(100,746,t['rsi'],22,weight=600)
    for value in [30,50,70]:
        y=rp(value);line(x0,y,x1,y,C['grid']);text(x0-18,y+7,str(value),18,C['muted'],anchor='end')
    line(x0,rp(35),x1,rp(35),C['orange'],1.5,'7 7')
    rpoints=' '.join(f'{xp(i):.2f},{rp(rsi_by_day[p["d"]]):.2f}' for i,p in enumerate(path))
    add(f'<polyline id="all-85-rsi" data-points="85" points="{rpoints}" fill="none" stroke="{C["slate"]}" stroke-width="3" stroke-linejoin="round"/>')
    circle(mark_x,rp(30.7),6,C['orange']);rect(mark_x+17,839,126,43,C['tint'],9);text(mark_x+30,869,'30.7 < 35',22,C['orange'],700)
    text(1204,907,t['rule'],20,C['orange'],anchor='end')
    def side(y,h,badge,title,lines,kind='normal'):
        rect(1280,y,576,h,C['tint'] if kind=='replay' else C['card'],24, C['gold'] if kind=='replay' else None)
        text(1310,y+40,badge,19,C['orange'] if kind!='normal' else C['muted'],600)
        text(1310,y+90,title,31 if lang=='en' else 34,weight=700)
        for n,txt in enumerate(lines):text(1310,y+132+n*32,txt,22 if lang=='zh' else 21,C['muted'])
    side(250,226,t['event_badge'],t['event_title'],t['event_lines'])
    side(496,226,t['replay_badge'],'RSI 30.7 < 35',t['replay_lines'],'replay')
    side(742,188,t['future_badge'],t['future_title'],t['future_lines'][:1],'future')
    # The missing July sentiment cannot be invented; keep it beside the chart.
    text(1288,967,t['future_lines'][2],18,C['muted'])
    text(68,973,t['loss'],27,C['loss'],700)
    text(68,1013,t['basis'],20 if lang=='zh' else 19,C['muted'])
    text(68,1048,t['source'],19 if lang=='zh' else 18,C['muted'])
    add('</svg>')
    return '\n'.join(svg)

def main():
    (OUT/'glw-frozen-input.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
    with (OUT/'glw-memory-replay-data.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=['date','close_usd','low_usd','high_usd','rsi_14_recomputed','close_change_pct','spy_close_change_pct']);writer.writeheader()
        for p in path:writer.writerow({'date':p['d'],'close_usd':p['close'],'low_usd':p['low'],'high_usd':p['high'],'rsi_14_recomputed':rsi_by_day[p['d']],'close_change_pct':p['return_pct'],'spy_close_change_pct':p['spy_return_pct']})
    for lang in ['zh','en']:
        file=OUT/('glw-memory-replay.svg' if lang=='zh' else 'glw-memory-replay.en.svg');file.write_text(render(lang))
    manifest={'kind':'historical-condition-replay','display_sessions':85,'input_rows':339,'rsi_july28_input_rows':311,
      'rsi_14_july28_recomputed':30.7,'method':'Existing technicals.rsi; each prefix only, no future closes; not a historical stored indicator snapshot',
      'start':'2026-05-06','end':'2026-09-04','price_basis':source['price_basis'],'retrieved_at':source['retrieved_at'],
      'source_url':glw['source_url'],'historical_delivery_verified':False,'future_alert_configuration_enabled':False,
      'july_degen_sector_fud_luna_context':'No point-in-time evidence supplied; no score, polarity or causal story drawn',
      'price_change_pct':glw['whole_path']['return_pct'],'max_close_drawdown_pct':drawdown,
      'intraday_low':{'date':'2026-07-28','value':114.5},'later_lower_close':{'date':'2026-07-29','value':raw['2026-07-29']['Close']},
      'traditional_warrant_exercise_price_usd':180,'traditional_warrant_exercise_price_is_stock_cost':False,
      'source_hashes':{str(p.relative_to(SITE)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [INPUT,CASE,PUBLIC]},
      'technicals_sha256':hashlib.sha256((BOT/'bin/technicals.py').read_bytes()).hexdigest()}
    (OUT/'glw-memory-replay-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print('Verified 85/85 frozen sessions, complete losses, OHLC match, RSI 30.7 from 311 prefix bars; wrote zh/en SVG + data/manifest'+(''))

if __name__=='__main__':main()
