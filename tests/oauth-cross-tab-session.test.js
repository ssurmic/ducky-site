import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<main></main>',{url:'https://ducky.test/app/#/watchlist'});
for(const key of ['window','document','Node','MutationObserver','location','history'])globalThis[key]=dom.window[key];
const auth=await import('../public/js/app/auth.js');
const api=await import('../public/js/app/api.js');
const store=await import('../public/js/app/store.js');
const denied=()=>Response.json({error:'unauthorized'},{status:401});
function oldSession(){
  history.replaceState(null,'','#/watchlist');
  auth.saveToken('old-tab-A');store.set('token','old-tab-A');store.set('me',{user_id:1,tier:'pro'});
  api.setUnauthorizedHandler(auth.expireSession);
}

for(const raw of [false,true])test((raw?'binary':'JSON')+' old-tab 401 never revokes or erases a new Google session',async()=>{
  oldSession();let resolve;const requests=[];
  globalThis.fetch=(url,options)=>{requests.push({url,token:options.headers.Authorization});return new Promise(r=>resolve=r);};
  const pending=raw?api.getDataUri('/image'):api.me();
  auth.saveToken('new-google-B');resolve(denied());
  await assert.rejects(pending,error=>error.status===401);
  assert.equal(auth.loadToken(),'new-google-B');assert.equal(store.get('me'),null);
  assert.deepEqual(requests,[{url:raw?'/image':'/me',token:'Bearer old-tab-A'}]);
});

test('an expired boot token does not clear the replacement saved by another tab',async()=>{
  oldSession();let resolve;const requests=[];
  globalThis.fetch=(url,options)=>{
    requests.push(url);
    if(url==='/auth/refresh')return Promise.resolve(denied());
    if(url==='/watchlist')return Promise.resolve(Response.json({items:[]}));
    return new Promise(r=>resolve=r);
  };
  const boot=auth.boot();
  for(let i=0;i<20&&!resolve;i++)await Promise.resolve();
  assert.ok(resolve,'bootstrap must issue its old-token request first');
  auth.saveToken('new-google-B');resolve(denied());
  assert.equal(await boot,false);assert.equal(auth.loadToken(),'new-google-B');
  assert.equal(requests.includes('/auth/logout'),false);
});

test('a current 401 clears only the expired local session and does not post logout',async()=>{
  oldSession();const urls=[];globalThis.fetch=async url=>{urls.push(url);return denied();};
  await assert.rejects(api.me(),error=>error.status===401);
  assert.equal(auth.loadToken(),null);assert.equal(store.get('me'),null);
  assert.deepEqual(urls,['/me']);
});

test('late same-tab failures cannot clear a replacement session',async()=>{
  oldSession();let resolve;
  globalThis.fetch=()=>new Promise(r=>resolve=r);
  const pending=api.me();
  auth.saveToken('new-google-B');store.set('token','new-google-B');store.set('me',{user_id:2,tier:'pro'});
  resolve(denied());await assert.rejects(pending,error=>error.body.detail==='session_changed');
  assert.equal(auth.loadToken(),'new-google-B');assert.equal(store.get('me').user_id,2);
});

test('explicit logout still revokes this tab, preserving another tab\'s saved account',()=>{
  for(const shared of ['old-tab-A','new-google-B']){
    oldSession();auth.saveToken(shared);const requests=[];
    globalThis.fetch=async(url,options)=>{requests.push({url,token:options.headers.Authorization});return Response.json({ok:true});};
    auth.logout();
    assert.deepEqual(requests,[{url:'/auth/logout',token:'Bearer old-tab-A'}]);
    assert.equal(auth.loadToken(),shared==='old-tab-A'?null:'new-google-B');assert.equal(store.get('me'),null);
  }
});
