import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {opinionFixture,opinionsFixture} from './fixtures/qa-creator-opinions.js';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/',pretendToBeVisual:true});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {validOpinions,sourceURL,opinionRow,mountCreatorOpinions}=await import('../public/js/app/creator-opinions.js');
const {mountCreatorMacro}=await import('../public/js/app/today-creators.js');
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
function setup(reply=()=>opinionsFixture()){
 store.bumpEpoch();store.set('token','synthetic-token');store.set('me',{user_id:1,tier:'pro'});
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});const result=await reply(new URL(url,'https://ducky.test'),options);return result instanceof Response?result:json(result);};
 const host=document.createElement('main');document.body.append(host);
 return {host,calls,close(mounted){mounted?.dispose();host.remove();}};
}

test('public shape retains source clocks, no-ticker macro, exact qualifications and opposing views',()=>{
 const doc=opinionsFixture();assert.ok(validOpinions(doc));assert.ok(validOpinions(opinionsFixture({topic:'macro'}),{topic:'macro'}));
 const before=JSON.stringify(doc),macro=opinionRow(doc.items[0]);
 assert.match(macro.textContent,/If funding costs decline/);assert.match(macro.textContent,/Next quarter/);
 assert.match(macro.textContent,/2 original records/);assert.match(macro.textContent,/Sep 22, 2026/);
 assert.match(macro.textContent,/not independent corroboration/);assert.equal(macro.querySelector('.opinion-subject a'),null);
 assert.equal(macro.querySelector('.opinion-original').href,'https://www.youtube.com/watch?v=sample00001&t=32s');
 assert.match(macro.querySelector('.opinion-original').textContent,/about 0:32/);
 assert.match(opinionRow(doc.items[1]).className,/is-bear/);assert.match(opinionRow(doc.items[1]).textContent,/Bearish/);
 assert.match(opinionRow(doc.items[2],{from:'today'}).querySelector('.opinion-subject a').href,/#\/stock\/NVDA\?from=today/);
 assert.equal(JSON.stringify(doc),before);
});

test('ticker identity styles only the structured symbol, leaving stance and complete prose independent',()=>{
 const source=opinionsFixture().items[2];
 for(const stance of ['bull','bear','neutral']){
  const row=opinionRow({...source,stance}),symbol=row.querySelector('.ticker-symbol');
  assert.equal(symbol.textContent,'NVDA');assert.equal(symbol.children.length,0);
  assert.equal(row.querySelectorAll('.ticker-symbol').length,1);assert.match(symbol.closest('a').href,/#\/stock\/NVDA/);
  assert.equal(row.querySelector('.opinion-stance').closest('.ticker-symbol'),null);
  assert.equal(row.querySelector('.opinion-claim').closest('.ticker-symbol'),null);
  assert.equal(row.querySelector('.opinion-claim').textContent,source.claim.en);assert.ok(row.classList.contains('is-'+stance));
  assert.ok(row.querySelector('.opinion-stance').classList.contains('is-'+stance));
 }
 assert.equal(opinionRow(opinionsFixture().items[0]).querySelector('.ticker-symbol'),null);
});

test('unknown timing has no invented timestamp; zero seconds remains a valid approximate entry',()=>{
 const none=opinionFixture(1,{navigation_seconds:null,original_source_url:'https://www.youtube.com/watch?v=sample00001'});
 assert.equal(sourceURL(none),'https://www.youtube.com/watch?v=sample00001');assert.equal(opinionRow(none).querySelector('.opinion-original').textContent,'Open original video');
 const zero=opinionFixture(2,{navigation_seconds:0,original_source_url:'https://www.youtube.com/watch?v=sample00002&t=0s'});
 assert.match(opinionRow(zero).textContent,/about 0:00/);
 assert.equal(sourceURL({...zero,original_source_url:'javascript:alert(1)'}),null);
 for(const seconds of [undefined,-1,NaN,Infinity,'32'])assert.equal(sourceURL({...zero,navigation_seconds:seconds}),null);
});

test('malformed or mismatched current fields never turn into a plausible view',()=>{
 for(const patch of [{ticker:'NVDA'},{stock_navigation_eligible:true},{conditions:'dropped condition'},{stance:'popular'},{intent:'trade'},
   {capability:'reviewed_transcript'},{support_eligible:true},{original_source_url:'https://other.example/x'},{published_at:'2026-09-28'},{records:[]}]){
   const doc=opinionsFixture({items:[opinionFixture(1,patch)]});assert.equal(validOpinions(doc),false,JSON.stringify(patch));
 }
 assert.equal(validOpinions(opinionsFixture({topic:'macro'}),{ticker:'NVDA'}),false);
 assert.equal(validOpinions({...opinionsFixture(),status:'unavailable'}),false);
});

test('authenticated discovery reads require no follows; refresh preserves focus and source disclosures',async()=>{
 let revision='a'.repeat(64),generation='2026-09-29T05:02:00Z';
 const f=setup(url=>({...opinionsFixture({topic:url.searchParams.get('topic')}),revision,generated_at:generation}));
 const mounted=mountCreatorOpinions(f.host,{topic:'macro',from:'today',initial:2});await mounted.ready;
 assert.equal(f.calls.length,1);assert.match(f.calls[0].url,/\/kol\/opinions\?topic=macro&scope=discover/);assert.equal(f.calls[0].options.method,'GET');
 assert.equal(f.host.querySelectorAll('.creator-opinion').length,2);
 const detail=f.host.querySelector('.opinion-records');detail.open=true;detail.querySelector('summary').focus();
 revision='b'.repeat(64);generation='2026-09-29T05:03:00Z';await mounted.refresh();
 assert.equal(f.host.querySelector('.opinion-records').open,true);assert.match(document.activeElement.dataset.readingKey,/records-toggle/);
 assert.equal(f.host.querySelector('.creator-opinions').dataset.revision,revision);f.close(mounted);
});

test('successful empty revision retracts old rows; network failure retains a labelled previous version',async()=>{
 let response=opinionsFixture();const f=setup(()=>response),mounted=mountCreatorOpinions(f.host);await mounted.ready;
 const old=f.host.querySelector('.opinion-claim').textContent;
 response=json({error:'temporarily_unavailable'},503);await mounted.refresh();
 assert.equal(f.host.querySelector('.opinion-claim').textContent,old);assert.match(f.host.textContent,/previous version/);
 response={...opinionsFixture({items:[],revision:'b'.repeat(64)}),generated_at:'2026-09-29T05:03:00Z'};await mounted.refresh();
 assert.equal(f.host.querySelectorAll('.creator-opinion').length,0);assert.match(f.host.textContent,/No reviewed video/);f.close(mounted);
});

test('denial removes old content and late account/disposed responses cannot reintroduce it',async()=>{
 let response=opinionsFixture(),resolve;const f=setup(()=>response),mounted=mountCreatorOpinions(f.host);await mounted.ready;
 response=json({error:'forbidden'},403);await mounted.refresh();assert.equal(f.host.querySelector('.creator-opinion'),null);
 response=new Promise(r=>resolve=r);const pending=mounted.refresh();store.bumpEpoch();store.set('token','next-account');resolve(opinionsFixture());await pending;
 assert.equal(f.host.textContent,'');f.close(mounted);
 const g=setup(()=>new Promise(r=>resolve=r)),second=mountCreatorOpinions(g.host);second.dispose();resolve(opinionsFixture());await second.ready;
 assert.equal(g.host.querySelector('.creator-opinion'),null);g.close(second);
});

test('first-read unavailable is a retryable read failure, never an empty successful result',async()=>{
 const f=setup(()=>json({error:'unavailable'},503)),mounted=mountCreatorOpinions(f.host);await mounted.ready;
 assert.match(f.host.textContent,/Video views are unavailable/);assert.doesNotMatch(f.host.textContent,/No reviewed video/);
 assert.ok([...f.host.querySelectorAll('button')].some(n=>n.textContent==='Retry'));f.close(mounted);
});

test('an older response cannot replace a newer edition read elsewhere in the account',async()=>{
 let response=opinionsFixture(),resolve;const f=setup(()=>response),one=mountCreatorOpinions(f.host);await one.ready;
 response=new Promise(r=>resolve=r);const pending=one.refresh();
 const secondHost=document.createElement('main');document.body.append(secondHost);
 response={...opinionsFixture({revision:'b'.repeat(64)}),generated_at:'2026-09-29T05:03:00Z'};
 const two=mountCreatorOpinions(secondHost);await two.ready;
 resolve(opinionsFixture());await pending;
 assert.equal(secondHost.querySelector('.creator-opinions').dataset.revision,'b'.repeat(64));assert.match(f.host.textContent,/previous version/);
 two.dispose();secondHost.remove();f.close(one);
});

test('legacy transcript summaries survive native withdrawal and failure without restoring stale native aggregates',async()=>{
 const now=new Date().toISOString();
 const feed={posts:['native_video','transcript'].map((kind,i)=>({id:i+1,platform_post_id:'sample00001',kol_name:'Sample',title:kind,url:'https://www.youtube.com/watch?v=sample00001',published_at:now,macro:true,tickers:[],take:'neutral',summary:JSON.stringify({en:kind+' original summary',zh:'概要',source:{kind,status:'ready'}})}))};
 let outcome=opinionsFixture({topic:'macro'});
 const f=setup(url=>url.pathname==='/kol/feed'?feed:outcome),legacy=document.createElement('div');f.host.append(legacy);
 const mounted=mountCreatorMacro(legacy,{nativePoints:true});await mounted.ready;
 const native=document.createElement('div');f.host.append(native);const points=mountCreatorOpinions(native,{topic:'macro'});await points.ready;
 assert.equal(legacy.querySelectorAll('li').length,1);assert.match(legacy.textContent,/transcript original summary/);
 outcome={...opinionsFixture({items:[],revision:'b'.repeat(64)}),generated_at:'2026-09-29T05:03:00Z'};await points.refresh();
 assert.equal(native.querySelectorAll('.creator-opinion').length,0);assert.doesNotMatch(legacy.textContent,/native_video original summary/);
 outcome=json({error:'unavailable'},503);await points.refresh();assert.match(legacy.textContent,/transcript original summary/);
 points.dispose();f.close(mounted);
});

test('visible refresh pauses hidden/offline/disposed reads and resumes without inference',async()=>{
 const realSet=globalThis.setInterval,realClear=globalThis.clearInterval;let tick,cleared=false,hidden=false,online=true;
 Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>hidden?'hidden':'visible'});
 Object.defineProperty(window.navigator,'onLine',{configurable:true,get:()=>online});
 globalThis.setInterval=(fn,ms)=>{assert.equal(ms,30000);tick=fn;return {unref(){}};};globalThis.clearInterval=()=>{cleared=true;};
 const f=setup(),mounted=mountCreatorOpinions(f.host);await mounted.ready;
 hidden=true;tick();await flush();assert.equal(f.calls.length,1);
 hidden=false;online=false;tick();await flush();assert.equal(f.calls.length,1);
 online=true;tick();await flush();assert.equal(f.calls.length,2);
 mounted.dispose();tick();await flush();assert.equal(f.calls.length,2);assert.ok(cleared);f.close(mounted);
 globalThis.setInterval=realSet;globalThis.clearInterval=realClear;
});

test('paging is explicit and a changed cursor edition reloads current rows before accepting more',async()=>{
 const first=opinionsFixture({items:[opinionFixture(1)]});first.next_cursor='cursor-first';let calls=0;
 const f=setup(url=>{calls++;if(url.searchParams.has('before'))return json({error:'invalid_opinion_cursor'},400);
   return calls===1?first:{...opinionsFixture({items:[opinionFixture(2)],revision:'b'.repeat(64)}),generated_at:'2026-09-29T05:03:00Z'};});
 const mounted=mountCreatorOpinions(f.host,{initial:1});await mounted.ready;
 assert.equal(f.calls.length,1);
 // Even a one-item first page must expose a server cursor.
 const button=f.host.querySelector('.opinions-more');assert.equal(button.hidden,false);
 button.click();await flush();assert.ok(f.calls.some(c=>c.url.includes('before=cursor-first')));
 assert.equal(f.host.querySelectorAll('.creator-opinion').length,1);assert.equal(f.host.querySelector('.creator-opinion').dataset.opinionId,'sample-opinion-2');f.close(mounted);
});
