"""Build first, then serve read-only fixtures on loopback. No real API/session."""
import argparse
import functools
import http.server
from pathlib import Path
import re
import shutil
import tempfile

parser=argparse.ArgumentParser()
parser.add_argument('--port',type=int,default=8846)
args=parser.parse_args()
source=Path(__file__).resolve().parent
repo=source.parents[1]
with tempfile.TemporaryDirectory(prefix='ducky-official-qa-') as folder:
    root=Path(folder)
    for name in ['css','js','vendor','avatar-160.jpg','avatar-group.jpg']:
        (root/name).symlink_to(repo/'public'/name)
    for name in ['fixture.js','stage.js','index.html','source.json']:
        shutil.copy2(source/name,root/name)
    for lang in ['zh','en']:
        page=repo/'dist'/('en/app/index.html' if lang=='en' else 'app/index.html')
        html=re.sub(r'<script(?![^>]*type="application/json")[^>]*>.*?</script>','',page.read_text(),flags=re.S)
        (root/(lang+'.html')).write_text(html.replace('</body>','<script type="module" src="/fixture.js"></script></body>'))
    print(f'Read-only UI fixtures: http://127.0.0.1:{args.port}/?lang=en&theme=light&view=watchlist&width=320&caps=close&names=real',flush=True)
    http.server.ThreadingHTTPServer(('127.0.0.1',args.port),functools.partial(http.server.SimpleHTTPRequestHandler,directory=folder)).serve_forever()
