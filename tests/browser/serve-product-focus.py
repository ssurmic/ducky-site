# Synthetic fixture server; never forwards authentication or API traffic.
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse,parse_qs,urlencode
import argparse,os,re
parser=argparse.ArgumentParser(description='Loopback-only synthetic product UI; no API proxy.')
parser.add_argument('--port',type=int,default=8947)
args=parser.parse_args()
root=Path(os.environ.get('DUCKY_QA_REPO',Path(__file__).resolve().parents[2])).resolve()
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  u=urlparse(self.path)
  if u.path=='/qa-device':
   q=parse_qs(u.query);width=int(q.get('width',['390'])[0]);height=int(q.get('height',['700'])[0])
   if width not in (320,390,1440) or height not in (600,700,900):self.send_error(400);return
   target='/qa-frame?'+urlencode({k:v[0] for k,v in q.items() if k not in ('width','height')})
   raw=('<!doctype html><title>Synthetic device QA</title><style>body{margin:0;background:#777}iframe{border:0;display:block}</style><iframe title="Synthetic Ducky viewport" width="'+str(width)+'" height="'+str(height)+'" src="'+target.replace('&','&amp;')+'"></iframe>').encode()
   self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw);return
  if u.path=='/qa-frame':
   lang='en' if parse_qs(u.query).get('lang')==['en'] else 'zh'
   value=(root/'dist'/lang/'app/index.html').read_text()
   value=re.sub(r'<script\b(?![^>]*type="application/json")[^>]*>[\s\S]*?</script>','',value)
   value=value.replace('</body>','<script src="/vendor/lightweight-charts/lightweight-charts.standalone.production.js"></script><script type="module" src="/tests/fixtures/product-focus-browser.js"></script></body>')
   raw=value.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw);return
  super().do_GET()
 def translate_path(self,path):
  p=urlparse(path).path
  base=root if p.startswith('/tests/fixtures/') else root/'public' if p.startswith('/js/app/') else root/'dist'
  target=(base/p.lstrip('/')).resolve()
  return str(target if target.is_relative_to(base) else base/'missing')
 def log_message(self,*args):pass
ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
