"""Read-only, localhost-only editor preview. Never deploy this server."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[3]


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        route = urlparse(path).path
        mapped = {'/': ROOT / 'scripts/demo/recording/story-stage.html',
                  '/story-case.json': ROOT / 'scripts/demo/evidence/voice-v6/story-case.json',
                  '/chart-zh.png': ROOT / 'scripts/demo/frames-v6/raw/chart-zh.png',
                  '/chart-en.png': ROOT / 'scripts/demo/frames-v6/raw/chart-en.png',
                  '/avatar-160.jpg': ROOT / 'public/avatar-160.jpg'}
        return str(mapped.get(route, ROOT / 'scripts/demo/recording/nonexistent'))

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8792), Handler).serve_forever()
