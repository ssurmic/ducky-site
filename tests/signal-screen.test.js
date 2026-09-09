import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/boards'});
for(const k of ['window','document','Node','location','history'])globalThis[k]=dom.window[k];
globalThis.requestAnimationFrame=fn=>fn();
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mountScreen,mountSavedScreens,routePreset,defaults,configSummary}=await import('../public/js/app/views/signal-screen.js');
const response=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setTimeout(r,0));};
const fixture=config=>({status:'ready',config,total:1,unknown_count:1,checked_tickers:3,coverage:{tickers:3},built_at:'2026-09-06T12:00:00Z',
 items:[{ticker:'EX',company:'Example',sector:'Technology',market_cap:2e9,technical:{rsi_d:28,oversold:true,iv_hv:.8},technical_status:'fresh',
   company_as_of:'2026-09-05',snapshot_at:'2026-09-04T20:05:00Z',events:[{kind:'insider',published_at:'2026-09-03',event_date:'2026-08-28',source_url:'https://www.sec.gov/Archives/a',value:400000}]}],
 unknown:[{ticker:'MISSING',reasons:['technical_stale']}]});
function root(){const r=document.createElement('div');document.body.append(r);return r;}
function pro(){store.set('token','fixture');store.set('me',{tier:'pro'});}
function submit(r,selector){r.querySelector(selector).dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));}
test('homepage presets populate explicit same-stock rules without previewing or saving',async()=>{
 pro();const calls=[];globalThis.fetch=async(url,opts)=>{calls.push([String(url),opts.method]);return response(String(url).includes('facets')?{sectors:['Technology']}:{items:[]});};
 const r=root();const dispose=mountScreen(r,{query:new URLSearchParams('screen=insider-oversold')});await flush();
 assert.equal(r.querySelector('details').open,true);assert.equal(r.querySelector('[name=oversold]').checked,true);
 assert.equal(r.querySelector('[name=event_insider]').checked,true);assert.equal(r.querySelector('[name=days]').value,'30');
 assert.equal(calls.some(([url])=>url.includes('/screens/preview')),false);assert.equal(calls.some(([,method])=>method==='POST'),false);
 const institutional=routePreset('institution-oversold');assert.equal(institutional.event_op,'or');assert.equal(institutional.oversold,true);
 assert.deepEqual(institutional.events,['stake','13f']);assert.equal(routePreset('malicious'),null);
 dispose();r.remove();
});
test('preview carries exact conditions and saving is an independent opt-in with full evidence',async()=>{
 pro();const calls=[];let saved=[];
 globalThis.fetch=async(url,opts)=>{url=String(url);calls.push({url,opts});
  if(url.includes('facets'))return response({sectors:['Technology']});
  if(url.endsWith('/screens/preview'))return response(fixture(JSON.parse(opts.body).config));
  if(url.endsWith('/screens')&&opts.method==='POST'){const body=JSON.parse(opts.body);saved=[{id:1,...body}];return response(saved[0]);}
  return response({items:saved});
 };
 const r=root(),dispose=mountScreen(r,{});await flush();
 r.querySelector('[name=scope]').value='watchlist';r.querySelector('[name=sector]').value='Technology';r.querySelector('[name=cap_min]').value='2';
 r.querySelector('[name=oversold]').checked=true;r.querySelector('[name=event_insider]').checked=true;r.querySelector('[name=event_stake]').checked=true;
 submit(r,'.screen-form');await flush();
 const previewCall=calls.find(c=>c.url.endsWith('/screens/preview'));
 const config=JSON.parse(previewCall.opts.body).config;
 assert.equal(config.scope,'watchlist');assert.equal(config.cap_min,2e9);assert.equal(config.event_op,'and');assert.deepEqual(config.events,['insider','stake']);
 assert.equal(r.querySelector('.screen-save').hidden,false);assert.equal(calls.some(c=>c.url.endsWith('/screens')&&c.opts.method==='POST'),false);
 assert.ok(r.textContent.includes('MISSING'));assert.ok(r.textContent.includes('2026-08-28'));assert.ok(r.querySelector('a[href="https://www.sec.gov/Archives/a"]'));
 r.querySelector('[name=screen_name]').value='My exact rule';assert.equal(r.querySelector('[name=screen_notify]').checked,false);
 submit(r,'.screen-save');await flush();
 assert.equal(saved.length,1);assert.equal(saved[0].notify,false);assert.deepEqual(saved[0].config,config);
 dispose();r.remove();
});
test('editing while preview is pending drops late results and cannot save a stale rule',async()=>{
 pro();let finish;globalThis.fetch=async(url,opts)=>String(url).endsWith('/screens/preview')?new Promise(resolve=>finish=()=>resolve(response(fixture(JSON.parse(opts.body).config)))):response({items:[],sectors:[]});
 const r=root(),dispose=mountScreen(r,{});await flush();submit(r,'.screen-form');await flush();
 r.querySelector('[name=rsi_max]').value='15';r.querySelector('[name=rsi_max]').dispatchEvent(new window.Event('input',{bubbles:true}));finish();await flush();
 assert.equal(r.querySelector('.screen-save').hidden,true);assert.equal(r.querySelectorAll('.screen-match').length,0);
 dispose();r.remove();
});
test('official event choices survive saved-rule loading and preview without changing defaults or enabling alerts',async()=>{
 pro();const calls=[],config={...defaults(),scope:'watchlist',events:['index','news'],event_op:'or'};
 globalThis.fetch=async(url,opts)=>{url=String(url);calls.push({url,opts});
  if(url.includes('facets'))return response({sectors:[]});
  if(url.endsWith('/screens/preview'))return response({...fixture(JSON.parse(opts.body).config),coverage:{tickers:3,event_stocks:{index:2,news:3}}});
  return response({items:[{id:9,name:'Official watchlist events',config,notify:false}]});
 };
 const r=root(),dispose=mountScreen(r,{query:new URLSearchParams('screen=9')});await flush();
 try{
  for(const kind of ['index','news']){
   const checkbox=r.querySelector('[name=event_'+kind+']');assert.equal(checkbox.checked,true);
   assert.equal(checkbox.closest('label').textContent,copy['app.screen.event_'+kind]);
   assert.ok(r.querySelector('.screen-save-summary').textContent.includes(copy['app.screen.event_'+kind]));
  }
  const preview=calls.find(c=>c.url.endsWith('/screens/preview'));assert.deepEqual(JSON.parse(preview.opts.body).config,config);
  assert.equal(r.querySelector('[name=screen_notify]').checked,false);
  assert.equal(calls.some(c=>c.url.endsWith('/screens')&&c.opts.method==='POST'),false);
  assert.deepEqual(defaults().events,[]);assert.equal(defaults().event_op,'and');
  assert.ok(r.querySelector('.screen-coverage').textContent.includes('Index changes: 2'));
  assert.ok(r.querySelector('.screen-coverage').textContent.includes('Company news: 3'));
  const zh=JSON.parse(readFileSync('i18n/zh.json'));assert.equal(zh['app.screen.event_index'],'指数调整');assert.equal(zh['app.screen.event_news'],'公司新闻');
 }finally{dispose();r.remove();}
});
test('free preview reads shared research without saving or enabling notifications',async()=>{
 store.set('me',{tier:'free'});store.set('token',null);const calls=[];
 globalThis.fetch=async(url,opts)=>{calls.push(String(url));return response({sectors:[]});};
 const r=root(),dispose=mountScreen(r,{});submit(r,'.screen-form');await flush();
 assert.equal(calls.some(c=>c.includes('/screens/preview')),true);assert.equal(calls.some(c=>c.endsWith('/screens')),false);
 dispose();r.remove();
});
test('saved alerts show the actual delivery state and toggling uses explicit owner action',async()=>{
 pro();const calls=[];let enabled=false;const c={...defaults(),oversold:true,events:['insider']};
 globalThis.fetch=async(url,opts)=>{url=String(url);calls.push({url,opts});
  if(url.endsWith('/screens/hits'))return response({items:[{ticker:'EX',name:'My rule',matched_at:'2026-09-06T12:00:00Z',delivery:'queued',evidence:fixture(c).items[0]}]});
  if(opts.method==='POST'){enabled=JSON.parse(opts.body).notify;return response({notify:enabled});}
  return response({items:[{id:4,name:'My rule',config:c,notify:enabled,last_checked:'2026-09-06T12:00:00Z'}],evaluation_enabled:true});
 };
 const r=root(),dispose=mountSavedScreens(r,{});await flush();
 assert.ok(r.textContent.includes(copy['app.screen.delivery_queued']));assert.equal(calls.some(c=>c.opts.method==='POST'),false);
 [...r.querySelectorAll('button')].find(b=>b.textContent===copy['app.screen.enable']).click();await flush();
 assert.equal(enabled,true);assert.ok(r.textContent.includes(copy['app.screen.pause']));assert.ok(r.querySelector('a[href="#/boards?screen=4"]'));
 dispose();r.remove();
});
test('scope and event time windows remain legible in the saved summary',()=>{
 const c={...defaults(),scope:'watchlist',events:['insider','stake'],days:90,cap_min:2e9,oversold:true};
 const summary=configSummary(c);assert.ok(summary.includes('My watchlist'));assert.ok(summary.includes('90'));assert.ok(summary.includes(' AND '));assert.ok(summary.includes('$2B'));
});

