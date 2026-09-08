import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body><script id="ducky-config" type="application/json">{"PRICES":{"signal":{"monthly_usd":15},"pro":{"monthly_usd":9,"annual_usd":90,"annual_cny":499}}}</script></body></html>', {url:'https://ducky.test/app/'});
for(const k of ['window','document','Node'])globalThis[k]=dom.window[k];
window.DUCKY={PRICES:{signal:{monthly_usd:15},pro:{monthly_usd:9,annual_usd:90,annual_cny:499}}};
const {normalizePlans,planSelection}=await import('../public/js/app/views/billing.js');
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
