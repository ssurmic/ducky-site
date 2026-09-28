import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="en"><body><main></main><div id="modal"></div></body></html>',{url:'https://test.local/en/app/'});
for(const key of ['window','document','location','history','localStorage','CustomEvent','Event','HTMLElement','Node'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=callback=>setTimeout(callback,0);
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount}=await import('../public/js/app/views/stock.js');
const alerts=await import('../public/js/app/views/alerts.js');
const {stockMetrics}=await import('../public/js/app/stock-metrics.js');
const pause=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setTimeout(r,0));};
function setup(){store.bumpEpoch();store.set('me',{user_id:88,tier:'pro'});store.set('token','synthetic-only');store.set('watchlist',[]);const root=document.querySelector('main');root.replaceChildren();return root;}
const snapshot={ticker:'NVDA',built_at:'2026-09-25T22:00:00Z',snapshot:{ok:true,ticker:'NVDA',spot:225,gamma:{put_wall:215,call_wall:240,scope:{expiries:['2026-10-02']}},retrace:{d20:{lo:210,hi:230}},vol:{iv:31,hv:35,ratio:.89}}};
const research={ticker:'NVDA',price:{ticker:'NVDA',company:'NVIDIA',price:225,price_session:'2026-09-25',metrics:{iv_hv:{status:'ready',value:.89,as_of:'2026-09-25'}}},evidence:{ticker:'NVDA',nodes:[],analysis_status:'pending'}};
test('an unfollowed stock reads real metric and snapshot contracts without writes and keeps entry context',async()=>{
 const root=setup(),requests=[];globalThis.fetch=async(url,options)=>{requests.push([url,options.method]);return Response.json(url.includes('/snapshot/')?snapshot:url.includes('/bars/')?{bars:[]}:research);};
 const dispose=await mount(root,{ticker:'NVDA',query:new URLSearchParams('from=explore&tab=metrics'),returnTo:'#/explore?q=NVDA'});await pause();
 assert.equal(root.querySelector('.stock-metrics-panel').hidden,false);assert.equal(root.querySelector('.stock-overview-panel').hidden,true);
 assert.ok(root.querySelector('a[href="#/explore?q=NVDA"]'));assert.equal(new URLSearchParams(root.querySelector('.stock-plan-actions>a').getAttribute('href').split('?')[1]).get('from'),'explore');assert.match(root.querySelector('.stock-metrics-panel').textContent,/0.89×/);
 const links=[...root.querySelectorAll('.stock-level-alert a')].map(a=>a.getAttribute('href'));assert.ok(links.includes('#/alerts?ticker=NVDA&price=215&direction=below'));assert.ok(links.includes('#/alerts?ticker=NVDA&price=215&direction=above'));
 assert.deepEqual(store.get('watchlist'),[]);assert.ok(requests.every(([,method])=>method==='GET'));assert.equal(requests.filter(([path])=>path.includes('/snapshot/')).length,1);dispose();
});
test('overview does not fetch option snapshots or history; missing values are not zero',async()=>{
 const root=setup(),requests=[];globalThis.fetch=async(url)=>{requests.push(url);return Response.json(url.includes('/bars/')?{bars:[]}:research);};
 const dispose=await mount(root,{ticker:'NVDA'});await pause();assert.ok(!requests.some(path=>path.includes('/snapshot/')||path.includes('/research-changes')));
 const node=stockMetrics('NVDA',{},null);assert.match(node.textContent,/not available/);assert.doesNotMatch(node.querySelector('[data-metric-focus=volatility]').textContent,/0\.0/);assert.equal(node.querySelectorAll('.stock-level-alert').length,0);dispose();
});
test('late option data cannot restore a denied stock or cross an account change',async()=>{
 for(const denied of [true,false]){
  const root=setup();let resolveSnapshot;
  globalThis.fetch=async url=>url.includes('/snapshot/')?new Promise(resolve=>resolveSnapshot=resolve):url.includes('/bars/')?Response.json({bars:[]}):denied?Response.json({error:'forbidden'},{status:403}):Response.json(research);
  const dispose=await mount(root,{ticker:'NVDA',query:new URLSearchParams('tab=metrics')});await pause();if(!denied)store.bumpEpoch();
  resolveSnapshot(Response.json(snapshot));await pause();assert.doesNotMatch(root.querySelector('.stock-metrics-panel').textContent,/\$215/);dispose();
 }
});
test('price-reference links prefill an editable alert with explicit direction and never submit it',async()=>{
 for(const direction of ['above','below']){
  const root=setup(),requests=[];globalThis.fetch=async(url,options)=>{requests.push([url,options.method]);return Response.json({items:[]});};
  const dispose=await alerts.mount(root,{query:new URLSearchParams({ticker:'NVDA',price:'215',direction})});
  assert.match(root.querySelector('textarea').value,new RegExp('at or '+direction+' 215 USD'));assert.ok(requests.every(([,method])=>method==='GET'));dispose();
 }
 const root=setup();globalThis.fetch=async()=>Response.json({items:[]});const dispose=await alerts.mount(root,{query:new URLSearchParams('ticker=NVDA&price=-1&direction=below')});assert.equal(root.querySelector('textarea').value,'');dispose();
});
test('an accepted snapshot remains pending and can be retried without scheduling work',async()=>{
 const root=setup();let reads=0;const methods=[];
 globalThis.fetch=async(url,options)=>{methods.push(options.method);if(url.includes('/snapshot/'))return ++reads===1?Response.json({status:'building'},{status:202}):Response.json(snapshot);return Response.json(url.includes('/bars/')?{bars:[]}:research);};
 const dispose=await mount(root,{ticker:'NVDA',query:new URLSearchParams('tab=metrics')});await pause();
 const panel=root.querySelector('.stock-metrics-panel');assert.match(panel.textContent,/being prepared|loading|Loading|preparing/i);assert.doesNotMatch(panel.textContent,/These price references are not available/);
 const retry=[...panel.querySelectorAll('button')].find(b=>b.textContent==='Retry');assert.ok(retry);retry.click();await pause();assert.equal(reads,2);assert.match(panel.textContent,/\$215/);assert.ok(methods.every(method=>method==='GET'));dispose();
});

