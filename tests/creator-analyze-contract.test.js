import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/creators'});
for(const key of ['window','document','Node','location','history','localStorage','CustomEvent','Event'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
const api=await import('../public/js/app/api.js');
const store=await import('../public/js/app/store.js');

test('summary requests post to the creator analyze endpoint and nothing else',async()=>{
 store.bumpEpoch();store.set('me',{user_id:1,tier:'pro'});store.set('token','synthetic-only');
 const calls=[];globalThis.fetch=async(url,opts)=>{calls.push([url,opts.method]);return Response.json({status:'queued'});};
 await api.kol.analyze('creator-x');
 assert.deepEqual(calls,[['/kol/creator-x/analyze','POST']]);
});
