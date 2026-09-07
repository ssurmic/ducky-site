"""Read-only editor preview. Not deployed, and never connected to a user account."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
ROOT = Path(__file__).resolve().parents[3]
class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        mapping = {'/': 'scripts/demo/recording/vibe-stage.html',
                   '/case.json': 'scripts/demo/evidence/voice-v9/case.json',
                   '/watch.json': 'scripts/demo/evidence/voice-v10/watchlist-selected.json',
                   '/strings/en.json': 'i18n/en.json', '/strings/zh.json': 'i18n/zh.json',
                   '/app/watchlist-overview.js': 'public/js/app/watchlist-overview.js',
                   '/app/ui.js': 'public/js/app/ui.js', '/app/strings.js': 'public/js/app/strings.js',
                   '/app/store.js': 'public/js/app/store.js',
                   '/reddit.json': 'scripts/demo/evidence/voice-v10/reddit-mu.json',
                   '/avatar-160.jpg': 'public/avatar-160.jpg'}
        return str(ROOT / mapping.get(urlparse(path).path, 'scripts/demo/recording/nonexistent'))
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *args): pass
if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1',8796),Handler).serve_forever()