test('authoritative stock denial or removal closes a cached source dialog',async()=>{
 const api=await import('../public/js/app/api.js');
 const source={id:'saved-claim',kind:'creator',priority:'direct',stance:'support',title:{en:'Saved source claim'},evidence:[{kind:'creator',author:'Example author',source_url:'https://example.com/source',observed_at:'2026-09-20'}]};
 const cached={...research,evidence:{...research.evidence,nodes:[source]}};
 for(const status of [403,410]){
  const root=setup();globalThis.fetch=async()=>Response.json(cached);await api.get('/stock-research/NVDA');
  let resolveResearch;globalThis.fetch=async url=>url.includes('/bars/')?Response.json({bars:[]}):new Promise(resolve=>resolveResearch=resolve);
  const mounting=mount(root,{ticker:'NVDA'});root.querySelector('.stock-source-card').click();
  assert.equal(document.querySelector('#modal').hidden,false);
  resolveResearch(Response.json({error:status===403?'forbidden':'gone'},{status}));const dispose=await mounting;
  assert.equal(document.querySelector('#modal').hidden,true);assert.doesNotMatch(document.querySelector('#modal').textContent,/Saved source claim/);
  assert.doesNotMatch(root.textContent,/Saved source claim/);dispose();
 }
});

test('recovering stock access releases and fences earlier snapshot reads',async()=>{
 for(const finishEarly of [true,false]){
  const root=setup();let resolveOld,reads=0,denied=true;
  globalThis.fetch=async url=>{
   if(url.includes('/snapshot/')){reads++;return reads===1?new Promise(resolve=>resolveOld=resolve):Response.json(snapshot);}
   return url.includes('/bars/')?Response.json({bars:[]}):denied?Response.json({error:'forbidden'},{status:403}):Response.json(research);
  };
  const dispose=await mount(root,{ticker:'NVDA',query:new URLSearchParams('tab=metrics')});await pause();
  const old={...snapshot,snapshot:{...snapshot.snapshot,gamma:{...snapshot.snapshot.gamma,put_wall:999}}};
  if(finishEarly){resolveOld(Response.json(old));await pause();}
  denied=false;root.querySelector('.stock-metrics-panel button').click();await pause();
  assert.equal(reads,2);assert.match(root.querySelector('.stock-metrics-panel').textContent,/\$215/);
  if(!finishEarly){resolveOld(Response.json(old));await pause();}
  assert.doesNotMatch(root.querySelector('.stock-metrics-panel').textContent,/\$999/);dispose();
 }
});
