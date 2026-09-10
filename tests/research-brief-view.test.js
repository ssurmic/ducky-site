import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom = new JSDOM('<main class="app-main"><div id="view"></div></main>',{url:'https://ducky.test/en/app/#/research-brief'});
for (const key of ['window','document','Node','location','history']) globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=fn=>fn();
document.documentElement.dataset.lang='en';document.documentElement.lang='en';
window.DUCKY={API_BASE:'',BILLING_ENABLED:false,RESEARCH_BRIEF_ENABLED:true};
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount}=await import('../public/js/app/views/research-brief.js');
const router=await import('../public/js/app/router.js');
const {safeTarget}=await import('../public/js/app/login-target.js');
const pause=()=>new Promise(r=>setTimeout(r,10));
const sample=(i=1)=>({id:i,revision_id:i,kol_id:'author',kol_name:'Author',platform_post_id:'video'+i,
 title:'A saved source',published_at:new Date().toISOString().slice(0,10),
 url:'https://www.youtube.com/watch?v=video'+i,calls:[{sym:'AVGO',point_id:'claim:'+i,stance:i%2?'bull':'bear',
 note:'Saved conditional view '+i,evidence:'Original source wording for '+i,start_seconds:0,condition_text:'Only if orders arrive'}]});
const doc=(items,next_cursor=null)=>({schema:'creator-research/3',items,next_cursor,pagination:{scope:'returned_page',has_more:!!next_cursor}});
function setup(){store.bumpEpoch();store.set('me',{user_id:1,tier:'free',access:{billing_enabled:false}});store.set('token','synthetic-test-only');const root=document.getElementById('view');root.replaceChildren();history.replaceState(null,'','#/research-brief');return root;}

