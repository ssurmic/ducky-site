"""Read-only editor preview. Not deployed, and never connected to a user account."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
ROOT = Path(__file__).resolve().parents[3]
class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        mapping = {'/': 'scripts/demo/recording/watchlist-stage.html',
                   '/case.json': 'scripts/demo/evidence/voice-v9/case.json',
                   '/avatar-160.jpg': 'public/avatar-160.jpg'}
        return str(ROOT / mapping.get(urlparse(path).path, 'scripts/demo/recording/nonexistent'))
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *args): pass
if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1',8792),Handler).serve_forever()
