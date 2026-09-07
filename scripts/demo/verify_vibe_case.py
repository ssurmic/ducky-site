"""Audit the finite Reddit observation set selected for the public demo.

No acquisition, writes, notification claims, or historical-score backfill.
The historical investment cases retain their separate verify_watchlist_case gate.
"""
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
private = json.loads((ROOT / 'scripts/demo/evidence/voice-v10/reddit-mu.json').read_text())
public = json.loads((ROOT / 'public/media/ducky-demo-reddit-2026-09-07.json').read_text())
checks = 0


def check(condition, message):
    global checks
    checks += 1
    if not condition:
        raise AssertionError(message)


def utc(value):
    stamp = datetime.fromisoformat(value)
    check(stamp.utcoffset() is not None and stamp.utcoffset().total_seconds() == 0,
          'Observation dates must carry UTC, not an inferred local timezone')
    return stamp


check(private['ticker'] == 'MU', 'Only the selected public example is exported')
check(private['provider'] == 'ApeWisdom' and private['platform'] == 'reddit', 'Source identity')
check(private['window_hours'] == 24, 'Rolling mention windows must remain 24 hours')
check(private['predictive_validity'] == 'unvalidated', 'No predictive success claim')
for missing in ('notification_delivery', 'source_window_end', 'source_publication_at',
                'unique_authors', 'original_posts'):
    check(private[missing] is None, missing + ' must remain explicitly unknown')
retrieved = utc(private['retrieved_at'])
rows = private['items']
check(len(rows) == 10 and len({r['id'] for r in rows}) == 10, 'Ten distinct observations')
previous = None
for row in rows:
    stamp = utc(row['observed_at'])
    check(previous is None or stamp > previous, 'History must remain strictly chronological')
    check(stamp <= retrieved, 'Retrieval cannot precede an observation')
    check(row['ticker'] == 'MU' and row['company'] == 'Micron Technology', 'Ticker identity')
    check(row['source_url'] == private['source_url'] == 'https://apewisdom.io/stocks/MU/', 'Source URL')
    for key in ('mentions', 'mentions_previous'):
        check(type(row[key]) is int and row[key] >= 0, 'Actual nonnegative count: ' + key)
    check(row['mentions_previous'] > 0, 'This selected sample has a defined growth denominator')
    expected = round((row['mentions'] / row['mentions_previous'] - 1) * 100, 1)
    check(row['change_pct'] == expected, 'Growth compares the provider prior count, not the prior observation')
    check(type(row['index']) in (int, float) and 0 <= row['index'] <= 100, 'Finite recorded score')
    check(row['state'] == 'normal' and row['version'] == 'reddit-attention-v1', 'No invented overheating event')
    previous = stamp
check(rows[0]['observed_at'] == '2026-09-06T21:35:05+00:00', 'Do not imply earlier history')
check(rows[-1]['observed_at'] == '2026-09-07T06:01:45+00:00', 'Frozen last observation')
check((rows[-1]['mentions'], rows[-1]['mentions_previous'], rows[-1]['index']) == (30, 23, 45.5),
      'Displayed endpoint must match the source record')
check(any(rows[i]['mentions'] < rows[i-1]['mentions'] for i in range(1, len(rows))),
      'Cooling observations must not be removed')
check(any(row['change_pct'] < 0 for row in rows), 'Negative changes are retained')
expected_public = {**private, 'items': [{k: v for k, v in r.items() if k != 'id'} for r in rows]}
check(public == expected_public, 'Public evidence must preserve every selected fact, omitting only database IDs')
print(json.dumps({'checks': checks, 'observations': len(rows), 'ticker': 'MU',
                  'result': 'PASS', 'predictive_validity': 'unvalidated'}))