test('100 records make exactly two reads, no per-card work; filters and details reuse data',async()=>{
 const root=setup(),calls=[];
 globalThis.fetch=async(url,opts)=>{calls.push([String(url),opts.method]);return Response.json(String(url)==='/watchlist'?{items:[{ticker:'AVGO'}]}:doc(Array.from({length:100},(_,i)=>sample(i))));};
 const cleanup=mount(root);await pause();
 assert.equal(calls.length,2);assert.ok(calls.every(c=>c[1]==='GET'));assert.ok(calls.some(c=>c[0]==='/kol/research?limit=100'));
 assert.equal(root.querySelectorAll('.rb-evidence').length,20);assert.equal(root.querySelectorAll('.rb-results>.rb-evidence').length,3);
 const search=root.querySelector('input[type=search]');search.value='Saved conditional view 91';search.dispatchEvent(new window.Event('input'));
 assert.equal(root.querySelectorAll('.rb-evidence').length,1);assert.equal(calls.length,2);assert.ok(!location.hash.includes('91'));
 root.querySelector('.rb-detail').open=true;assert.equal(calls.length,2);
 assert.equal(root.querySelector('.rb-evidence .rb-actions a').href,'https://www.youtube.com/watch?v=video91&t=0');
 assert.equal(root.querySelector('tbody tr td').textContent,'1');cleanup();assert.equal(document.querySelector('link[href*="research-brief.css"]'),null);
});
test('a failed next page retains successful records, retry keeps its cursor',async()=>{
 const root=setup();let n=0;const paths=[];
 globalThis.fetch=async url=>{paths.push(String(url));if(url==='/watchlist')return Response.json({items:[{ticker:'AVGO'}]});
 n++;return n===1?Response.json(doc([sample(1)],'cursor2')):n===2?new Response('{}',{status:503,headers:{'content-type':'application/json'}}):Response.json(doc([sample(2)]));};
 const cleanup=mount(root);await pause();
 [...root.querySelectorAll('button')].find(b=>b.textContent==='Load next research page').click();await pause();
 assert.equal(root.querySelectorAll('.rb-evidence').length,1);assert.match(root.textContent,/Some research could not be loaded/);
 [...root.querySelectorAll('button')].find(b=>b.textContent==='Retry').click();await pause();
 assert.equal(root.querySelectorAll('.rb-evidence').length,2);assert.equal(paths.filter(p=>p.includes('before=cursor2')).length,2);cleanup();
});
test('unknown watchlist does not produce false personalization or discard all-readable research',async()=>{
 const root=setup();globalThis.fetch=async url=>url==='/watchlist'?new Response('{}',{status:503,headers:{'content-type':'application/json'}}):Response.json(doc([sample()]));
 const cleanup=mount(root);await pause();assert.match(root.textContent,/Your watchlist is unavailable/);
 [...root.querySelectorAll('.rb-scopes button')].find(b=>b.textContent==='All accessible research').click();
 assert.equal(root.querySelectorAll('.rb-evidence').length,1);assert.match(root.textContent,/1 matches/);cleanup();
});
test('malformed data is a visible load failure, never a successful empty market',async()=>{
 const root=setup();globalThis.fetch=async url=>Response.json(url==='/watchlist'?{items:[]}:{schema:'unknown',items:[]});
 const cleanup=mount(root);await pause();assert.match(root.textContent,/Research could not be loaded/);assert.equal(root.querySelector('.rb-empty'),null);cleanup();
});
test('late responses cannot expose a previous account’s research',async()=>{
 const root=setup();let resolve;globalThis.fetch=async url=>url==='/watchlist'?Response.json({items:[{ticker:'AVGO'}]}):await new Promise(r=>{resolve=r;});
 const cleanup=mount(root);await pause();store.bumpEpoch();store.set('me',{user_id:2,tier:'pro'});resolve(Response.json(doc([sample()])));await pause();
 assert.equal(root.querySelector('.rb-evidence'),null);assert.equal(document.querySelector('link[href*="research-brief.css"]'),null);cleanup();
});
test('saved filters and scroll restore on return, with data read again for current source gates',async()=>{
 const root=setup();let calls=0;globalThis.fetch=async url=>{calls++;return Response.json(url==='/watchlist'?{items:[{ticker:'AVGO'}]}:doc([sample()]));};
 let cleanup=mount(root);await pause();const input=root.querySelector('input[type=search]');input.value='conditional';input.dispatchEvent(new window.Event('input'));
 document.querySelector('.app-main').scrollTop=135;cleanup();root.replaceChildren();cleanup=mount(root);await pause();
 assert.equal(root.querySelector('input[type=search]').value,'conditional');assert.equal(document.querySelector('.app-main').scrollTop,135);assert.equal(calls,4);cleanup();
});
test('source text is rendered as text, and preview login return strips unsupported input',async()=>{
 const root=setup();const value=sample();value.calls[0].note='<img src=x onerror=alert(1)>';
 globalThis.fetch=async url=>Response.json(url==='/watchlist'?{items:[{ticker:'AVGO'}]}:doc([value]));
 const cleanup=mount(root);await pause();assert.equal(root.querySelector('.rb-evidence img'),null);assert.ok(root.textContent.includes('<img src=x'));
 assert.equal(router.parse('#/research-brief').name,'research-brief');
 assert.equal(safeTarget('#/research-brief?ticker=AVGO&token=secret&days=all'),'#/research-brief?ticker=AVGO&days=all');cleanup();
});
test('disabled module direct mount performs zero reads and imports no route stylesheet',()=>{
 const root=setup();window.DUCKY.RESEARCH_BRIEF_ENABLED=false;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected');};
 mount(root);assert.equal(calls,0);assert.equal(document.querySelector('link[href*="research-brief.css"]'),null);assert.match(root.textContent,/disabled/);window.DUCKY.RESEARCH_BRIEF_ENABLED=true;
});
test('overview local drill keeps the cursor bound to its original server query',async()=>{
 const root=setup(),requests=[];globalThis.fetch=async url=>{requests.push(String(url));return Response.json(url==='/watchlist'?{items:[{ticker:'AVGO'}]}:doc([sample()],String(url).includes('before=')?null:'all-cursor'));};
 const cleanup=mount(root);await pause();root.querySelector('.rb-overview button').click();
 [...root.querySelectorAll('button')].find(b=>b.textContent==='Load next research page').click();await pause();
 assert.equal(requests.at(-1),'/kol/research?limit=100&before=all-cursor');assert.match(location.hash,/ticker=AVGO/);cleanup();
});
test('returning to a paginated view revalidates previously requested pages before restoring scroll',async()=>{
 const root=setup(),requests=[];globalThis.fetch=async url=>{requests.push(String(url));return Response.json(url==='/watchlist'?{items:[{ticker:'AVGO'}]}:String(url).includes('before=')?doc([sample(2)]):doc([sample(1)],'second'));};
 let cleanup=mount(root);await pause();[...root.querySelectorAll('button')].find(b=>b.textContent==='Load next research page').click();await pause();
 document.querySelector('.app-main').scrollTop=400;cleanup();root.replaceChildren();cleanup=mount(root);await pause();await pause();
 assert.equal(root.querySelectorAll('.rb-evidence').length,2);assert.equal(document.querySelector('.app-main').scrollTop,400);
 assert.equal(requests.filter(p=>p.includes('before=second')).length,2);cleanup();
});
test('keyboard focus survives replacing a load-more button after its final page',async()=>{
 const root=setup();globalThis.fetch=async url=>Response.json(url==='/watchlist'?{items:[{ticker:'AVGO'}]}:String(url).includes('before=')?doc([sample(2)]):doc([sample(1)],'second'));
 const cleanup=mount(root);await pause();const next=[...root.querySelectorAll('button')].find(b=>b.textContent==='Load next research page');
 next.focus();next.click();await pause();assert.notEqual(document.activeElement,document.body);assert.equal(document.activeElement,root.querySelector('.rb-result-count'));cleanup();
});
test('stance colors and stored price movement stay independent, with no per-card request',async()=>{
 const root=setup(),value=sample(2),requests=[];
 value.calls[0].stance='bear';
 value.calls[0].price_context={version:'creator-price-context-v1',price_basis:'unadjusted_ohlc',currency:'USD',
  publication_reference:{status:'ready',d:'2026-09-03',price:100},latest_close:{status:'ready',d:'2026-09-08',price:110},
  since_publication:{status:'ready',ret:10,price_basis:'unadjusted_close'}};
 globalThis.fetch=async url=>{requests.push(String(url));return Response.json(url==='/watchlist'?{items:[{ticker:'AVGO'}]}:doc([value]));};
 const cleanup=mount(root);await pause();const card=root.querySelector('.rb-evidence');
 assert.equal(card.dataset.stance,'bear');assert.match(card.textContent,/Creator: bearish/);
 const prices=[...card.querySelectorAll('.rb-price-value')];assert.deepEqual(prices.map(n=>n.textContent),['$100.00','$110.00','+10.00%']);
 assert.equal(prices[2].dataset.direction,'up');assert.match(card.textContent,/2026-09-03/);assert.match(card.textContent,/2026-09-08/);
 assert.equal(requests.length,2);cleanup();
});
