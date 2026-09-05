import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
const dom = new JSDOM('<main class="app-main"><div id="view"></div></main><div id="modal" hidden></div>', {url:'https://ducky.test/app/'});
for (const k of ['window','document','Node','MutationObserver','location','history']) globalThis[k] = dom.window[k];
globalThis.requestAnimationFrame = f => setTimeout(f,0);
const strings = document.createElement('script'); strings.id='ducky-strings';
const copy=JSON.parse(readFileSync('i18n/en.json')); strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.appendChild(strings);
const store=await import('../public/js/app/store.js');
const router=await import('../public/js/app/router.js');
const boards=await import('../public/js/app/views/boards.js');
const creators=await import('../public/js/app/views/creators.js');
const login=await import('../public/js/app/views/login.js');
const watch=await import('../public/js/app/views/watchlist.js');
const alerts=await import('../public/js/app/views/alerts.js');
const response = body => new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});

test('economic release names preserve distinctions',()=>{
 assert.equal(boards.waMacroLabel('Nonfarm Productivity',true),'非农生产率');
 assert.equal(boards.waMacroLabel('Continuing Jobless Claims',true),'续请失业金');
 assert.equal(boards.waMacroLabel('ADP Nonfarm Employment Change',true),'小非农 ADP');
 assert.equal(boards.waMacroLabel('Nonfarm Payrolls',false),'Nonfarm payrolls');
});
test('legacy/title-only creator views cannot acquire a grounded badge',()=>{
 assert.equal(creators.hasGroundedCalls({summary:'from title',calls:[{stance:'bear'}]}),false);
 assert.equal(creators.hasGroundedCalls({summary:JSON.stringify({quality:'grounded',source:{kind:'metadata'}}),calls:[{evidence:'a long source excerpt'}]}),false);
 assert.equal(creators.hasGroundedCalls({summary:JSON.stringify({quality:'grounded',source:{kind:'transcript'}}),calls:[{evidence:'a long source excerpt'}]}),true);
});
test('email sign-in neither starts nonce polling nor exposes three forms',async()=>{
 let requests=0; globalThis.fetch=async()=>{requests++;return response({});};
 const root=document.createElement('div');document.body.appendChild(root);const cleanup=await login.mount(root);
 assert.equal(requests,0); assert.equal(root.querySelector('.pw-form').hidden,false);
 assert.equal(root.querySelector('.invite-form').hidden,true); assert.equal(root.querySelector('.qr-block').hidden,true);
 assert.ok(root.querySelector('label input[type="password"]'));
 cleanup();root.remove();
});
test('alert deep link prefills ticker and logout discards a late list',async()=>{
 store.set('me',{tier:'pro'});store.set('alerts',[]);
 let resolve;globalThis.fetch=()=>new Promise(r=>resolve=r);
 const root=document.createElement('div');document.body.appendChild(root);
 const pending=alerts.mount(root,{query:new URLSearchParams('ticker=nvda')});
 assert.equal(root.querySelector('input').value,'NVDA');
 assert.equal(root.querySelectorAll('.empty').length,0);
 store.bumpEpoch(); resolve(response({items:[{id:1,ticker:'PRIVATE'}]}));
 const cleanup=await pending;assert.deepEqual(store.get('alerts'),[]);cleanup();root.remove();
});
test('fast route changes keep late calendar results out of the active watchlist',async()=>{
 store.set('me',{tier:'pro'});store.set('watchlist',[]);let calendarResolve;
 globalThis.fetch=async(url)=>{
  if(String(url).includes('calendar'))return new Promise(r=>{calendarResolve=r;});
  return response({items:[]});
 };
 history.replaceState(null,'','#/calendar');const first=router.render();
 for(let i=0;i<100&&!calendarResolve;i++)await new Promise(r=>setTimeout(r,1));
 assert.ok(calendarResolve);
 history.replaceState(null,'','#/watchlist');await router.render();
 calendarResolve(response({events:[]}));
 // calendar may also request its static fallback; complete every bounded test request.
 for(let i=0;i<5;i++){await new Promise(r=>setTimeout(r,0));calendarResolve(response({events:[]}));}
 await first;assert.equal(document.querySelector('#view h1').textContent,copy['app.watch.title']);
});

test('free research view does not fetch or leak a ticker report',async()=>{
 const research=await import('../public/js/app/views/research.js');
 store.set('me',{tier:'free'});let requests=0;
 globalThis.fetch=async()=>{requests++;return response({reports:[]});};
 const root=document.createElement('div');await research.mount(root,{ticker:'AMKR'});
 assert.equal(requests,0);assert.ok(root.querySelector('a[href="#/billing"]'));
 assert.equal(root.textContent.includes('AMKR'),false);
});

test('creator following, quality and search filters compose independently',()=>{
 const posts=[{kol_id:'a',kol_name:'Alpha',title:'NVDA report'}, {kol_id:'b',kol_name:'Beta',title:'NVDA report'}];
 assert.equal(creators.filterPosts(posts,{following:new Set(['a']),mine:true,archive:true}).length,1);
 assert.equal(creators.filterPosts(posts,{following:new Set(['a']),mine:true,archive:false}).length,0);
 assert.equal(creators.filterPosts(posts,{following:new Set(['a']),mine:true,archive:true,query:'Beta'}).length,0);
 assert.equal(creators.filterPosts(posts,{following:new Set(),mine:false,archive:true,query:'Beta'}).length,1);
 assert.ok(creators.videoDate('2026-09-04T18:00:00-04:00','en-US').includes('10:00 PM'));
});

test('radar preserves the delivered body, historical dates and incomplete archive state',async()=>{
 globalThis.fetch=async(url)=>{
  if(String(url).includes('radar-history'))return response({items:[{board:'insider',ticker:'TTMI',ts:'2026-08-26T07:42:00Z',summary:{zh:'Historical receipt',en:'Historical receipt'},body:{zh:'Identity not verified',en:'Identity not verified'}}]});
  if(String(url).includes('week-ahead'))return response({});
  return response({items:[{kind:'volscan',ts:'2026-09-04T19:02:00Z',summary:'IV scan',extra:{message_text:'META\nHV252 39%'}},{kind:'insider',ts:'2026-09-04',summary:null}]});
 };
 const root=document.createElement('div');await boards.mount(root);
 assert.ok(root.textContent.includes('HV252 39%'));
 assert.ok(root.textContent.includes('2026-08-26'));
 assert.ok(root.querySelector('use[href="/vendor/lucide/icons.svg#insider"]'));
 const button=root.querySelector('.brd-item');assert.equal(button.getAttribute('aria-expanded'),'false');button.click();assert.equal(button.getAttribute('aria-expanded'),'true');
});
test('navigation retains all routes with named SVG links and a native mobile disclosure',()=>{
 const html=readFileSync('dist/app/index.html','utf8');const page=new JSDOM(html).window.document;
 const links=[...page.querySelectorAll('.app-nav a')];
 assert.equal(new Set(links.map(a=>a.dataset.route)).size,8);
 assert.equal(page.querySelectorAll('.nav-more-panel a').length,4);
 for(const a of links){assert.ok(a.textContent.trim());assert.ok(a.querySelector('svg[aria-hidden="true"] use'));}
 assert.ok(page.querySelector('.nav-more summary'));
});
