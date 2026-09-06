from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse,parse_qs
import json
ROOT=Path(__file__).resolve().parent
PUBLIC=ROOT.parents[2]/'public'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT),**kwargs)
 def translate_path(self,path):
  local=Path(super().translate_path(path))
  relative=local.relative_to(ROOT)
  if relative.parts and relative.parts[0] in {'css','js','fonts','vendor','avatar-160.jpg','mascot.svg'}:
   return str(PUBLIC/relative)
  return str(local)
 def end_headers(self):
  self.send_header('Cache-Control','no-store, max-age=0')
  super().end_headers()
 def do_GET(self):
  parsed=urlparse(self.path)
  path=parsed.path
  if path.startswith('/fixture/'):
   key=path[len('/fixture'):]
   doc={'items':[],'status':'unavailable','mode':'demo'}
   if 'facets' in key:
    doc={'sectors':['Technology','Financial Services','Industrials'],'cap_buckets':[]}
   elif key=='/public/calendar.json':
    public=ROOT/'calendar-public.json'
    doc=json.loads((public if public.exists() else ROOT/'calendar.json').read_text())
   elif key=='/calendar/links':
    doc={'issuers':{'ORCL':['ORCL'],'NVDA':['NVDA']}}
   elif key=='/calendar/context' and (ROOT/'calendar-contexts.json').exists():
    query=parse_qs(parsed.query)
    kind=query.get('kind',[''])[0]
    date=query.get('date',[''])[0]
    ticker=query.get('ticker',['NVDA' if kind.upper()=='FOMC' else 'ORCL'])[0]
    contexts=json.loads((ROOT/'calendar-contexts.json').read_text())
    doc=contexts.get(f'{kind}:{date}:{ticker}',doc)
   self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(doc,ensure_ascii=False).encode());return
  super().do_GET()
 def do_POST(self): self.send_error(405,'Read-only demo; no changes saved')
 do_PUT=do_POST
 do_PATCH=do_POST
 do_DELETE=do_POST
ThreadingHTTPServer(('127.0.0.1',8778),Handler).serve_forever()
