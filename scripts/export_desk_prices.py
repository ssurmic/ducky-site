#!/usr/bin/env python3
"""Freeze a dated public daily-close example, from the existing read-only API.

No market provider request, private snapshot or account data. Never overwrite an
earlier artifact; the homepage labels the actual price session independently.
"""
import argparse
import json
import math
import subprocess
from datetime import datetime, timezone
from pathlib import Path


def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);args=p.parse_args()
    if args.output.exists():
        raise SystemExit('Output already exists; choose a new dated artifact.')
    quotes=[]
    for ticker in ('NVDA','SPY','NOK'):
        source=f'https://api.duckybot.app/public/prices/{ticker}.json?limit=30'
        data=json.loads(subprocess.check_output(['curl','--fail','--silent','--show-error','--max-time','20',source]))
        bars=data['bars'];assert data['ticker']==ticker and bars and data['last_d']==bars[-1]['t']
        assert all(type(row['c']) in (float,int) and math.isfinite(row['c']) and row['c']>0 for row in bars)
        quotes.append(dict(ticker=ticker,bars=bars,last_d=data['last_d'],source_url=source,
                           retrieved_at=datetime.now(timezone.utc).isoformat(timespec='seconds')))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(dict(basis='Recorded USD daily closes, not live quotes; charts retain every returned daily close.',quotes=quotes),indent=2)+'\n')


if __name__=='__main__':
    main()