test('saving a Free screen immediately updates its list and quota without navigation',async()=>{
 store.set('token','fixture');store.set('me',{tier:'free'});
 let saved=[];const calls=[];
 globalThis.fetch=async(url,opts)=>{
  url=String(url);calls.push(url);
  if(url.includes('facets'))return response({sectors:[]});
  if(url.endsWith('/screens/preview'))return response(fixture(JSON.parse(opts.body).config));
  if(url.endsWith('/screens/hits'))return response({items:[]});
  if(url.endsWith('/screens')&&opts.method==='POST'){
   saved=[{id:7,...JSON.parse(opts.body)}];return response(saved[0]);
  }
  return response({items:saved,cap:1,active_ids:saved.map(row=>row.id),evaluation_enabled:true});
 };
 const r=root(),editor=mountScreen(r,{}),list=mountSavedScreens(r,{});await flush();
 try{
  assert.ok(r.querySelector('.screen-saved').textContent.includes('0 / 1'));
  submit(r,'.screen-form');await flush();r.querySelector('[name=screen_name]').value='Free test screen';
  submit(r,'.screen-save');await flush();
  assert.equal(saved[0].notify,false);
  const panel=r.querySelector('.screen-saved');
  assert.ok(panel.textContent.includes('1 / 1'));assert.ok(panel.textContent.includes('Free test screen'));
  assert.ok(!panel.textContent.includes(copy['app.screen.saved_empty']));
  assert.ok(r.querySelector('option[value="7"]'));
 }finally{editor();list();}
 const count=calls.length;r.dispatchEvent(new window.Event('ducky:screens-changed'));await flush();
 assert.equal(calls.length,count);r.remove();
});

