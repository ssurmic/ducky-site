import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="en" data-lang="en"><body><main></main></body></html>',{url:'https://ducky.test/app/#/creators'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const block=document.createElement('script');block.id='ducky-strings';block.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(block);
const {renderCreatorPage,priceChart}=await import('../public/js/app/views/creator-page.js');
const {mount}=await import('../public/js/app/views/creators.js');
const store=await import('../public/js/app/store.js');
const chart={post_id:1,ticker:'NVDA',basis:'published',horizon:5,ret:-10,spy_ret:2,excess:-12,
  published_at:'2026-07-01T12:00:00Z',recorded_at:'2026-09-06T12:00:00Z',
  path:[{d:'2026-07-02',stock:0,spy:0},{d:'2026-07-09',stock:-10,spy:2}]};

test('a historical loss is visible with its basis and inspectable date; missing paths are never invented',()=>{
  const root=document.createElement('section');document.body.append(root);
  renderCreatorPage(root,{creator:{name:'Creator'},page:{chart,coverage:{indexed:3,reviewed:1}}});
  assert.ok(root.textContent.includes('Reconstructed history'));
  assert.ok(root.textContent.includes('-10.0%')&&root.textContent.includes('-12.0%'));
  const range=root.querySelector('input[type=range]');range.value='0';range.dispatchEvent(new window.Event('input'));
  assert.ok(root.querySelector('.creator-chart-readout').textContent.includes('2026-07-02'));
  assert.equal(root.querySelector('details').open,false);
  assert.equal(priceChart({path:[]}),null);root.remove();
  const noPrice=document.createElement('section');renderCreatorPage(noPrice,{creator:{name:'Creator'},page:{coverage:{indexed:3,reviewed:0},activity:[{month:'2026-07',indexed:3,reviewed:0}]}});
  assert.equal(noPrice.querySelector('.creator-price-chart'),null);
  assert.ok(noPrice.textContent.includes('No complete price study'));
});

test('opening a creator renders its preloaded shared page without another fetch or analysis POST',async()=>{
  store.set('me',{tier:'pro'});const requests=[];
  globalThis.fetch=async(url,opts)=>{requests.push([url,opts?.method]);return Response.json(url==='/kol/feed'?{
    kols:[{id:'creator',name:'Creator',profile:{}}],posts:[],pages:{creator:{kol_id:'creator',chart,coverage:{indexed:3,reviewed:1}}}
  }:url==='/me/kols'?{subs:['creator'],analysis:{}}:{items:[]});};
  const root=document.querySelector('main'),dispose=await mount(root);
  const count=requests.length;root.querySelector('.creator-name').click();
  assert.equal(requests.length,count);
  assert.ok(root.querySelector('.creator-price-chart'));
  assert.equal(root.querySelector('.creator-video-archive').open,false);
  assert.equal(root.querySelector('.evidence-page-head').hidden,true);
  assert.ok(requests.every(([,method])=>method==='GET'));
  assert.equal(location.hash,'#/creators?creator=creator');dispose();
});

test('expanded video history fetches that channel and continues beyond the global recent feed',async()=>{
  store.set('me',{tier:'pro'});const requests=[];
  const row=(id,title)=>({id,kol_id:'creator',kol_name:'Creator',title,published_at:'2026-04-01T12:00:00Z',calls:[],tickers:[],
    summary:{quality:'no_call',en:'The creator discusses operating margins.',source:{kind:'transcript',status:'ready',version:'creator-video-v4',summary_reviewed:true}}});
  globalThis.fetch=async(url,opts)=>{requests.push([url,opts.method]);return Response.json(url==='/kol/feed'?{
    kols:[{id:'creator',name:'Creator',profile:{}}],posts:[],pages:{creator:{kol_id:'creator',coverage:{indexed:2,reviewed:2}}}
  }:url==='/me/kols'?{subs:['creator'],analysis:{}}:url==='/kol/creator/history'?{items:[row(2,'First historical video')],next_cursor:2}:
    url==='/kol/creator/history?before=2'?{items:[row(1,'Older than the global feed')],next_cursor:null}:{items:[]});};
  const root=document.querySelector('main');root.textContent='';
  const dispose=await mount(root,{query:new URLSearchParams('creator=creator')});
  assert.ok(!requests.some(([url])=>url.includes('/history')));
  const archive=root.querySelector('.creator-video-archive');archive.open=true;archive.dispatchEvent(new window.Event('toggle'));
  await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
  assert.ok(root.textContent.includes('First historical video'));
  [...root.querySelectorAll('.creator-video-archive button')].find(b=>b.textContent===copy['app.creators.load_more']).click();
  await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
  assert.ok(root.textContent.includes('Older than the global feed'));
  assert.equal(root.querySelectorAll('.cr-post').length,2);
  assert.ok(requests.every(([,method])=>method==='GET'));dispose();
});
