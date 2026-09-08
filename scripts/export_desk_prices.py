#!/usr/bin/env python3
"""Export public stored closes, with separate source/session/retrieval clocks.

Dated artifacts remain immutable. --current atomically updates the homepage's
current projection, whose previous versions are retained by the git notary.
No provider calls, private snapshots, accounts or model inference.
"""
import argparse
import json
import math
import os
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

TICKERS = ('NVDA', 'SPY', 'NOK')


def validate(data, ticker):
    bars = data.get('bars')
    if data.get('ticker') != ticker or not isinstance(bars, list) or not bars:
        raise ValueError('missing_or_mismatched_prices')
    previous = ''
    for row in bars:
        day = row.get('t')
        if not isinstance(day, str) or date.fromisoformat(day).isoformat() != day or day <= previous:
            raise ValueError('invalid_price_dates')
        close = row.get('c')
        if type(close) not in (float, int) or not math.isfinite(close) or close <= 0:
            raise ValueError('invalid_close')
        previous = day
    context = data.get('session_context') or {}
    if (data.get('last_d') != previous or context.get('price_session') != previous
            or context.get('basis') != 'completed_regular_session'
            or context.get('status') not in ('current', 'stale')):
        raise ValueError('unverified_completed_session')
    expected = date.fromisoformat(context['expected_session']).isoformat()
    checked = datetime.fromisoformat(context['checked_at'].replace('Z', '+00:00'))
    if checked.tzinfo is None or previous > expected:
        raise ValueError('invalid_session_context')
    return {'ticker': ticker, 'bars': bars, 'last_d': previous, 'session_context': context}


def fetch_json(url):
    request = Request(url, headers={'User-Agent': 'Ducky-public-price-export/1'})
    with urlopen(request, timeout=20) as response:
        return json.load(response)


def export(output, *, current=False, fetch=fetch_json, now=None):
    output = Path(output)
    if output.exists() and not current:
        raise ValueError('dated_artifact_exists')
    quotes = []
    for ticker in TICKERS:
        url = f'https://api.duckybot.app/public/prices/{ticker}.json?limit=30'
        row = validate(fetch(url), ticker)
        row.update(source_url=url, retrieved_at=(now or datetime.now(timezone.utc)).isoformat(timespec='seconds'))
        quotes.append(row)
    # Validate the complete set before replacing any last-good artifact.
    payload = {'basis': 'Recorded USD daily closes, not live quotes; charts retain every returned daily close.', 'quotes': quotes}
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(output.name + '.tmp')
    try:
        temporary.write_text(json.dumps(payload, indent=2) + '\n')
        os.replace(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--current', action='store_true', help='update current projection; git keeps prior versions')
    args = parser.parse_args()
    try:
        export(args.output, current=args.current)
    except Exception as exc:
        raise SystemExit('Public close export failed: ' + type(exc).__name__)


if __name__ == '__main__':
    main()
