#!/usr/bin/env python3
"""Build the landing-page creator showcase JSON (public/home-creators.json).

Input: an explicit private JSON file containing selected current, source-gated creator views
(ticker, stance, publication time, bilingual title, source URL) plus the creator roster
(name, language, videos tracked). Prepare it through the existing backend source reader, not
an unfiltered historical table export. Keep that input outside this public site repository.
This offline price formatter does not review sources or authorize public examples.
This script adds the price path after publication (unadjusted daily closes via yfinance):
  base   = close of the first session on or after the publication date (UTC)
  change = close 20 sessions later / base - 1, or the latest close when 20 sessions are not complete
and picks, per creator, ONE direction-consistent view (bullish view followed by a rise, bearish view
followed by a fall) with at least 5 sessions of history, preferring completed 20-session windows and
larger moves. The page discloses this selection and links to saved views and available follow-up
records. Creators without a qualifying view keep their roster row.
Run with an interpreter that has yfinance:
  python scripts/build_home_creators.py --source /private/path/selected-creator-views.json --as-of 2026-09-12
"""
import argparse, hashlib, json, re, datetime as dt
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CJK = re.compile(r'[一-鿿]')
BANNED = re.compile(r"ALL-IN|买这只|目标价|满仓|buy now|现在买|建议买入", re.IGNORECASE)
# This old exported point no longer passes the current source reader. A different,
# newly accepted point remains eligible; never recover this old export by price performance.
WITHHELD_POINTS = {'se-point:72a10d5bb79ded90e2af033194d896f7'}


def lang_of(kol):
    if kol.get('lang') in ('zh', 'en'):
        return kol['lang']
    return 'zh' if CJK.search(kol['name']) else 'en'


def source_document(path):
    requested = Path(path).expanduser().absolute()
    location = requested.parent.resolve(strict=True) / requested.name
    source = requested.resolve(strict=True)
    if location.is_relative_to(ROOT.resolve()) or source.is_relative_to(ROOT.resolve()):
        raise ValueError('Creator source input must be outside the public site repository')
    raw = source.read_bytes()
    doc = json.loads(raw)
    if not isinstance(doc, dict) or not isinstance(doc.get('kols'), list) or not isinstance(doc.get('points'), list):
        raise ValueError('Creator source input needs kols and points arrays')
    return doc, hashlib.sha256(raw).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', type=Path, required=True,
                    help='Private JSON input outside the site repository; selected current source-gated views only')
    ap.add_argument('--as-of', default=dt.date.today().isoformat())
    args = ap.parse_args()
    doc, source_hash = source_document(args.source)
    import yfinance as yf
    kols = {k['name']: k for k in doc['kols']}
    points = [p for p in doc['points'] if p.get('author') in kols and p.get('ticker')
              and p.get('stance') in ('support', 'counter') and p.get('source_url', '').startswith('https://')
              and p.get('point_id') not in WITHHELD_POINTS]
    closes = {}
    for tk in sorted({p['ticker'] for p in points}):
        h = yf.Ticker(tk).history(start='2025-06-01', end=args.as_of, auto_adjust=False)['Close']
        if h.empty:
            continue
        h.index = h.index.tz_localize(None)
        closes[tk] = h
    scored = []
    for p in points:
        c = closes.get(p['ticker'])
        if c is None:
            continue
        day = dt.datetime.fromisoformat(p['published_at'].replace('Z', '+00:00')).date()
        idx = c.index.searchsorted(dt.datetime.combine(day, dt.time()))
        if idx >= len(c):
            continue
        base = float(c.iloc[idx]); after = c.iloc[idx:]
        sessions = len(after) - 1
        if sessions < 5:
            continue
        complete = sessions >= 20
        end_i = 20 if complete else sessions
        change = round((float(after.iloc[end_i]) / base - 1) * 100, 1)
        consistent = change > 0 if p['stance'] == 'support' else change < 0
        title = p.get('title') or {}
        if not title.get('zh') or not title.get('en') or BANNED.search(title['zh'] + ' ' + title['en']):
            continue
        scored.append(dict(author=p['author'], ticker=p['ticker'], stance=p['stance'], date=str(c.index[idx].date()),
                           published_at=p['published_at'], base_close=round(base, 2),
                           end_date=str(after.index[end_i].date()), end_close=round(float(after.iloc[end_i]), 2),
                           sessions=end_i, complete=complete, change_pct=change, consistent=consistent,
                           title=title, source_url=p['source_url'], point_id=p.get('point_id')))
    # Editorial picks: a specific sourced view per creator (ticker, session date, video id), chosen for a
    # clear, self-contained claim. The numbers are still computed above; a pick that no longer qualifies
    # (not direction-consistent, or too few sessions) falls back to the automatic choice.
    PICKS = {
        '投资TALK君': ('COIN', '2026-08-10', '0tTj4dtJDyM'),
        '商浩金 Shanghao Jin': ('AMD', '2026-05-05', 'PweaTXhs-aU'),
        'Parkev Tatevosian, CFA': ('MRVL', '2026-09-03', 'csGLgpoAvwk'),
        'Meet Kevin': ('MU', '2026-09-01', 'bjIK7WpYZFk'),
        'Everything Money': ('NVDA', '2026-08-24', 'hnSgrv4m0rc'),
        'Ticker Symbol: YOU': ('NVDA', '2026-08-11', None),
    }
    SKIP = {'Tom Nash'}  # only self-referential claims so far; roster row only
    creators = []
    for name, kol in kols.items():
        mine = [s for s in scored if s['author'] == name]
        good = [s for s in mine if s['consistent']]
        good.sort(key=lambda s: (s['complete'], abs(s['change_pct']), s['date']), reverse=True)
        pick = PICKS.get(name)
        if pick:
            chosen = [s for s in good if s['ticker'] == pick[0] and s['date'] == pick[1] and (pick[2] is None or pick[2] in s['source_url'])]
            if chosen:
                chosen.sort(key=lambda s: len(s['title']['zh']) + len(s['title']['en']), reverse=True)
                good = chosen + [s for s in good if s not in chosen]
        if name in SKIP:
            good = []
        entry = dict(id=kol['id'], name=name, lang=lang_of(kol), platform=kol.get('platform') or 'youtube',
                     videos=kol.get('videos', 0), views_with_outcome=len(mine), case=good[0] if good else None)
        creators.append(entry)
    creators.sort(key=lambda e: (e['case'] is None, -(e['videos'] or 0), e['name']))
    out = dict(as_of=args.as_of, source='selected-current-creator-views', source_sha256=source_hash,
               presentation='One direction-consistent example view per creator with the price change after publication. '
                            'Not a hit rate or a ranking; the app lists saved views and available follow-up records.',
               basis='Unadjusted USD daily closes; base = first session on or after the publication date (UTC); '
                     'change = close 20 sessions later / base - 1, or the latest close when 20 sessions are not complete. '
                     'Dividends and fees excluded. Views belong to their authors.',
               creators=creators)
    (ROOT / 'public/home-creators.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
    for e in creators:
        c = e['case']
        print(f"{e['name']:28} {e['lang']} videos={e['videos']:3} outcomes={e['views_with_outcome']:2} | " + (f"{c['ticker']} {c['stance']} {c['date']} {c['change_pct']:+.1f}% ({c['sessions']}s{'' if c['complete'] else ' partial'}) | {c['title']['zh'][:40]}" if c else '-'))


if __name__ == '__main__':
    main()
