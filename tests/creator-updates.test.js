import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/updates',pretendToBeVisual:true});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
let hidden=false;Object.defineProperty(document,'visibilityState',{get:()=>hidden?'hidden':'visible',configurable:true});
const copy=JSON.parse(readFileSync('i18n/en.json','utf8'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount,sourceURL,updateDate}=await import('../public/js/app/views/updates.js');
const {safeTarget}=await import('../public/js/app/login-target.js');
const api=await import('../public/js/app/api.js');
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
const topic={topic_type:'ticker',topic_key:'INTC',enabled:true,web_push:false,notify_from:'2026-09-06T12:00:00Z'};
const item={id:10,platform:'youtube',video_id:'video-one',creator_id:'channel-one',creator_name:'Research channel',title:'Chip industry update',summary:{en:'Attributed creator summary',zh:'作者摘要'},source_url:'https://www.youtube.com/watch?v=video-one',published_at:'2026-09-04T08:00:00Z',first_ready_at:'2026-09-06T12:00:00Z',created_at:'2026-09-06T12:01:00Z',matched_reasons:[{type:'ticker',key:'INTC',evidence:'Intel is mentioned in the source.',start_seconds:42},{type:'sector',key:'semiconductors',evidence:'Broader chip industry context.'}],read_at:null,mode:'live'};
function setup({tier='pro',topics=[],items=[item],override}={}){
 hidden=false;store.bumpEpoch();store.set('token','test-token');store.set('me',{id:1,tier});
 const calls=[];globalThis.fetch=async(url,options)=>{
  const path=new URL(String(url),'https://ducky.test').pathname;const body=options.body?JSON.parse(options.body):null;calls.push({path,url:String(url),method:options.method,body,options});
  const special=await override?.({path,url:String(url),method:options.method,body});if(special)return special;
  if(path.endsWith('/options'))return json({tickers:[{ticker:'INTC',name:'Intel'}],sectors:[{key:'semiconductors',label_en:'Semiconductors',label_zh:'半导体'}],push_enabled:true});
  if(path.endsWith('/topics')&&options.method==='GET')return json({topics});
  if(path.endsWith('/topics')&&options.method==='PUT')return json({topic:{...body,notify_from:'2026-09-06T12:00:00Z'}});
  if(path.includes('/topics/')&&options.method==='DELETE')return json({ok:true});
  if(path.endsWith('/read'))return json({ok:true});
  if(path.endsWith('/inbox'))return json({items,next_cursor:null,unread_count:items.filter(row=>!row.read_at).length});
  if(/\/inbox\/\d+$/.test(path))return json({item:{...item,id:Number(path.split('/').at(-1)),mode:'demo'}});
  if(path==='/push/config')return json({enabled:true,vapid_public:'BAAA'});
  if(path==='/push/subscribe')return json({subscribed:true});
  throw Error('Unexpected request: '+path);
 };
 const root=document.createElement('main');document.body.append(root);let dispose;
 return {root,calls,async mount(query=''){dispose=await mount(root,{query:new URLSearchParams(query)});return dispose;},close(){dispose?.();root.remove();}};
}
function mockPush(permission='granted'){
 let requests=0,registrations=0,subscriptions=0;
 globalThis.Notification={permission:'default',requestPermission:async()=>{requests++;Notification.permission=permission;return permission;}};window.PushManager=function(){};
 const registration={pushManager:{getSubscription:async()=>null,subscribe:async()=>{subscriptions++;return {toJSON:()=>({endpoint:'https://push.test/owned-endpoint',keys:{p256dh:'public',auth:'test'}})};}}};
 Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:Object.assign(new dom.window.EventTarget(),{register:async()=>{registrations++;return registration;},ready:Promise.resolve(registration)})});
 return {get requests(){return requests;},get registrations(){return registrations;},get subscriptions(){return subscriptions;}};
}


