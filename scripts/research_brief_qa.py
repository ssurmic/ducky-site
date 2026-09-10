"""Loopback-only UI fixture server. No production account/API/worker; no writes accepted.

Build first, then open /qa-frame?lang=en&theme=light&route=research-brief.
Use --baseline to serve the frozen pre-change build. All business requests are stubbed.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import argparse
import re
import json

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port',type=int,default=8920)
parser.add_argument('--baseline',action='store_true')
args = parser.parse_args()
DIST = (Path('/tmp/ducky-brief-baseline-20260909') if args.baseline else ROOT / 'dist').resolve()

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()

    def do_POST(self): self.send_error(403)
    do_PUT = do_PATCH = do_DELETE = do_POST

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == '/qa-frame':
            query = parse_qs(url.query)
            lang = 'en' if query.get('lang') == ['en'] else 'zh'
            body = (DIST / ('en/app/index.html' if lang == 'en' else 'app/index.html')).read_text()
            body = re.sub(r'<script(?![^>]*type="application/json")[^>]*>.*?</script>','',body,flags=re.S)
            body = body.replace('</head>', '<script src="/vendor/lightweight-charts/lightweight-charts.standalone.production.js"></script><script type="module" src="/qa-main.js"></script></head>')
            self.out(body,'text/html; charset=utf-8'); return
        if url.path == '/qa-main.js':
            module = (ROOT / 'tests/fixtures/research-brief-browser.js').read_text()
            module = module.replace('/*QA_BASELINE*/false',str(args.baseline).lower())
            version = json.loads((DIST / 'app-release.json').read_text())['version']
            module = module.replace("'/js/app/", "'/app-assets/" + version + '/')
            self.out(module,'text/javascript; charset=utf-8'); return
        if url.path == '/qa-old.js':
            module = (ROOT / 'reports/mobile-ui-20260908/fixture.js').read_text()
            module = module.replace("window.DUCKY={API_BASE:",
                "window.DUCKY={RESEARCH_BRIEF_ENABLED:" + str(not args.baseline).lower() + " && q.get('brief')==='on',API_BASE:")
            module = module.replace('calls:qaCalls,errors:qaErrors',
                "calls:qaCalls,errors:qaErrors,actualTheme:document.documentElement.dataset.theme,resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,duration:r.duration,bytes:r.transferSize}))")
            version = json.loads((DIST / 'app-release.json').read_text())['version']
            module = module.replace("'/js/app/", "'/app-assets/" + version + '/')
            self.out(module,'text/javascript; charset=utf-8');return
        # Root is always a build, not the repository or its private verification files.
        for header in ('If-Modified-Since','If-None-Match'):
            if header in self.headers: del self.headers[header]
        self.path = url.path
        super().do_GET()

    def translate_path(self,path):
        requested = (DIST / urlparse(path).path.lstrip('/')).resolve()
        return str(requested if requested.is_relative_to(DIST) else DIST / 'not-found')

    def out(self,body,content_type):
        self.send_response(200);self.send_header('Content-Type',content_type)
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-src 'self'; object-src 'none'")
        self.end_headers();self.wfile.write(body.encode())

    def log_message(self,*args): pass

print(f'Isolated synthetic UI on http://127.0.0.1:{args.port}/qa-frame',flush=True)
ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
