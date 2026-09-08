"""Serve only the selected local draft media. No account/API/model access."""
import argparse
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

p = argparse.ArgumentParser()
p.add_argument('artifacts', type=Path)
p.add_argument('--port', type=int, default=8808)
a = p.parse_args()
render = a.artifacts/'render'
report = json.loads((render/'render-report.json').read_text())
manifest = {lang:{'duration':v['seconds_without_aac_padding'],
    'chapters':[{'at':s['start'],'name':s['scene']} for s in v['timeline']]}
    for lang,v in report['videos'].items()}
html = '''<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ducky · INTC 实景草稿</title><style>
*{box-sizing:border-box}body{margin:0;background:#090e15;color:#eef2f7;font:16px system-ui,sans-serif}main{max-width:1100px;margin:32px auto;padding:0 22px}h1{font-size:28px;margin-bottom:12px}p{color:#aebdc9;line-height:1.6}button{border:1px solid #394956;background:#15202b;color:#fff;border-radius:10px;padding:10px 16px;cursor:pointer}button[aria-pressed=true]{background:#ffab2e;color:#091019;border-color:#ffab2e}.controls,.chapters{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}video{width:100%;border:1px solid #344551;border-radius:16px;display:block}a{color:#94cbff}.note{font-size:14px}.chapters button{font-size:13px;padding:8px 11px}
</style><main><h1>INTC：从相关观点到原话</h1><p>自选 → 信息导图 → 博主原话 → 原视频 → 提醒设置 → 日历</p>
<div class="controls"><button id="zh" aria-pressed="true">中文版</button><button id="en" aria-pressed="false">English</button><span id="duration"></span></div>
<video id="video" controls playsinline preload="metadata" src="/zh.mp4"></video><div class="chapters" id="chapters"></div>
<p class="note">可审阅草稿，官网原片未替换。由真实页面画面剪辑；历史补录不表示当时即时抓取。提醒条件未启用，Telegram 尚未关联，本次没有发送外部通知。</p>
<p class="note">博主表示当时继续持有英特尔，不代表现在仍持有或对后续收益的承诺。<a href="https://www.youtube.com/watch?v=CEGiQA6CNd4&t=246s" target="_blank" rel="noreferrer">打开原视频 4:06 ↗</a></p>
</main><script>
const data=MANIFEST;const video=document.getElementById('video');
const titles={zh:['从自选出发','信息导图','博主观点','原视频','提醒条件','接收方式','日历','开始'],en:['Watchlist','Information Map','Creator view','Original source','Alert condition','Delivery settings','Calendar','Start']};
function change(lang){video.pause();video.src='/'+lang+'.mp4';video.load();document.getElementById('duration').textContent=data[lang].duration.toFixed(2)+' s';for(const l of ['zh','en'])document.getElementById(l).setAttribute('aria-pressed',String(l===lang));const box=document.getElementById('chapters');box.replaceChildren();data[lang].chapters.forEach((c,i)=>{const b=document.createElement('button');b.textContent=c.at.toFixed(1)+'s · '+titles[lang][i];b.onclick=()=>{const seek=()=>{video.currentTime=c.at;video.pause()};if(video.readyState===0){video.addEventListener('loadedmetadata',seek,{once:true});video.load()}else seek()};box.append(b)})}
document.getElementById('zh').onclick=()=>change('zh');document.getElementById('en').onclick=()=>change('en');change('zh');
</script></html>'''.replace('MANIFEST',json.dumps(manifest,ensure_ascii=False)).encode()
routes={f'/{lang}.mp4':render/f'ducky-intc-draft.{lang}.mp4' for lang in ['zh','en']}
routes.update({f'/{lang}.{sub}.vtt':render/f'ducky-intc-draft.{lang}.{sub}.vtt' for lang in ['zh','en'] for sub in ['zh','en']})

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.respond(False)
    def do_HEAD(self):
        self.respond(True)
    def do_POST(self):
        self.send_error(405)
    do_PUT=do_POST
    do_DELETE=do_POST
    def respond(self,head):
        path=urlsplit(self.path).path
        if path=='/':
            self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(html)));self.end_headers()
            if not head:self.wfile.write(html)
            return
        if path not in routes:
            self.send_error(404);return
        file=routes[path];size=file.stat().st_size;start,end=0,size-1
        range_header=self.headers.get('Range')
        if range_header:
            try:
                unit,value=range_header.split('=',1);first,last=value.split('-',1)
                if unit!='bytes' or not first:raise ValueError()
                start=int(first);end=min(int(last),end) if last else end
                if not 0<=start<=end<size:raise ValueError()
            except ValueError:
                self.send_error(416);return
        self.send_response(206 if range_header else 200)
        self.send_header('Content-Type',mimetypes.guess_type(file.name)[0] or 'application/octet-stream')
        self.send_header('Accept-Ranges','bytes');self.send_header('Content-Length',str(end-start+1))
        if range_header:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers()
        if not head:
            try:
                with file.open('rb') as stream:
                    stream.seek(start);left=end-start+1
                    while left:
                        data=stream.read(min(65536,left));self.wfile.write(data);left-=len(data)
            except (BrokenPipeError,ConnectionResetError):pass
    def log_message(self,*args):
        pass

print(f'Private review: http://127.0.0.1:{a.port}/',flush=True)
ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
