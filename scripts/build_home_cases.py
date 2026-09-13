#!/usr/bin/env python3
"""Build the landing-page "recent catches" JSON from unadjusted daily closes.

Run with an interpreter that has yfinance (the backend venv works):
  ~/dev/ducky-bot/.venv/bin/python scripts/build_home_cases.py --as-of 2026-09-12

Each case records what Ducky recorded (kind), the signal session, the tag and the sources:
  live   = the signal is a LIVE row in the public track-record export (an alert was recorded then)
  replay = historical example computed after the fact; no alert was delivered at the time
Prices: unadjusted USD daily closes; base = close of the signal session; return = close / base - 1.
Dividends, fees and taxes are excluded. Closes are not event-time executable prices.
The output keeps every daily point of each path (wins and losses alike) so the sparkline is the record.
"""
import argparse, json, datetime as dt
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH_CAP = 60  # sessions drawn after the signal; the headline window is declared per case

CASES = [
    dict(key='vrt', ticker='VRT', tag='live', signal_date='2026-07-29', headline='20',
         kind='earnings', record_url='/track-record/', source_url=None,
         ledger=dict(ts='2026-07-29', kind='earnings', mode='LIVE')),
    dict(key='sgi', ticker='SGI', tag='live', signal_date='2026-08-27', headline='now',
         kind='insider', record_url='/track-record/', source_url=None,
         ledger=dict(ts='2026-08-27', kind='insider', mode='LIVE')),
    dict(key='hood', ticker='HOOD', tag='replay', signal_date='2025-06-13', headline='20',
         kind='insider', record_url=None,
         source_url='https://www.sec.gov/Archives/edgar/data/1783879/000178387925000189/xslF345X03/wk-form4_1750195641.xml',
         ledger=None),
    dict(key='glw', ticker='GLW', tag='replay', signal_date='2026-05-06', headline='60',
         kind='partner', record_url=None, source_url=None, ledger=None),
]


def previous_source(key):
    """Reuse the source URL already published for the older demo cases (GLW 8-K)."""
    for p in sorted(ROOT.glob('public/media/ducky-demo-cases-*.json')):
        doc = json.loads(p.read_text())
        if key in doc.get('cases', {}) and doc['cases'][key].get('source_url'):
            return doc['cases'][key]['source_url']
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--as-of', default=dt.date.today().isoformat())
    ap.add_argument('--out')
    args = ap.parse_args()
    import yfinance as yf  # noqa: E402  (only needed to build; the site never imports it)
    out = Path(args.out or ROOT / f'public/media/ducky-home-cases-{args.as_of}.json')
    retrieved = dt.datetime.now(dt.timezone.utc).isoformat()
    cases = []
    for spec in CASES:
        hist = yf.Ticker(spec['ticker']).history(start='2025-05-01', end=args.as_of, auto_adjust=False)
        closes = hist['Close']
        closes.index = closes.index.tz_localize(None)
        idx = closes.index.get_indexer([dt.datetime.fromisoformat(spec['signal_date'])], method='nearest')[0]
        if closes.index[idx].date().isoformat() != spec['signal_date']:
            raise SystemExit(f"{spec['ticker']}: signal date {spec['signal_date']} is not a session ({closes.index[idx].date()})")
        base = float(closes.iloc[idx])
        seg = closes.iloc[idx: idx + PATH_CAP + 1]
        path = [dict(d=d.date().isoformat(), close=round(float(c), 2), return_pct=round((float(c) / base - 1) * 100, 2))
                for d, c in seg.items()]
        after = closes.iloc[idx:]
        def ret(n):
            return round((float(after.iloc[n]) / base - 1) * 100, 1) if len(after) > n else None
        now_ret = round((float(closes.iloc[-1]) / base - 1) * 100, 1)
        sessions = int(len(closes) - 1 - idx)
        window = spec['headline']
        headline = now_ret if window == 'now' else ret(int(window))
        if headline is None:
            raise SystemExit(f"{spec['ticker']}: headline window {window} not complete")
        cases.append(dict(
            key=spec['key'], ticker=spec['ticker'], tag=spec['tag'], kind=spec['kind'],
            signal_date=spec['signal_date'], base_close=round(base, 2),
            end_date=closes.index[-1].date().isoformat(), end_close=round(float(closes.iloc[-1]), 2),
            sessions_since=sessions, return_5_pct=ret(5), return_20_pct=ret(20), return_60_pct=ret(60),
            return_now_pct=now_ret, headline_window=window, headline_return_pct=headline,
            path_sessions=len(path) - 1, path=path,
            source_url=spec['source_url'] or previous_source(spec['key']), record_url=spec['record_url'],
            ledger=spec['ledger']))
    doc = dict(
        as_of=args.as_of, prices_retrieved_at=retrieved,
        presentation='Selected recorded signals and historical examples; not a strategy backtest and not a promise of future alerts.',
        basis='Unadjusted USD daily closes. Base = close of the signal session; return = close / base - 1. '
              'Dividends, fees and taxes excluded; closes are not event-time executable prices. '
              'live = LIVE row in the public track-record export; replay = computed after the fact, no alert was delivered then. '
              'Every daily point of each path is retained, including losses.',
        cases=cases)
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    for c in cases:
        print(f"{c['ticker']:5} {c['tag']:6} {c['signal_date']} base {c['base_close']:.2f} | 20s {c['return_20_pct']} | 60s {c['return_60_pct']} | now {c['return_now_pct']} ({c['sessions_since']} sessions) | headline {c['headline_window']} → {c['headline_return_pct']:+.1f}% | src {c['source_url']}")
    print('wrote', out.relative_to(ROOT))


if __name__ == '__main__':
    main()
