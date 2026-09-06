import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/briefing'});
for(const k of ['window','document','Node','location','history'])globalThis[k]=dom.window[k];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount,renderBriefing,dateTime}=await import('../public/js/app/views/briefing.js');
const response=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setTimeout(r,0));};
const fixture=()=>({schema:'briefing/1',period:'daily',watchlist_count:4,
 window:{start:'2026-09-05T12:00:00Z',end:'2026-09-06T12:00:00Z'},access:{mode:'current'},
 stock_changes:['EX','TWO','THREE','FOUR'].map(ticker=>({ticker,company:'Company '+ticker,event_count:1,
   latest_at:'2026-09-06T10:00:00Z',history_url:'#/boards?mode=archive&ticker='+ticker+'&start=2026-09-05&end=2026-09-06',
   events:[{kind:'insider',published_at:'2026-09-06T10:00:00Z',event_date:'2026-08-30',value:400000,
            source_url:'https://sec.gov/Archives/'+ticker,observed_at:'2026-09-06T11:00:00Z'}]})),
 creator_access:'available',creator_views:[],upcoming:{items:[],total:0},market:{status:'unavailable'},
 coverage:{facts_status:'ready',facts_as_of:'2026-09-06T11:00:00Z',covered_watchlist_count:4,creator_status:'ready'}});

test('top three stock cards preserve all remaining groups and exact date archive links',()=>{
 const root=renderBriefing(fixture());
 assert.equal(root.querySelectorAll('.briefing-stock').length,4);
 assert.equal(root.querySelector('.briefing-all').open,false);
 assert.equal(root.querySelector('.briefing-all').querySelector('.briefing-stock').dataset.ticker,'FOUR');
 assert.ok([...root.querySelectorAll('a')].some(a=>a.getAttribute('href')==='#/boards?mode=archive&ticker=EX&start=2026-09-05&end=2026-09-06'));
 assert.ok(root.textContent.includes('2026-08-30'));assert.ok(root.textContent.includes('2026-09-06 10:00 UTC'));
 assert.ok(root.textContent.includes('2026-09-06 11:00 UTC'));assert.ok(root.textContent.includes('400,000'));
 assert.ok(root.querySelector('a[href="https://sec.gov/Archives/EX"][rel="noopener noreferrer"]'));
});
test('free historical period and unavailable evidence cannot appear as current or complete',()=>{
 const doc=fixture();doc.access.mode='delayed';doc.creator_access='pro_required';doc.coverage.facts_status='unavailable';
 const root=renderBriefing(doc);
 assert.ok(root.textContent.includes(copy['app.briefing.delayed']));
 assert.ok(root.textContent.includes(copy['app.briefing.facts_unavailable']));
 assert.ok(root.querySelector('a[href="#/billing"]'));assert.ok(root.querySelector('a[href="#/calendar"]'));
});
test('unsafe sources remain plain text and new users get a useful watchlist action',()=>{
 const doc=fixture();doc.watchlist_count=0;doc.stock_changes[0].events[0].source_url='javascript:alert(1)';
 doc.market={topics:[{label_en:'<script>external</script>',summary_en:'<img src=x onerror=alert(1)>',sources:[]}]};
 const root=renderBriefing(doc);
 assert.equal(root.querySelectorAll('a[href^="javascript:"]').length,0);assert.equal(root.querySelectorAll('script,img').length,0);
 assert.ok(root.querySelector('a[href="#/watchlist"]'));assert.ok(root.textContent.includes('<script>external</script>'));
});
test('date-only filings disclose unknown time rather than displaying a fabricated midnight',()=>{
 assert.equal(dateTime('2026-09-05T00:00:00Z','day'),'2026-09-05 · publication time unavailable');
 const doc=fixture();doc.stock_changes[0].events[0].date_precision='day';doc.stock_changes[0].latest_precision='day';
 const root=renderBriefing(doc);assert.ok(root.textContent.includes('publication time unavailable'));
 assert.ok(root.textContent.includes('overlapping calendar dates'));
});
test('weekly mount only reads one private briefing; market and macro remain collapsed without requests',async()=>{
 store.set('me',{tier:'pro'});store.set('token','fixture-token');const calls=[];
 globalThis.fetch=async(url,opts)=>{calls.push({url:String(url),opts});return response(fixture());};
 const root=document.createElement('div');document.body.append(root);
 const dispose=await mount(root,{query:new URLSearchParams('period=weekly')});await flush();
 assert.equal(calls.length,1);assert.equal(calls[0].url,'/briefing?period=weekly');
 assert.equal(calls[0].opts.headers.Authorization,'Bearer fixture-token');
 assert.equal(root.querySelector('nav [aria-current=page]').getAttribute('href'),'#/briefing?period=weekly');
 assert.equal([...root.querySelectorAll('details')].some(detail=>detail.open),false);
 dispose();root.remove();
});
test('late private result is dropped on logout or route cancellation and cleanup removes subscribers',async()=>{
 store.set('me',{tier:'pro'});let finish;
 globalThis.fetch=()=>new Promise(resolve=>finish=()=>resolve(response(fixture())));
 const root=document.createElement('div');const mountTask=mount(root,{});await flush();
 store.bumpEpoch();finish();const dispose=await mountTask;
 assert.equal(root.querySelectorAll('.briefing-stock').length,0);dispose();
 let requests=0;globalThis.fetch=async()=>{requests++;return response(fixture());};
 store.set('watchlist',['EX']);store.set('me',{tier:'free'});await flush();assert.equal(requests,0);
});
