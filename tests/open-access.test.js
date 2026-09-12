import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<div id="view"></div><div id="modal" hidden></div><span id="tier-badge"></span>',{url:'https://ducky.test/en/app/'});
for(const k of ['window','document','Node','location','history'])globalThis[k]=dom.window[k];
window.DUCKY={BILLING_ENABLED:false,API_BASE:'',BOT:'ducky',MINIAPP:'app'};
document.documentElement.dataset.lang='en';
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const ui=await import('../public/js/app/ui.js');
const experience=await import('../public/js/app/experience.js');
const router=await import('../public/js/app/router.js');
const billing=await import('../public/js/app/views/billing.js');
const api=await import('../public/js/app/api.js');

test('current product gives full UI access to any signed-in account without claiming payment',async()=>{
 for(const tier of ['free','paid','pro']){
  const me={tier:'pro',subscription:{tier,active:false},experience:{evidence:{selected:[]}},access:{mode:'open',billing_enabled:false}};
  store.set('me',me);
  assert.ok(store.isPro() && store.isPaid());
  assert.equal(store.get('me').subscription.active,false);
  assert.ok(experience.canReadStock('ANY'));
  assert.equal(experience.freeGuide(),null);
  ui.renderTierBadge();assert.equal(document.getElementById('tier-badge').textContent,'');
  const root=document.createElement('div');
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error('billing must not fetch');};
  await billing.mount(root);
  assert.equal(calls,0);assert.equal(root.querySelector('.tier-cards,.pay-panel'),null);
  assert.doesNotMatch(root.textContent,/\bPro\b|VIP|Upgrade|\$/);
 }
 store.set('me',null);assert.equal(store.isPro(),false);
});

test('old checkout links resolve to the account page without checkout params',()=>{
 store.set('me',{tier:'free',access:{billing_enabled:false}});
 const route=router.parse('#/billing?months=12&currency=USD');
 assert.equal(route.name,'profile');assert.equal(route.params.query.toString(),'');
});

test('full creator feed is selected for an account with no paid subscription',async()=>{
 store.set('me',{tier:'pro',subscription:{tier:'free',active:false},access:{billing_enabled:false}});
 store.set('token','local-test-only');
 let url;globalThis.fetch=async(input)=>{url=String(input);return new Response(JSON.stringify({posts:[]}),{headers:{'content-type':'application/json'}});};
 await api.kol.feed();assert.equal(url,'/kol/feed');
});

test('capacity limits explain replacement without a purchase option',()=>{
 const note=experience.quotaNote('creators',30,30);
 assert.equal(note.querySelector('a[href="#/billing"]'),null);
 assert.doesNotMatch(note.textContent,/Pro|upgrade/i);
 ui.upsell({error:'creator_limit',feature:'creators',cap:30});
 const modal=document.getElementById('modal');
 assert.ok(modal.textContent.includes('30'));
 assert.equal(modal.querySelector('a[href="#/billing"]'),null);
  ui.closeModal();
});

test('an old API 402 during deployment is a loading failure, not a capacity claim',async()=>{
 store.set('me',{tier:'free',access:{billing_enabled:false}});
 store.set('token','local-test-only');
 api.setPaymentRequiredHandler(ui.upsell);
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'pro_required'}),{status:402,headers:{'content-type':'application/json'}});
 await assert.rejects(api.kol.feed(),e=>e.status===402);
 const dialog=document.querySelector('[role="dialog"]');
 assert.match(dialog.textContent,/Couldn’t load this page/);
 assert.doesNotMatch(dialog.textContent,/limit|upgrade|Pro|subscription/i);
 assert.equal(dialog.querySelectorAll('.modal-actions button').length,1);
 assert.equal(dialog.querySelectorAll('.modal-actions a').length,1);
 assert.equal(dialog.querySelector('.modal-actions a').textContent,'Refresh page');
 ui.closeModal();api.setPaymentRequiredHandler(null);
});

test('built pages have no subscription entry, pricing comparison or account badge',()=>{
 function walk(path){return readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path+'/'+e.name):e.name==='index.html'?[path+'/'+e.name]:[]);}
 for(const path of walk('dist').filter(p=>!p.includes('/app-assets/'))){
  const d=new JSDOM(readFileSync(path,'utf8')).window.document;
  d.querySelectorAll('script,style').forEach(e=>e.remove());
  assert.equal(d.querySelector('#pricing,.tier-host,.public-pro-panel,a[href*="#/billing"],a[href$="#pricing"]'),null,path);
  assert.doesNotMatch(d.body.textContent,/\bPro\b|VIP|升级|专业版/,path);
 }
});