test('saved topics and device settings precede a collapsed watchlist without enabling push',async()=>{
 const tickers=['INTC','NVDA','AMD','MU','TSM','AVGO','AMKR','ON'].map(ticker=>({ticker,name:ticker}));
 const f=setup({topics:[topic,{...topic,topic_type:'sector',topic_key:'semiconductors'}],override:({path})=>path.endsWith('/options')?json({tickers,sectors:[{key:'semiconductors',label_en:'Semiconductors',label_zh:'半导体'}],push_enabled:true}):null});
 const push=mockPush();await f.mount();
 const settings=f.root.querySelector('.updates-settings'),saved=settings.querySelector('.updates-saved'),device=settings.querySelector('.updates-push'),picker=settings.querySelector('.updates-topic-picker');
 assert.equal(settings.firstElementChild,saved);assert.equal(saved.nextElementSibling,device);assert.equal(device.nextElementSibling,picker);
 assert.equal(saved.querySelectorAll('.updates-topic').length,2);assert.ok(saved.textContent.includes('2026-09-06 12:00 UTC'));
 const choices=picker.querySelector('details.updates-watchlist');assert.equal(choices.open,false);assert.match(choices.querySelector('summary').textContent,/From my watchlist.*8/);
 assert.equal(choices.querySelectorAll('[data-topic-choice]').length,8);
 assert.equal(picker.querySelector('[name=updates-ticker]').closest('details'),null);assert.equal(picker.querySelector('[data-sector-choice]').closest('details'),null);
 assert.equal(push.requests,0);assert.equal(f.calls.some(call=>call.method==='PUT'),false);f.close();
});
test('new users can add a topic directly and watchlist disclosure stays open through save and rollback',async()=>{
 let fail=true;const f=setup({override:({method})=>method==='PUT'&&fail?json({error:'unavailable'},503):null});mockPush();await f.mount();
 assert.ok(f.root.querySelector('.updates-settings').firstElementChild.matches('.updates-topic-picker'));
 assert.equal(f.root.querySelector('.updates-watchlist').open,false);
 f.root.querySelector('.updates-watchlist').open=true;
 f.root.querySelector('[data-topic-choice="INTC"]').click();await flush();
 assert.equal(f.root.querySelector('.updates-watchlist').open,true);assert.equal(f.root.querySelector('[data-topic-choice="INTC"]').checked,false);
 fail=false;f.root.querySelector('[data-topic-choice="INTC"]').click();await flush();
 assert.equal(f.root.querySelector('.updates-watchlist').open,true);assert.ok(f.root.querySelector('.updates-settings').firstElementChild.matches('.updates-saved'));
 assert.deepEqual(f.calls.filter(call=>call.method==='PUT').at(-1).body,{topic_type:'ticker',topic_key:'INTC',enabled:true,web_push:false});
 f.root.querySelector('.updates-watchlist').open=false;f.root.querySelector('[data-updates-unread]').click();
 assert.equal(f.root.querySelector('.updates-watchlist').open,false);f.close();
});

test('a labeled notification test requires a separate click and targets only this browser',async()=>{
 const f=setup({override:({path})=>path.endsWith('/test-push')?json({accepted:true}):null});mockPush();await f.mount();
 assert.equal(f.root.querySelector('[data-update-preview]'),null);
 f.root.querySelector('[data-updates-enable-push]').click();await flush();
 assert.equal(f.calls.filter(c=>c.path.endsWith('/test-push')).length,0);
 f.root.querySelector('[data-update-preview]').click();await flush();
 const calls=f.calls.filter(c=>c.path.endsWith('/test-push'));assert.equal(calls.length,1);
 assert.equal(calls[0].path,'/creator-notifications/inbox/10/test-push');
 assert.deepEqual(calls[0].body,{endpoint:'https://push.test/owned-endpoint'});
 assert.ok(f.root.textContent.includes('push service accepted'));assert.ok(f.root.textContent.includes('system settings'));f.close();
});

test('missing server subscription acknowledgement cannot enable device delivery',async()=>{
 const f=setup({override:({path})=>path==='/push/subscribe'?json({ok:true}):null});mockPush();await f.mount();
 f.root.querySelector('[data-updates-enable-push]').click();await flush();
 assert.equal(f.root.querySelector('[data-update-preview]'),null);
 assert.equal(f.root.querySelector('[data-updates-enable-push]').disabled,false);f.close();
});

