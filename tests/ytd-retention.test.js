import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

for(const lang of ['en','zh'])test(`saved YTD uses ${lang} copy, original dates and a usable zero`,()=>{
 const run=spawnSync(process.execPath,['--input-type=module','-e',`
  import {JSDOM} from 'jsdom';
  import {readFileSync} from 'node:fs';
  const dom=new JSDOM('<html data-lang="${lang}"><body></body></html>',{url:'https://ducky.test/'});
  for(const k of ['window','document','Node'])globalThis[k]=dom.window[k];
  const copy=JSON.parse(readFileSync('i18n/${lang}.json'));
  const strings=document.createElement('script');strings.id='ducky-strings';
  strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
  const {metricCell,metricMethods}=await import('./public/js/app/watchlist-metrics.js');
  const ytd={value:0,status:'retained',reason:'empty_close_update',as_of:'2026-09-10',start:'2025-12-31',recorded_at:'2026-09-10T23:00:00.000000+00:00'};
  console.log(JSON.stringify({cell:metricCell('ytd',ytd).textContent,details:metricMethods([{ticker:'NVDA',metrics:{ytd}}]).textContent}));
 `],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const rendered=JSON.parse(run.stdout);
 assert.match(rendered.cell,/0.0%/);
 assert.match(rendered.cell,lang==='zh'?/上次计算 · 2026-09-10/:/Last saved calculation · 2026-09-10/);
 assert.match(rendered.details,/2026-09-10 23:00:00 UTC/);
 assert.match(rendered.details,lang==='zh'?/最新收盘数据暂缺/:/latest close update is unavailable/);
 assert.doesNotMatch(run.stderr,/Missing translation/);
});
