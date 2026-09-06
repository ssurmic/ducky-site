import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<body></body>',{url:'https://ducky.test/app/#/oauth'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const auth=await import('../public/js/app/auth.js');
const store=await import('../public/js/app/store.js');
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
test('login retries a transient profile failure before reporting success',async()=>{
 let profiles=0;store.set('me',null);
 globalThis.fetch=async url=>url.endsWith('/me')?++profiles===1?response({error:'temporary'},503):response({user_id:1,tier:'free'}):response({items:[]});
 await auth.establish({token:'fixture-token'});
 assert.equal(profiles,2);assert.equal(store.get('me').user_id,1);
});
test('definitive session failure cannot silently count as successful login',async()=>{
 store.set('me',null);globalThis.fetch=async url=>url.endsWith('/me')?response({error:'expired'},401):response({items:[]});
 await assert.rejects(auth.establish({token:'expired-fixture'}));assert.equal(store.get('me'),null);
});
