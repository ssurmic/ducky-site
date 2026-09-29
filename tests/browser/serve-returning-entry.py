"""Loopback-only returning-session UI fixture. Never proxies production traffic."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8950)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/config.js':
            return self.send_bytes(b'window.DUCKY={API_BASE:"/qa-api",PRODUCT_FOCUS_ENABLED:true,BILLING_ENABLED:false};', 'application/javascript')
        if path.endswith('/') or path.endswith('.html'):
            target = Path(self.translate_path(self.path))
            if target.is_dir():
                target /= 'index.html'
            if target.is_file():
                body = target.read_text().replace('<head>', '<head><script src="/tests/fixtures/returning-entry-browser.js"></script>', 1)
                return self.send_bytes(body.encode(), 'text/html; charset=utf-8')
        super().do_GET()

    def send_bytes(self, body, mime):
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def translate_path(self, path):
        path = urlparse(path).path
        base = root if path.startswith('/tests/fixtures/') else root / 'dist'
        target = (base / path.lstrip('/')).resolve()
        return str(target if target.is_relative_to(base) else base / 'missing')

    def log_message(self, *args):
        pass

ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
