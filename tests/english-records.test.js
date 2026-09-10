import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/en/app/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json')),strings=document.createElement('script');
strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {recordDocument,renderDocument}=await import('../public/js/app/record-format.js');
const {itemRow}=await import('../public/js/app/views/boards.js');
const {px}=await import('../public/js/app/ui.js');

test('Chinese-only first-party reports disclose missing English and retain the exact original',()=>{
 const raw='招聘扫描 · 2026-09-10\n\n今日无新增招聘信号。资料覆盖不足，不代表没有招聘活动。';
 for(const row of [{id:'s:1',kind:'hiring',extra:{message_text:raw}},{id:'s:2',kind:'hiring',summary:raw},{id:'s:3',kind:'hiring',extra:{message_zh:raw}}]){
  const doc=recordDocument(row,'en');assert.equal(doc.englishUnavailable,true);
  assert.doesNotMatch(doc.title+doc.lead,/[\u3400-\u9fff]/);assert.match(doc.lead,/English version isn't available/);
  const page=itemRow(row,{standalone:true});assert.match(page.querySelector('.record-prose').textContent,/English version isn't available/);
  assert.doesNotMatch(page.querySelector('.record-prose').textContent,/[\u3400-\u9fff]/);
  assert.equal(page.querySelector('.record-original').open,false);
  assert.equal(page.querySelector('.record-original pre').textContent,raw);
  assert.equal(page.querySelector('.record-original summary').textContent,'Read original (Chinese)');
 }
});

test('existing bilingual report portions retain losses and full raw evidence without on-read translation',()=>{
 const en='Daily research · 2026-09-10\n\n[A] Risk — Price fell 3%. The comparison is incomplete.';
 const zh='每日研究 · 2026-09-10\n\n[A] 风险 — 股价下跌3%。对照资料仍不完整。';
 const raw=en+'\n===CN===\n'+zh;
 const row={kind:'digest',extra:{message_text:raw}};
 const doc=recordDocument(row,'en');assert.equal(doc.englishUnavailable,false);
 assert.match(renderDocument(doc).textContent,/fell 3%.*incomplete/);assert.doesNotMatch(doc.lead,/每日|===CN===/);
 assert.equal(doc.raw,raw);assert.match(recordDocument(row,'zh').lead,/股价下跌3%/);
 const explicit=recordDocument({...row,extra:{message_text:zh,message_en:en}},'en');assert.equal(explicit.englishUnavailable,false);assert.match(explicit.lead,/fell 3%/);
 const absent=recordDocument({kind:'digest',extra:{message_text:'===CN===\n'+zh}},'en');assert.equal(absent.englishUnavailable,true);assert.match(absent.raw,/股价下跌3%/);
});

test('English reports may contain attributed Chinese names and original source-language news stays readable',()=>{
 const english=recordDocument({kind:'digest',extra:{message_text:'Research · 2026-09-10\n\n商浩金 Shanghao Jin discussed Nvidia. His comments do not establish current holdings.'}},'en');
 assert.equal(english.englishUnavailable,false);assert.match(english.lead,/Shanghao Jin/);
 const original=recordDocument({kind:'news',summary:'这是来源原文的中文标题，不是产品生成的英文分析。'},'en');
 assert.equal(original.englishUnavailable,false);assert.match(original.lead,/来源原文/);
});

test('price formatting distinguishes sub-cent prices, actual zero and missing values',()=>{
 assert.equal(px(.0041),'$0.0041');assert.equal(px(.0000108),'$0.0000108');assert.equal(px(-.0041),'$-0.0041');
 assert.equal(px(0),'$0.00');assert.equal(px(43.12),'$43.12');assert.equal(px(1234.56),'$1,235');
 for(const missing of [null,undefined,'',NaN,Infinity,'unavailable'])assert.equal(px(missing),'—');
 assert.notEqual(px(1e-9),'$0.00');assert.match(px(1e-9),/^\$1E-9$/);
});
