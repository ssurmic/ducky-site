import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {activityRecord,activityArchive} from '../public/js/app/radar-activity.js';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/boards'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {activityRow,archivePath,filterRecords,mount}=await import('../public/js/app/views/boards.js');
const store=await import('../public/js/app/store.js');

test('projection retains declared filing totals, unknowns, actual zero and distinct source clocks',()=>{
 const row={id:'sec:test:P',kind:'insider',ticker:'EX',provenance:'BACKFILL',ts:'2026-09-25',observed_at:'2026-09-28',extra:{facts:{side:'buy',total_value:250000,owners:[{name:'A'},{name:'B'}],transactions:[{date:'2026-09-23',value:250000},{date:'2026-09-23',value:250000}]}}};
 const projected=activityRecord(row);assert.equal(projected.metric,250000);assert.equal(projected.actor,'A / B');assert.equal(projected.publishedDate,'2026-09-25');assert.equal(projected.transactionDate,'2026-09-23');
 const card=activityRow(row);assert.match(card.textContent,/\$250,000/);assert.equal(card.querySelector('.radar-record-toggle').getAttribute('href'),'#/record/sec%3Atest%3AP');
 assert.ok([...card.querySelectorAll('a')].some(link=>{const [path,query='']=link.getAttribute('href').split('?');const params=new URLSearchParams(query);return path==='#/stock/EX'&&params.get('from')==='boards'&&params.get('tab')==='evidence';}));
 const missing={...row,extra:{source_published_at:null,facts:{side:'buy'}}};
 assert.equal(activityRecord(missing).publishedDate,null);assert.equal(activityRecord(missing).metric,null);
 assert.equal(activityRow(missing).querySelector('.radar-reported-value>strong').textContent,'—');
 assert.ok(activityRow(missing).textContent.includes(copy['app.radar.publication_unknown']));
 const zero={...row,extra:{facts:{total_value:0}}};assert.equal(activityRecord(zero).metric,0);assert.match(activityRow(zero).querySelector('.radar-reported-value').textContent,/\$0\.00/);
 assert.equal(activityRecord({...row,extra:{facts:{total_value:'250000'}}}).metric,null);
 assert.equal(activityRecord({...row,id:'s:123',provenance:null}).publishedDate,null);
});

test('13F cards show period-end shares without turning absence or options into a stock sale',()=>{
 const row={id:'13f:test',kind:'13f',ticker:'EX',reporter_name:'Example fund',extra:{facts:{position_change:'closed',new_shares:0,prior_shares:1000,report_period:'2026-06-30',filing_date:'2026-08-12'}}};
 const card=activityRow(row);assert.equal(card.querySelector('.radar-reported-value>strong').textContent,'0');assert.match(card.textContent,/2026-06-30/);assert.match(card.textContent,/2026-08-12/);
 assert.ok(card.textContent.includes(copy['app.radar.ux.closed_note']));assert.equal(card.querySelector('.is-sale'),null);
 assert.equal(activityRecord(row).transactionDate,null);
 const option={...row,extra:{facts:{...row.extra.facts,put_call:'CALL'}}};
 assert.equal(activityRecord(option).metric,null);assert.equal(activityRecord(option).priorShares,null);assert.equal(activityRow(option).querySelector('.radar-activity-links'),null);
 const missing={...row,extra:{facts:{report_period:'2026-06-30'}}};assert.equal(activityRow(missing).querySelector('.radar-reported-value>strong').textContent,'—');
});

test('political transaction types and ranges are literal; options are labeled and dates remain separate',()=>{
 const row={id:'house:test',kind:'political',ticker:'EX',extra:{source_published_at:'2026-09-25',facts:{politician:'Example official',amount_range:'$15,001 - $50,000',transaction_date:'2026-09-10',transaction_type:'Exercise',asset_type:'OP',date_review_required:true}}};
 const item=activityRecord(row),card=activityRow(row);assert.equal(item.metric,'$15,001 - $50,000');assert.equal(item.action,'exercise');assert.equal(item.instrument,'option');
 assert.equal(card.querySelector('.radar-reported-value>strong').textContent,'$15,001 - $50,000');assert.match(card.textContent,/2026-09-10/);assert.match(card.textContent,/2026-09-25/);
 assert.ok(card.textContent.includes(copy['app.radar.ux.instrument_option']));assert.ok(card.textContent.includes(copy['app.radar.ux.date_review']));assert.equal(card.querySelector('.radar-activity-links'),null);
});

test('default categories request existing API kinds and retain explicit historical developer access',()=>{
 const kinds=new URL(archivePath({board:'all'}),'https://ducky.test').searchParams.get('kind').split(',');
 assert.deepEqual(kinds,['insider','cluster','13f','political','partner','stake','earnings','index','news']);
 assert.equal(new URL(archivePath({board:'funds'}),'https://ducky.test').searchParams.get('kind'),'13f');
 assert.equal(new URL(archivePath({board:'industry'}),'https://ducky.test').searchParams.get('kind'),'nvdev');
 const rows=[{id:1,kind:'13f',ts:'2026-09-25'},{id:2,kind:'partner',ts:'2026-09-24'},{id:3,kind:'nvdev',ts:'2026-09-23'}];
 assert.deepEqual(filterRecords(rows,{mode:'archive',board:'funds',reports:false}).map(r=>r.id),[1]);
 assert.deepEqual(filterRecords(rows,{mode:'archive',board:'company',reports:false}).map(r=>r.id),[2]);
 assert.deepEqual(filterRecords(rows,{mode:'archive',board:'all',reports:false}).map(r=>r.id),[1,2]);
 assert.deepEqual(filterRecords(rows,{mode:'excerpts',board:'all',reports:false}).map(r=>r.id),[1,2,3]);
 const access={mode:'delayed',delay_days:5};const doc=activityArchive({items:rows,access,next_cursor:'opaque',partial:true});
 assert.equal(doc.access,access);assert.equal(doc.nextCursor,'opaque');assert.equal(doc.partial,true);assert.equal(doc.items.length,2);
});

test('historical industry deep links stay reachable and active filters remain explicit',async()=>{
 store.set('me',{tier:'free'});store.set('route',{name:'boards'});const calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return Response.json({items:[],filter_version:3,sectors:[],sources:[]});};
 const root=document.createElement('section');document.body.append(root);const dispose=await mount(root,{query:new URLSearchParams('mode=archive&board=industry')});
 assert.ok(root.querySelector('[data-board=industry]'));assert.equal(root.querySelector('[data-board=industry]').getAttribute('aria-pressed'),'true');
 assert.ok(calls.some(url=>url.includes('kind=nvdev')));assert.equal(root.querySelector('.radar-active-rule').hidden,true);dispose();root.remove();
 const all=document.createElement('section');document.body.append(all);const cleanup=await mount(all,{query:new URLSearchParams('ticker=EX')});
 assert.equal(all.querySelector('.radar-filter-toggle').getAttribute('aria-expanded'),'false');assert.equal(all.querySelector('[name=ticker]').value,'EX');assert.equal(all.querySelector('.radar-active-rule').hidden,false);
 assert.ok(all.querySelector('.radar-active-rule').textContent.includes('$200,000'));cleanup();all.remove();
});
