"""Read-only check of frozen demo paths against dated OHLC inputs, including losses."""
import json, math
from pathlib import Path
root=Path(__file__).resolve().parent/'evidence'/'voice-v9'
case=json.loads((root/'case.json').read_text())
prices={}
for p in (root/'market-inputs').glob('*.json'):
 data=json.loads(p.read_text());rows=data['rows']
 assert [r['d'] for r in rows]==sorted(set(r['d'] for r in rows))
 assert all(math.isfinite(r['Close']) and 0<r['Low']<=min(r['Open'],r['Close'])<=max(r['Open'],r['Close'])<=r['High'] for r in rows)
 prices[data['ticker']]={r['d']:r for r in rows}
checks=0
for ticker,keys in [('NOK',['whole_path','after_alert','first_20_after_announcement']),('GLW',['whole_path']),('HOOD',['after_disclosure_20'])]:
 for key in keys:
  sample=case[ticker.lower()][key];path=sample['path']
  expected=[d for d in prices[ticker] if sample['start']<=d<=sample['end']]
  assert [p['d'] for p in path]==expected, 'Missing sessions or loss periods'
  base=prices[ticker][sample['start']]['Close'];peak=base;drawdown=0
  for row in path:
   source=prices[ticker][row['d']];assert row['close']==source['Close'] and row['low']==source['Low'] and row['high']==source['High']
   assert abs(row['return_pct']-(source['Close']/base-1)*100)<.000051
   benchmark=(prices['SPY'][row['d']]['Close']/prices['SPY'][sample['start']]['Close']-1)*100
   assert abs(row['spy_return_pct']-benchmark)<.000051
   peak=max(peak,source['Close']);drawdown=min(drawdown,(source['Close']/peak-1)*100);checks+=1
  assert abs(drawdown-sample['max_close_drawdown_pct'])<.000051
  assert sample['return_pct']==path[-1]['return_pct']
  if key.endswith('_20') or key=='first_20_after_announcement':assert len(path)==21
nok=[r for d,r in prices['NOK'].items() if case['nok']['event_date']<=d<='2026-09-04']
trigger=next(r for r in nok if r['Close']<=case['nok']['alert_threshold'])
assert trigger['d']==case['nok']['trigger_date'] and trigger['Close']==case['nok']['trigger_close']
assert min(r['Low'] for r in nok)==case['nok']['period_intraday_low']
assert case['nok']['first_20_after_announcement']['return_pct']<0
assert case['glw']['whole_path']['return_pct']<0
assert case['delivery_evidence']['historical_notifications_verified'] is False
assert case['hood']['trade_date']<case['hood']['filing_date']
assert case['hood']['consideration_usd']==case['hood']['weighted_price']*case['hood']['shares']
assert case['macro']['company_disclosure_date']<case['macro']['event_date']
print(f'PASS: {checks} dated path observations; prices, SPY, losses, drawdowns, trigger and disclosure ordering checked.')
