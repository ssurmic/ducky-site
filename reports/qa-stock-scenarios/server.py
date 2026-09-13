"""Local-only QA fixture server; never copied to dist or production.

Run after build.py: python reports/qa-stock-scenarios/server.py
URL: /qa/{light|dark}/{zh|en}/{normal|empty|error|slow|long|missing|stale}/#features
Normal homepage and market data is synthetic and clearly marked. No account writes.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from datetime import datetime, timedelta, timezone
import json
import re
import time

ROOT = Path(__file__).resolve().parents[2] / 'dist'
FIXTURE = 'SYNTHETIC QA FIXTURE / 测试数据'

def now(days=0):
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def reply(self, data, status=200, mime='application/json'):
        if not isinstance(data, bytes):
            data = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        req = urlsplit(self.path)
        auto = re.fullmatch(r'/auto/(light|dark)/(zh|en)/(normal|empty|error|slow|long|missing|stale)/', req.path)
        if auto:
            theme, lang, scenario = auto.groups()
            return self.reply(f'<!doctype html><html><head><title>Automatic {theme} media QA</title><style>html,body{{margin:0;height:100%;overflow:hidden}}iframe{{display:block;border:0;width:100%;height:100%;color-scheme:{theme}}}</style></head><body><iframe title="Automatic theme test" src="/qa/system/{lang}/{scenario}/#features"></iframe></body></html>'.encode(), mime='text/html; charset=utf-8')
        match = re.fullmatch(r'/qa/(light|dark|system)/(zh|en)/(normal|empty|error|slow|long|missing|stale)/', req.path)
        if match:
            theme, lang, scenario = match.groups()
            page = (ROOT / ('en/index.html' if lang == 'en' else 'index.html')).read_text()
            if theme != 'system':
                page = page.replace('<html ', f'<html data-theme="{theme}" ', 1)
            page = page.replace('data-api="https://api.duckybot.app"', f'data-api="/qa-api/{scenario}"')
            page = page.replace('<title>', '<title>LOCAL SYNTHETIC QA — ', 1)
            return self.reply(page.encode(), mime='text/html; charset=utf-8')
        match = re.fullmatch(r'/qa-api/(normal|empty|error|slow|long|missing|stale)/public/(radar/archive|market-preview)\.json', req.path)
        if not match:
            return super().do_GET()
        scenario, endpoint = match.groups()
        ticker = parse_qs(req.query).get('ticker', ['NVDA'])[0]
        if scenario == 'slow':
            time.sleep(12 if ticker == 'NVDA' else 1)
        if scenario == 'error':
            return self.reply({'error': 'synthetic_503'}, status=503)
        if endpoint == 'radar/archive':
            if scenario == 'empty':
                return self.reply({'items': []})
            items = []
            for n in range(3):
                summary = f'{FIXTURE}。{ticker} 合成记录 {n + 1}：公司披露了本季度收入资料，后续表现包含下跌。缺项继续保留。'
                summary_en = f'{FIXTURE}. {ticker} synthetic record {n + 1}: a dated disclosure with later losses retained and missing evidence marked.'
                issuer = ticker + ' QA Company'
                if scenario == 'long':
                    issuer = ticker + 'VeryLongUnbrokenSyntheticCompanyIdentifier' * 5
                    summary += '超长中文摘要用于验证换行和内容裁剪。' * 35
                    summary_en += ' VeryLongUnbrokenSyntheticSummaryWord' * 30
                items.append({'ticker': ticker, 'ts': now(9 + n), 'issuer_name': issuer,
                    'summary': summary, 'provenance': 'INGESTED', 'observed_at': now(8),
                    'extra': {'summary_en': summary_en, 'date_precision': 'day' if n == 1 else 'second'},
                    'source_url': None if scenario == 'missing' else 'https://example.com/synthetic-qa-evidence'})
            return self.reply({'items': items})
        if scenario == 'empty':
            return self.reply({'status': 'unavailable', 'evidence': []})
        return self.reply({'status': 'stale' if scenario == 'stale' else 'ready',
            'observed_at': now(3 if scenario == 'stale' else 0),
            'topics': [{'label_zh': '测试公司财报', 'label_en': 'Synthetic earnings'}],
            'evidence': [{'title': FIXTURE + ('LongUnbrokenSyntheticMarketHeadline' * 14 if scenario == 'long' else ': published event with downside risk'),
                'source_url': None if scenario == 'missing' else 'https://example.com/synthetic-qa-evidence',
                'publisher': 'QA source', 'published_at': now(1)}]})

ThreadingHTTPServer(('127.0.0.1', 8841), Handler).serve_forever()
