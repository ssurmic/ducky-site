import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/#/creators'});
for(const key of ['window','document','Node','location','history','localStorage','CustomEvent','Event'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const {mountSimulation}=await import('../public/js/app/views/creator-simulation.js');
const api=await import('../public/js/app/api.js');
const store=await import('../public/js/app/store.js');
const path=Array.from({length:21},(_,i)=>({d:'2026-08-'+String(i+1).padStart(2,'0'),stock:i*0.5,spy:i*0.1}));
const post=(id,sym,stance)=>({id,platform_post_id:'yt'+id,revision_id:1,first_verified_revision_id:1,kol_id:'k1',kol_name:'Creator One',recorded_at:'2026-08-01T00:00:00Z',url:'https://www.youtube.com/watch?v=yt'+id,
  calls:[{sym,stance,point_id:'pt'+id,evidence:'Quote '+id,comparison_eligible:true,windows:{recorded:{status:'ready',horizons:{'5':{status:'ready',path:path.slice(0,6)},'20':{status:'ready',path}}}}}]});

test('a post named by the caller opens that recorded view instead of the first row',async()=>{
 store.bumpEpoch();store.set('me',{user_id:1,tier:'pro'});store.set('token','synthetic-only');
 globalThis.fetch=async url=>{assert.match(String(url),/^\/kol\/research/);return Response.json({items:[post(1,'NVDA','bull'),post(2,'AMD','bear')]});};
 const root=document.createElement('section');document.body.append(root);
 await mountSimulation(root,{state:{post:'yt2',point:'pt2'}});
 assert.match(root.querySelector('.creator-lab-source b').textContent,/\$AMD/);
 const select=root.querySelector('select');assert.equal(select.selectedIndex,1);
 assert.ok(root.querySelector('.creator-sim-chart'));assert.equal(root.querySelector('.creator-lab-empty'),null);
 root.remove();
 const plain=document.createElement('section');document.body.append(plain);
 await mountSimulation(plain,{state:{}});
 assert.match(plain.querySelector('.creator-lab-source b').textContent,/\$NVDA/);plain.remove();
});

test('without a verified view the simulator explains itself and offers the fictional scenario once',async()=>{
 store.bumpEpoch();store.set('me',{user_id:1,tier:'pro'});store.set('token','synthetic-only');
 globalThis.fetch=async()=>Response.json({items:[]});
 const root=document.createElement('section');document.body.append(root);
 await mountSimulation(root,{state:{}});
 const empty=root.querySelector('.creator-lab-empty');assert.ok(empty);
 assert.match(empty.textContent,/No view to simulate yet/);
 assert.equal([...root.querySelectorAll('button')].filter(b=>b.textContent==='Try a fictional scenario').length,1);
 empty.querySelector('.btn-primary').click();
 assert.ok(root.querySelector('.creator-sim-chart'));assert.equal(root.querySelector('.creator-lab-empty'),null);
 assert.ok([...root.querySelectorAll('button')].some(b=>b.textContent==='Return to recorded views'));
 root.remove();
});

test('summary requests post to the creator analyze endpoint and nothing else',async()=>{
 store.bumpEpoch();store.set('me',{user_id:1,tier:'pro'});store.set('token','synthetic-only');
 const calls=[];globalThis.fetch=async(url,opts)=>{calls.push([url,opts.method]);return Response.json({status:'queued'});};
 await api.kol.analyze('creator-x');
 assert.deepEqual(calls,[['/kol/creator-x/analyze','POST']]);
});
