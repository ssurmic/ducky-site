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
