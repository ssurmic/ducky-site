"""Finite public homepage examples, checked against their dated source facts."""
import json
import math
from datetime import datetime


def curve(rows, width=520, height=148):
    values = [row['close'] for row in rows]
    if len(values) < 2 or not all(type(v) in (float, int) and math.isfinite(v) and v > 0 for v in values):
        raise ValueError('Price history must contain actual positive closes')
    low, high = min(values), max(values)
    spread = high - low or high * .02
    coords = [(6 + i * (width - 12) / (len(values) - 1),
               height - 8 - (v - low + spread * .06) / (spread * 1.12) * (height - 16))
              for i, v in enumerate(values)]
    path = ' '.join(f'{"M" if i == 0 else "L"}{x:.2f},{y:.2f}' for i, (x, y) in enumerate(coords))
    return {'path': path, 'area': path + f' L{width-6},{height} L6,{height} Z',
            'end_x': coords[-1][0], 'end_y': coords[-1][1], 'width': width, 'height': height,
            'start': rows[0]['d'], 'end': rows[-1]['d']}


def load_home_showcase(public):
    source = json.loads((public / 'examples/home-records-2026-09-07.json').read_text())
    cases = []
    for row in source['items']:
        if row['label'] != 'LIVE' or row['ticker'] not in ('AMKR', 'SGI', 'HUBS'):
            raise ValueError('Homepage selections must be the reviewed contemporaneous records')
        prices = row['price_path']
        dates = [r['d'] for r in prices]
        if dates != sorted(set(dates)) or dates[0] != row['base_d']:
            raise ValueError('Incomplete or reordered source history')
        if not datetime.fromisoformat(row['recorded_at']).tzinfo:
            raise ValueError('Source observation must retain its timezone')
        for n in (5, 20):
            outcome = row['observed_returns'][str(n)]
            expected = (prices[n]['close'] / prices[0]['close'] - 1) * 100 if n < len(prices) else None
            original = row['recorded_outcomes'][f'ret_{n}d']
            if expected is None:
                if outcome is not None or original is not None:
                    raise ValueError('Unfinished windows must not acquire a result')
            elif (not outcome or abs(outcome['pct'] - expected) > .00011
                  or abs(original - expected) > .00011 or outcome['date'] != dates[n]):
                raise ValueError('Displayed outcome disagrees with source history')
        cases.append({**row, 'date': row['recorded_at'][:10], 'chart': curve(prices, 320, 88)})
    return {'cases': cases, 'record_history_retrieved': source['retrieved_at'][:10]}
