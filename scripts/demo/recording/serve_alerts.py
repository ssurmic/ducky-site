"""Read-only localhost editor preview for the v7 alert story; never deployed."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
ROOT = Path(__file__).resolve().parents[3]
class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        mapped = {'/': ROOT / 'scripts/demo/recording/alerts-stage.html',
                  '/case.json': ROOT / 'scripts/demo/evidence/voice-v7/case.json',
                  '/alerts-zh.png': ROOT / 'scripts/demo/frames-v7/raw/alerts-zh.png',
                  '/alerts-en.png': ROOT / 'scripts/demo/frames-v7/raw/alerts-en.png',
                  '/avatar-160.jpg': ROOT / 'public/avatar-160.jpg'}
        return str(mapped.get(urlparse(path).path, ROOT / 'scripts/demo/recording/nonexistent'))
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *args): pass
if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8792), Handler).serve_forever()
