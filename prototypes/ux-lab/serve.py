#!/usr/bin/env python3
"""Serve only the design preview and its explicit assets on loopback."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse

ROOT = Path(__file__).resolve().parents[2]
PREFIX = '/prototypes/ux-lab/'
class PreviewHandler(SimpleHTTPRequestHandler):
    def permitted(self):
        path = unquote(urlsplit(self.path).path)
        target = (ROOT / path.lstrip('/')).resolve()
        if path in ('/', '/prototypes/ux-lab'):
            self.send_response(302)
            self.send_header('Location', PREFIX)
            self.end_headers()
            return False
        permitted = path in ('/i18n/zh.json', '/i18n/en.json', '/public/duck-head-cutout-v1.png')
        permitted = permitted or (target.is_relative_to(ROOT / 'prototypes/ux-lab') and (target == ROOT / 'prototypes/ux-lab' or target.suffix in ('.html','.css','.js')))
        if not target.is_relative_to(ROOT) or not permitted or any(part.startswith('.') for part in Path(path).parts):
            self.send_error(404)
            return False
        return True
    def do_GET(self):
        if self.permitted(): super().do_GET()
    def do_HEAD(self):
        if self.permitted(): super().do_HEAD()
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()
    def list_directory(self, path):
        self.send_error(404)
        return None

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=8765)
    args = parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(PreviewHandler,directory=str(ROOT)))
    print(f'Preview: http://127.0.0.1:{args.port}{PREFIX}#/today',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
