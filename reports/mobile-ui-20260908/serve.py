from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlparse,parse_qs
from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parents[2]
class H(SimpleHTTPRequestHandler):
 def do_POST(self): self.send_error(403, 'Local preview does not accept writes')
 def do_DELETE(self): self.send_error(403, 'Local preview does not accept writes')
 def do_GET(self):
  u=urlparse(self.path);q=parse_qs(u.query)
  if u.path=='/qa':
   route=q.get('route',['login'])[0];case=q.get('case',['data'])[0];lang=q.get('lang',['zh'])[0]; widths=q.get('widths',['320,390'])[0]; height=max(320,min(1000,int(q.get('height',['650'])[0])))
   body='<html><title>Ducky Mobile QA</title><meta charset="utf-8"><script src="/qa-controls.js" defer></script><body style="background:#bbb;margin:0;font:13px monospace"><h3 style="margin:0;font-size:12px">LOCAL UI fixture only · no real accounts/API · '+route+' / '+case+' / '+lang+'</h3><button id="qa-light">Light</button><button id="qa-dark">Dark</button><div style="display:flex;gap:14px;align-items:start">'
   for w,theme in [(int(w),t) for w in widths.split(',') for t in q.get('themes',['light,dark'])[0].split(',')]:
    body+=f'<section><p>{w}px × {height}px / inherited {theme} scheme</p><iframe title="{w} {theme}" style="width:{w}px;height:{height}px;border:1px solid #555;color-scheme:{theme}" src="/qa-frame?route={route}&case={case}&lang={lang}"></iframe></section>'
   body+='</div><pre id="qa-metrics"></pre>'
   if q.get('matrix')==['1']:body+='<script src="/qa-matrix.js" defer></script>'
   body+='</body></html>';self.out(body,'text/html');return
  if u.path=='/qa-frame':
   lang=q.get('lang',['zh'])[0];p=ROOT/'dist'/('en/app/index.html' if lang=='en' else 'app/index.html');body=p.read_text()
   body=re.sub(r'<script(?![^>]*type="application/json")[^>]*>.*?</script>','',body,flags=re.S)
   body=body.replace('</head>','<script src="/vendor/lightweight-charts/lightweight-charts.standalone.production.js"></script><script type="module" src="/qa-main.js"></script></head>')
   self.out(body,'text/html');return
  if u.path=='/qa-controls.js':
   self.out("for(const theme of ['light','dark'])document.getElementById('qa-'+theme).onclick=()=>document.querySelectorAll('iframe').forEach(f=>f.style.colorScheme=theme);setInterval(()=>{document.querySelector('#qa-metrics').textContent=JSON.stringify([...document.querySelectorAll('iframe')].map(f=>({frame:f.title,...JSON.parse(f.contentDocument?.querySelector('#qa-status')?.textContent||'{}')})),null,2)},500);",'text/javascript');return
  if u.path=='/qa-main.js': self.out(Path(__file__).with_name('fixture.js').read_text(),'text/javascript');return
  if u.path=='/qa-matrix.js': self.out(Path(__file__).with_name('matrix.js').read_text(),'text/javascript');return
  if u.path=='/qa-log': self.out('{}','application/json');return
  self.path=u.path;super().do_GET()
 def out(self,b,ct):
  self.send_response(200);self.send_header('Content-Type',ct);self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(b.encode())
 def log_message(self,*args): pass
 def translate_path(self,path):
  p=urlparse(path).path.lstrip('/'); src=ROOT/'public'/p
  return str(src if src.exists() else ROOT/'dist'/p)
ThreadingHTTPServer(('127.0.0.1',8911),H).serve_forever()