test('late authenticated responses cannot log out, upsell, or populate a replacement account',async()=>{
 for(const code of [200,401,402]){
  store.bumpEpoch();store.set('token','account-a');let release,unauthorized=0,upsell=0;
  api.setUnauthorizedHandler(()=>unauthorized++);api.setPaymentRequiredHandler(()=>upsell++);
  globalThis.fetch=()=>new Promise(resolve=>release=resolve);
  const response=api.get('/creator-notifications/inbox');
  store.set('token','account-b');release(json({private:'account-a'},code));
  await assert.rejects(response,error=>error.body?.detail==='session_changed');
  assert.equal(unauthorized,0);assert.equal(upsell,0);
 }
 api.setUnauthorizedHandler(null);api.setPaymentRequiredHandler(null);
});
test('free members only load their saved settings and can pause or remove without paying',async()=>{
 const f=setup({tier:'free',topics:[topic]});const push=mockPush();await f.mount();
 assert.deepEqual(f.calls.map(call=>call.path),['/creator-notifications/topics']);assert.equal(f.root.querySelector('.updates-item'),null);
 assert.ok(f.root.querySelector('a[href="#/billing"]'));assert.equal(push.requests,0);
 f.root.querySelector('[data-topic-pause]').click();await flush();
 assert.deepEqual(f.calls.find(call=>call.method==='PUT').body,{topic_type:'ticker',topic_key:'INTC',enabled:false,web_push:false});
 f.root.querySelector('[data-topic-remove]').click();await flush();assert.equal(f.calls.filter(call=>call.method==='DELETE').length,1);
 assert.equal(f.root.querySelector('[data-topic-remove]'),null);f.close();
});
test('Pro inbox preserves source dates, direct vs sector matches and explicit historical replays',async()=>{
 const f=setup();const push=mockPush();await f.mount('item=88&ticker=INTC');
 assert.equal(push.requests,0);assert.equal(push.registrations,0);
 assert.equal(f.root.querySelector('[name=updates-ticker]').value,'INTC');assert.equal(f.calls.some(call=>call.method==='PUT'),false);
 const selected=f.root.querySelector('[data-update-id="88"]');assert.ok(selected.querySelector('details').open);
 assert.ok(selected.textContent.includes('Historical content demo / replay'));assert.ok(selected.textContent.includes('Direct mention: $INTC'));assert.ok(selected.textContent.includes('Industry coverage'));
 assert.ok(selected.textContent.includes('2026-09-04 08:00 UTC'));assert.ok(selected.textContent.includes('2026-09-06 12:00 UTC'));assert.ok(selected.textContent.includes('2026-09-06 12:01 UTC'));
 assert.ok([...selected.querySelectorAll('a')].some(a=>a.getAttribute('href')==='https://www.youtube.com/watch?v=video-one&t=42s'&&a.rel==='noopener noreferrer'));f.close();
});
test('watchlist selection saves only after user input, with push off; failed writes do not persist in UI',async()=>{
 let fail=true;const f=setup({override:({method})=>method==='PUT'&&fail?json({error:'unavailable'},503):null});mockPush();await f.mount();
 f.root.querySelector('[data-topic-choice="INTC"]').click();await flush();
 assert.equal(f.root.querySelector('[data-topic-choice="INTC"]').checked,false);assert.ok(f.root.textContent.includes('not confirmed'));
 fail=false;f.root.querySelector('[data-topic-choice="INTC"]').click();await flush();
 assert.equal(f.root.querySelector('[data-topic-choice="INTC"]').checked,true);
 assert.deepEqual(f.calls.filter(call=>call.method==='PUT').at(-1).body,{topic_type:'ticker',topic_key:'INTC',enabled:true,web_push:false});f.close();
});
test('402 clears private content while preserving cancellation access for saved topics',async()=>{
 let expired=false;const f=setup({topics:[topic],override:({path})=>expired&&path.endsWith('/inbox')?json({error:'pro_required'},402):null});mockPush();await f.mount();
 assert.ok(f.root.querySelector('.updates-item'));expired=true;f.root.querySelector('[data-updates-refresh]').click();await flush();
 assert.equal(f.root.querySelector('.updates-item'),null);assert.ok(f.root.querySelector('[data-topic-pause]'));assert.ok(!f.root.textContent.includes(item.summary.en));f.close();
});
test('read status changes after server success and repeated clicks share one mutation',async()=>{
 let release;const f=setup({override:({path})=>path.endsWith('/read')?new Promise(resolve=>release=()=>resolve(json({ok:true}))):null});mockPush();await f.mount();
 const button=f.root.querySelector('[data-update-read]');button.click();button.click();await flush();
 assert.equal(f.calls.filter(call=>call.path.endsWith('/read')).length,1);assert.equal(f.root.querySelector('.updates-item').dataset.unread,'true');
 release();await flush();assert.equal(f.root.querySelector('.updates-item').dataset.unread,'false');assert.equal(f.root.querySelector('[data-update-read]'),null);f.close();
});
test('denied push permission leaves the inbox available and makes no subscription or test request',async()=>{
 const f=setup({topics:[topic]});const push=mockPush('denied');await f.mount();f.root.querySelector('[data-updates-enable-push]').click();await flush();
 assert.equal(push.requests,1);assert.equal(push.registrations,0);assert.ok(f.root.querySelector('.updates-item'));assert.ok(f.root.textContent.includes('Notifications are blocked'));
 assert.equal(f.calls.some(call=>call.path.startsWith('/push/')),false);f.close();
});
test('explicit browser authorization registers this device but does not enable topic push or send a test',async()=>{
 const f=setup({topics:[topic]});const push=mockPush();await f.mount();f.root.querySelector('[data-updates-enable-push]').click();await flush();
 assert.equal(push.requests,1);assert.equal(push.registrations,1);assert.equal(push.subscriptions,1);
 assert.equal(f.calls.filter(call=>call.path==='/push/subscribe').length,1);assert.equal(f.calls.some(call=>call.path==='/push/test'),false);assert.equal(f.calls.some(call=>call.method==='PUT'),false);
 const topicPush=f.root.querySelector('.updates-topic input');assert.equal(topicPush.disabled,false);assert.equal(topicPush.checked,false);
 topicPush.click();await flush();assert.equal(f.calls.find(call=>call.method==='PUT').body.web_push,true);f.close();
});
test('visibility pauses initial reads; resume is single-flight and unload blocks late results',async()=>{
 let release;const f=setup({override:({path})=>path.endsWith('/inbox')?new Promise(resolve=>release=()=>resolve(json({items:[item],unread_count:1}))):null});mockPush();hidden=true;await f.mount();assert.equal(f.calls.length,0);
 hidden=false;document.dispatchEvent(new dom.window.Event('visibilitychange'));document.dispatchEvent(new dom.window.Event('visibilitychange'));await flush();
 assert.equal(f.calls.filter(call=>call.path.endsWith('/inbox')).length,1);f.close();release();await flush();assert.equal(f.root.querySelector('.updates-item'),null);
});
test('account switches during push permission cannot attach a subscription to the next account',async()=>{
 const f=setup();mockPush();let permission;Notification.requestPermission=()=>new Promise(resolve=>permission=resolve);await f.mount();
 f.root.querySelector('[data-updates-enable-push]').click();store.set('token','different-account');store.set('me',{id:2,tier:'pro'});permission('granted');await flush();
 assert.equal(f.calls.some(call=>call.path.startsWith('/push/')),false);assert.equal(f.root.querySelector('.updates-item'),null);f.close();
});
test('pagination merges repeated ids and direct deep links remain safe through login',async()=>{
 const f=setup({override:({path,url})=>path.endsWith('/inbox')?json({items:url.includes('before_id=')?[item,{...item,id:9}]:[item],next_cursor:url.includes('before_id=')?null:10,unread_count:2}):null});mockPush();await f.mount();
 f.root.querySelector('[data-updates-more]').click();await flush();assert.equal(f.root.querySelectorAll('.updates-item').length,2);
 assert.equal(safeTarget('#/updates?ticker=intc&item=99&token=private'),'#/updates?ticker=INTC&item=99');
 assert.equal(safeTarget('#/updates?item=../../other&ticker=<svg>'),'#/updates');f.close();
});
test('unsafe source content is rendered as text, missing dates stay missing and invalid timestamps have no jump',async()=>{
 const f=setup({items:[{...item,title:'<img src=x onerror=evil()>',source_url:'javascript:alert(1)',first_ready_at:null,matched_reasons:[{type:'ticker',key:'INTC',start_seconds:-10,evidence:'<script>bad</script>'}]}]});mockPush();await f.mount();
 assert.equal(f.root.querySelector('script,img,a[href^="javascript:"]'),null);assert.ok(f.root.textContent.includes('<script>bad</script>'));
 assert.ok(!f.root.textContent.includes('Check the video at -'));assert.equal(updateDate(null),'Time unavailable');assert.equal(sourceURL('https://user:pass@example.com'),null);f.close();
});
test('transcript provenance labels distinguish machine transcription, generated captions and unknown sources',async()=>{
 const f=setup({items:[{...item,transcript_source:{kind:'local_asr',language:'en'}},{...item,id:11,transcript_source:{kind:'youtube_captions',language:'zh',generated:true}},{...item,id:12}]});mockPush();await f.mount();
 assert.ok(f.root.querySelector('[data-update-id="10"]').textContent.includes('Automatic audio transcript · en'));
 assert.ok(f.root.querySelector('[data-update-id="11"]').textContent.includes('YouTube automatic captions · zh'));
 assert.ok(f.root.querySelector('[data-update-id="12"]').textContent.includes('Source not specified'));f.close();
});
test('upgrading while saved-topic management is loading starts the private inbox after that flight settles',async()=>{
 let release,first=true;const f=setup({tier:'free',override:({path,method})=>{if(first&&method==='GET'&&path.endsWith('/topics')){first=false;return new Promise(resolve=>release=()=>resolve(json({topics:[topic]})));}return null;}});mockPush();
 const mounting=f.mount();await flush();store.set('me',{id:1,tier:'pro'});release();await mounting;await flush();
 assert.equal(f.calls.filter(call=>call.path.endsWith('/inbox')).length,1);assert.ok(f.root.querySelector('.updates-item'));f.close();
});
test('entering an already-followed ticker does not reset its existing push preference',async()=>{
 const f=setup({topics:[{...topic,web_push:true}]});mockPush();await f.mount('ticker=INTC');
 f.root.querySelector('.updates-add').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await flush();
 assert.equal(f.calls.some(call=>call.method==='PUT'),false);assert.ok(f.root.textContent.includes('already follow updates for $INTC'));f.close();
});
test('service-worker hints refresh the visible inbox once, reject foreign origins and queue hidden updates',async()=>{
 const f=setup();mockPush();await f.mount();const clock=Date.now;Date.now=()=>clock()+3000;
 try{
  const worker=navigator.serviceWorker,send=origin=>worker.dispatchEvent(new dom.window.MessageEvent('message',{origin,data:{type:'ducky-creator-update'}}));
  const count=()=>f.calls.filter(call=>call.path.endsWith('/inbox')).length;
  send('https://foreign.test');await new Promise(r=>setTimeout(r,5));assert.equal(count(),1);
  hidden=true;send('https://ducky.test');send('https://ducky.test');await new Promise(r=>setTimeout(r,5));assert.equal(count(),1);
  hidden=false;document.dispatchEvent(new dom.window.Event('visibilitychange'));await new Promise(r=>setTimeout(r,5));await flush();assert.equal(count(),2);
  f.close();send('https://ducky.test');await new Promise(r=>setTimeout(r,5));assert.equal(count(),2);
 }finally{Date.now=clock;f.close();}
});
test('a push hint received during an inbox request is coalesced into one follow-up read',async()=>{
 let release,block=false;const f=setup({override:({path})=>block&&path.endsWith('/inbox')?new Promise(resolve=>release=()=>{block=false;resolve(json({items:[item],unread_count:1}));}):null});mockPush();await f.mount();
 block=true;f.root.querySelector('[data-updates-refresh]').click();await flush();
 const worker=navigator.serviceWorker;for(let i=0;i<3;i++)worker.dispatchEvent(new dom.window.MessageEvent('message',{origin:'https://ducky.test',data:{type:'ducky-creator-update'}}));
 assert.equal(f.calls.filter(call=>call.path.endsWith('/inbox')).length,2);release();await flush();
 await new Promise(r=>setTimeout(r,2050));await flush();assert.equal(f.calls.filter(call=>call.path.endsWith('/inbox')).length,3);f.close();
});
