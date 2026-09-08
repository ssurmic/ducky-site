import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><script id="ducky-config" type="application/json">{"PRICES":{"signal":{"monthly_usd":15},"pro":{"monthly_usd":9,"annual_usd":90,"annual_cny":499}}}</script></body></html>', {url:'https://ducky.test/app/'});
for(const k of ['window','document','Node'])globalThis[k]=dom.window[k];
window.DUCKY={PRICES:{signal:{monthly_usd:15},pro:{monthly_usd:9,annual_usd:90,annual_cny:499}}};
const strings=document.createElement('script');strings.id='ducky-strings';strings.type='application/json';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync(new URL('../i18n/en.json',import.meta.url)))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {normalizePlans,planSelection,mount}=await import('../public/js/app/views/billing.js');
test('authoritative catalog never resurrects a retired or disabled price',()=>{
 const p=normalizePlans({plans:[{tier:'pro',currency:'USD',months:1,amount:9}],rails:['stripe']});
 assert.equal(p.paid,null);assert.equal(p.pro.monthly_usd,9);assert.equal(p.pro.annual_cny,null);
 assert.deepEqual(p.rails,['stripe']);
 assert.equal(normalizePlans({plans:[],rails:[]}).pro,null);
 assert.deepEqual(normalizePlans(null).rails,[]);
 assert.equal(normalizePlans(null).pro.monthly_usd,9);
 assert.equal(normalizePlans(null).paid,null);
});
test('a displayed plan carries its currency and term into billing without changing prices or placing an order',()=>{
 const prior={tier:'pro',currency:'USD',months:1};
 assert.deepEqual(planSelection(new URLSearchParams('currency=CNY&months=1'),prior),{tier:'pro',currency:'CNY',months:12});
 assert.deepEqual(planSelection(new URLSearchParams('currency=USD&months=12'),prior),{tier:'pro',currency:'USD',months:12});
 assert.deepEqual(planSelection(new URLSearchParams('currency=BTC&months=999'),prior),prior);
 assert.deepEqual(planSelection(undefined,{tier:'pro',currency:'CNY',months:12}),{tier:'pro',currency:'CNY',months:12});
 assert.deepEqual(prior,{tier:'pro',currency:'USD',months:1});
});

const {safeTarget,rememberTarget,takeTarget,signedInTarget}=await import('../public/js/app/login-target.js');
test('sign-in preserves the public plan choice and discards arbitrary payment parameters',()=>{
 const target='#/billing?currency=CNY&months=12';
 assert.equal(safeTarget('#/billing?currency=CNY&months=1&amount=1&token=secret&rail=manual_wechat'),target);
 assert.equal(safeTarget('#/billing?currency=BTC&months=999&amount=1'),'#/billing');
 rememberTarget(target);assert.equal(takeTarget(),target);assert.equal(takeTarget(),'#/watchlist');
 assert.equal(signedInTarget({profile_complete:true,email_verified:true},target),target);
 assert.equal(signedInTarget({profile_complete:false},target),'#/profile?setup=email&next='+encodeURIComponent(target.slice(2)));
});

test('a currency without a payment method explains the gap and switching currency reveals available methods without an order',async()=>{
 const priorFetch=globalThis.fetch,calls=[],root=document.createElement('main');document.body.append(root);
 globalThis.fetch=async(url,opts)=>{calls.push({url,method:opts.method});return new Response(JSON.stringify(url.split('?')[0].endsWith('/billing/plans')?{plans:[{tier:'pro',currency:'CNY',months:12,amount:499},{tier:'pro',currency:'USD',months:12,amount:90},{tier:'pro',currency:'XTR',months:12,amount:900}],rails:['stars']}:{orders:[]}),{headers:{'content-type':'application/json'}});};
 let cleanup;
 try {
  cleanup=await mount(root,{query:new URLSearchParams('currency=CNY&months=12')});
  assert.match(root.querySelector('.billing-rail-empty').textContent,/Payments in this currency are not available/);
  assert.equal(root.querySelector('.rails a'),null);
  assert.doesNotMatch(root.querySelector('.rails').textContent,/Stars payments work inside Telegram/);
  const select=root.querySelector('.billing-currency select');select.value='USD';select.dispatchEvent(new window.Event('change'));
  assert.equal(root.querySelector('.billing-rail-empty'),null);
  assert.match(root.querySelector('.rails a').textContent,/Telegram Stars/);
  assert.match(root.querySelector('.rails').textContent,/Stars payments work inside Telegram/);
  assert.equal(root.querySelector('.tier-card .price').textContent,'$90/yr');
  assert.deepEqual(calls.map(c=>c.method),['GET','GET']);
 } finally {cleanup?.();root.remove();globalThis.fetch=priorFetch;}
});
