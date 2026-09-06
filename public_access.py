"""Build-time guard for static radar payloads copied into dist.

Call sanitize_public_payloads(DIST) immediately after copying public/. Source
records stay intact; only the releasable deployment copy is filtered.
"""
import json
from datetime import datetime, timedelta, timezone

DELAY_DAYS = 5


def sanitize_public_payloads(directory, current=None):
    current = (current or datetime.now(timezone.utc)).astimezone(timezone.utc)
    cutoff = current.replace(minute=(current.minute//5)*5,second=0,microsecond=0)-timedelta(days=DELAY_DAYS)
    access = dict(mode='delayed',delay_days=DELAY_DAYS,available_before=cutoff.isoformat(timespec='seconds'),timezone='UTC')
    def allowed(row):
        if row.get('mode') == 'BACKTEST':return True
        try:
            at=datetime.fromisoformat(str(row.get('ts','')).replace('Z','+00:00'))
            if not at.tzinfo:at=at.replace(tzinfo=timezone.utc)
            return at<=cutoff
        except (TypeError,ValueError):return False
    counts={}
    for filename,key in [('feed.json','items'),('radar-history.json','items'),('track-record.json','rows')]:
        path=directory/filename
        if not path.exists():continue
        data=json.loads(path.read_text())
        rows=data.get(key)
        if not isinstance(rows,list):raise ValueError('Invalid dated public payload: '+filename)
        data[key]=[row for row in rows if isinstance(row,dict) and allowed(row)]
        data['access']=access
        path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
        counts[filename]=len(data[key])
    # Public author theses remain public; their related signal list must not
    # serve as a second current radar feed.
    path=directory/'ideas.json'
    if path.exists():
        data=json.loads(path.read_text())
        for idea in data.get('ideas',[]):
            if 'signals' in idea:idea['signals']=[r for r in idea['signals'] if allowed(r)]
        data['radar_access']=access
        path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
    return counts
