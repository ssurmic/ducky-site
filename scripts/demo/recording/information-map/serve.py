"""Private, read-only storyboard assets. Never deploy this directory.

python3 scripts/demo/recording/information-map/serve.py [--port 8807]
Only exact listed paths are served; no app APIs, credentials or repo browsing.
"""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import mimetypes
from pathlib import Path
from urllib.parse import urlsplit

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CASES = ROOT / "reports/demo-case-review-20260908"
FILES = {
    "/": HERE / "index.html",
    "/stage.js": HERE / "stage.js",
    "/stage.css": HERE / "stage.css",
    "/manifest.json": ROOT / "scripts/demo/voiceover-2026-09-08-information-map-draft.json",
    "/coin.json": CASES / "coin-20260808-price-window-20260908.json",
    "/avatar.jpg": ROOT / "public/avatar-group.jpg",
    "/frames/avgo.png": CASES / "screenshots/avgo-ready-zh.png",
    "/frames/coin-map.png": CASES / "screenshots/coin-map-stage-prep-zh.png",
    "/frames/coin-source.png": CASES / "screenshots/coin-creator-source-zh.png",
    "/frames/overview.png": CASES / "screenshots/avgo-refresh-retains-analysis-en.png",
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = FILES.get(urlsplit(self.path).path)
        if not path or not path.is_file():
            self.send_error(404)
            return
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(path)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        self.send_header("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        self.send_error(405)

    do_PUT = do_PATCH = do_DELETE = do_POST

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8807)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Private storyboard: http://127.0.0.1:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
