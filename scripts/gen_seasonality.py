#!/usr/bin/env python3
"""Build a shared, dated monthly SPY/QQQ snapshot; never runs in a web request.

Run with the backend venv (yfinance installed). --csv-dir reuses daily Close CSVs
named ducky-seasonality-SPY.csv / QQQ.csv for reproducible offline regeneration.
Only completed months with both symbols are published. Adjusted closes include
the provider's split/dividend adjustments; this is historical ETF research.
"""
import argparse
import csv
import json
from datetime import date, datetime, timezone
from pathlib import Path


def month_ends(rows, cutoff):
    result = {}
    for day, price in rows:
        if day >= cutoff or price <= 0:
            continue
        month = day[:7]
        if month not in result or result[month]['date'] < day:
            result[month] = {'date': day, 'adjusted_close': round(float(price), 8)}
    return result


def build(series, cutoff):
    ends = {ticker: month_ends(rows, cutoff) for ticker, rows in series.items()}
    rows = []
    for month in sorted(set(ends['SPY']) & set(ends['QQQ'])):
        year, number = map(int, month.split('-'))
        previous = f'{year - (number == 1):04d}-{12 if number == 1 else number - 1:02d}'
        if year < 2000 or any(previous not in ends[t] for t in ends):
            continue
        row = {'year': year, 'month': number, 'midterm': year % 4 == 2}
        for ticker in ends:
            current, prior = ends[ticker][month], ends[ticker][previous]
            row[ticker] = dict(current, previous_date=prior['date'], previous_adjusted_close=prior['adjusted_close'],
                               return_pct=round((current['adjusted_close'] / prior['adjusted_close'] - 1) * 100, 6))
        rows.append(row)
    if not rows:
        raise ValueError('No complete shared months')
    return {'version': 'monthly-etf-v1', 'as_of': max(r['SPY']['date'] for r in rows),
            'fetched_at': datetime.now(timezone.utc).isoformat(),
            'source': 'Yahoo Finance adjusted daily close via yfinance',
            'source_urls': {t: f'https://finance.yahoo.com/quote/{t}/history/' for t in ends},
            'method': 'Last adjusted close of month / last adjusted close of prior month - 1; completed months only; no fees or taxes.',
            'rows': rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--csv-dir', type=Path)
    parser.add_argument('--cutoff', default=date.today().replace(day=1).isoformat())
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'public/seasonality.json')
    args = parser.parse_args()
    if args.cutoff[8:] != '01' or args.cutoff > date.today().replace(day=1).isoformat():
        parser.error('cutoff must be the first day of a current or past month')
    series = {}
    for ticker in ('SPY', 'QQQ'):
        if args.csv_dir:
            with (args.csv_dir / f'ducky-seasonality-{ticker}.csv').open() as file:
                series[ticker] = [(r['Date'][:10], float(r['Close'])) for r in csv.DictReader(file)]
        else:
            import yfinance as yf
            frame = yf.Ticker(ticker).history(start='1999-12-01', end=args.cutoff, auto_adjust=True, actions=False)
            series[ticker] = [(str(day.date()), float(row['Close'])) for day, row in frame.iterrows()]
        if len(series[ticker]) < 6000:
            raise ValueError(f'{ticker}: incomplete history; retaining previous snapshot')
    data = build(series, args.cutoff)
    temp = args.output.with_suffix('.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    temp.replace(args.output)
    print(f'{len(data["rows"])} complete shared months; through {data["as_of"]} → {args.output}')


if __name__ == '__main__':
    main()
