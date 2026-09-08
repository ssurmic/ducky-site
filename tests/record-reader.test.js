import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="zh"><body></body></html>',{url:'https://ducky.test/app/#/record/s%3A10'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/zh.json')),strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {recordDocument,renderDocument}=await import('../public/js/app/record-format.js');
const {itemRow,archivePath}=await import('../public/js/app/views/boards.js');
const {mount}=await import('../public/js/app/views/record.js');
const {safeTarget}=await import('../public/js/app/login-target.js');
const {parse}=await import('../public/js/app/router.js');
const store=await import('../public/js/app/store.js');
const row={id:'s:10',kind:'digest',ts:'2026-09-07T21:48:00Z',extra:{message_text:'🧭 *向上引力日报* · 2026-09-07\n\n[A] Signals — No support confirmed.\n\n[B] Risk — Loss -3%.',message_en:'🧭 *向上引力日报* · 2026-09-07\n\n[A] Signals — No support confirmed.\n\n[B] Risk — Loss -3%.',message_zh:'🇨🇳 *向上引力日报* · 2026-09-07\n\n[A] 资金 — 暂无确认支撑。\n\n[B] 风险 — 跌幅 -3%。'}};
test('web body has sections, one locale and no Telegram decoration; raw evidence stays intact',()=>{
 const doc=recordDocument(row,'zh'),body=renderDocument(doc);
 assert.equal(doc.title,'向上引力日报');assert.equal(body.querySelectorAll('h2').length,2);
 assert.ok(body.textContent.includes('-3%'));assert.ok(!body.textContent.includes('No support'));
 assert.ok(!/[🇨🇳*]/u.test(body.textContent));
 const card=itemRow(row);assert.equal(card.querySelector('.radar-detail'),null);assert.equal(card.querySelector('a').getAttribute('href'),'#/record/s%3A10');
 const detail=itemRow(row,{standalone:true,language:'zh'});assert.equal(detail.querySelectorAll('h1').length,1);assert.equal(detail.querySelector('.record-original').open,false);
 assert.equal(detail.querySelector('pre').textContent,row.extra.message_zh);
});
test('volatility rows become readable stock sections without invented values or executable HTML',()=>{
 const doc=recordDocument({kind:'volscan',extra:{message_text:'📉 *IV/HV 扫描* · 2026-09-07\n🎯 *AMD* · IV/HV 0.736\n🎯 *TSM* · HV unavailable\n<script>alert(1)</script>'}});
 const body=renderDocument(doc);assert.equal(body.querySelectorAll('h2').length,2);assert.ok(body.textContent.includes('0.736'));assert.ok(body.textContent.includes('unavailable'));assert.equal(body.querySelector('script'),null);
});
test('current reader uses the private endpoint, canonicalizes aliases and switches only the displayed language',async()=>{
 store.set('me',{tier:'pro'});const calls=[];globalThis.fetch=async url=>{calls.push(String(url));return new Response(JSON.stringify({item:row}),{headers:{'content-type':'application/json'}});};
 const root=document.createElement('div');await mount(root,{id:'s:11'});
 assert.ok(calls[0].startsWith('/radar/record.json?'));assert.equal(location.hash,'#/record/s%3A10');
 assert.ok(root.querySelector('.record-prose').textContent.includes('暂无确认支撑'));
 root.querySelector('[data-language=en]').click();assert.ok(root.querySelector('.record-prose').textContent.includes('No support'));assert.ok(!root.querySelector('.record-prose').textContent.includes('暂无确认支撑'));
 assert.equal(root.querySelectorAll('.record-prose').length,1);assert.equal(calls.length,1);
});
test('record login targets keep opaque identity and discard arbitrary query data',()=>{
 assert.equal(safeTarget('#/record/sec%3Aabc-123?token=secret'),'#/record/sec%3Aabc-123');
 assert.equal(parse('#/record/sec%3Aabc-123').params.id,'sec:abc-123');assert.equal(safeTarget('#/record/%00'),null);
 assert.equal(parse('#/boards?board=volscan').name,'reports');
 assert.ok(new URL(archivePath({reports:true,board:'all'}),'https://test').searchParams.get('kind').includes('digest'));
 assert.ok(!new URL(archivePath({board:'all'}),'https://test').searchParams.get('kind').includes('digest'));
});

test('malformed source links remain literal text and do not break a report',()=>{
 const body=renderDocument({blocks:[{text:'Read https://[invalid and https://example.com/source. <img src=x onerror=alert(1)>'}]});
 assert.ok(body.textContent.includes('https://[invalid'));assert.equal(body.querySelector('img'),null);assert.equal(body.querySelectorAll('a').length,1);
});

test('translation truncation is disclosed only for the selected source body',()=>{
 const translated={...row,extra:{...row.extra,translation_message_truncated:true}};
 assert.equal(recordDocument(translated,'zh').truncated,true);assert.ok(!recordDocument(translated,'en').truncated);
});

test('presentation cleanup preserves standalone directional and risk symbols',()=>{
 const doc=recordDocument({kind:'macro',extra:{message_text:'🌊 *宏观* · 2026-09-07\n\nUSD ↑ · breadth ↓ · 🔴 stress'}});
 assert.ok(doc.blocks[0].text.includes('↑'));assert.ok(doc.blocks[0].text.includes('↓'));assert.ok(doc.blocks[0].text.includes('🔴 stress'));
});

test('week range headers and stock section leads retain useful titles',()=>{
 const week=recordDocument({kind:'weekpreview',extra:{message_text:'📅 *本周前瞻 Week Ahead* · 09/07–09/11\n\n【事件 Events】\nJobs data'}});
 assert.equal(week.title,'本周前瞻');assert.ok(!week.lead.includes('📅'));
 const vol=recordDocument({kind:'volscan',extra:{message_text:'📉 *IV/HV 扫描* · 2026-09-07\n🎯 *AMD* · IV/HV 0.736'}});
 assert.ok(vol.lead.startsWith('$AMD'));assert.ok(vol.lead.includes('0.736'));
 const body=recordDocument({kind:'news',summary:'[private reminder reference removed]'});
 assert.ok(!body.lead.includes('private reminder'));
});
