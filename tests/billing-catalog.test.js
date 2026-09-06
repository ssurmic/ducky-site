import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body><script id="ducky-config" type="application/json">{"PRICES":{"signal":{"monthly_usd":15},"pro":{"monthly_usd":9,"annual_usd":90,"annual_cny":499}}}</script></body></html>');
for(const k of ['window','document','Node'])globalThis[k]=dom.window[k];
window.DUCKY={PRICES:{signal:{monthly_usd:15},pro:{monthly_usd:9,annual_usd:90,annual_cny:499}}};
const {normalizePlans}=await import('../public/js/app/views/billing.js');
test('authoritative catalog never resurrects a retired or disabled price',()=>{
 const p=normalizePlans({plans:[{tier:'pro',currency:'USD',months:1,amount:9}],rails:['stripe']});
 assert.equal(p.paid,null);assert.equal(p.pro.monthly_usd,9);assert.equal(p.pro.annual_cny,null);
 assert.deepEqual(p.rails,['stripe']);
 assert.equal(normalizePlans({plans:[],rails:[]}).pro,null);
 assert.deepEqual(normalizePlans(null).rails,[]);
 assert.equal(normalizePlans(null).pro.monthly_usd,9);
 assert.equal(normalizePlans(null).paid,null);
});