test('unknown and cancelled delivery render as distinct states without a sent claim',async()=>{
 pro();const config=defaults();
 globalThis.fetch=async(url,opts)=>response(String(url).endsWith('/screens/hits')?
  {items:['unknown','cancelled'].map((delivery,index)=>({ticker:'EX',name:'Rule '+index,matched_at:'2026-09-06T12:00:00Z',delivery,evidence:fixture(config).items[0]}))}:
  {items:[{id:8,name:'My rule',config,notify:false}],evaluation_enabled:true});
 const r=root(),dispose=mountSavedScreens(r,{});await flush();
 try{
  assert.ok(r.textContent.includes(copy['app.screen.delivery_unknown']));
  assert.ok(r.textContent.includes(copy['app.screen.delivery_cancelled']));
  assert.ok(!r.textContent.includes(copy['app.screen.delivery_sent']));
  assert.ok(!r.textContent.includes(copy['app.screen.delivery_queued']));
  assert.ok(!r.textContent.includes('screen.delivery_'));
  const zh=JSON.parse(readFileSync('i18n/zh.json'));
  assert.equal(zh['app.screen.delivery_unknown'],'无法确认投递状态');
  assert.equal(zh['app.screen.delivery_cancelled'],'已取消提醒');
 }finally{dispose();r.remove();}
});
