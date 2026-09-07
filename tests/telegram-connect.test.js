import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html><body></body></html>',{url:'https://ducky.test/app/#/profile'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
window.DUCKY={BOT:'ExampleBot'};
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mountTelegramConnect}=await import('../public/js/app/telegram-connect.js');
const flush=async()=>{for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const issued={nonce:'a_test_nonce_123456',code:'AB2345',ttl:180,url:'https://t.me/ExampleBot?start=link_a_test_nonce_123456'};
const candidate={id:456789,username:'test_person',first_name:'Test Person'};
const confirmed={status:'confirmed',telegram:candidate};
const linked={ok:true,linked:'telegram',identities:[{provider:'google',provider_uid:'test-google'},{provider:'telegram',provider_uid:'456789',linked_at:'2026-09-07T00:00:00Z'}]};
function fixture({create=()=>response(issued),poll=()=>response(confirmed),confirm=()=>response(linked),me=()=>response({user_id:-21}),pauseAt}={}){
  history.replaceState(null,'','/app/#/profile');store.bumpEpoch();store.set('token','owner-token');store.set('me',{user_id:-21});
  const root=document.createElement('main');document.body.append(root);const ctl=new AbortController(),calls=[],pending=new Map();
  let release,done=0,now=100000;
  const realSet=globalThis.setTimeout,realClear=globalThis.clearTimeout,realNow=Date.now;
  Date.now=()=>now;
  globalThis.setTimeout=(fn,ms,...args)=>{if(ms===15000)return realSet(fn,ms,...args);const id={};pending.set(id,{at:now+ms,fn:()=>fn(...args)});return id;};
  globalThis.clearTimeout=id=>{if(!pending.delete(id))realClear(id);};
  globalThis.fetch=async(url,opts={})=>{
    const u=new URL(url,'https://ducky.test'),path=u.pathname,body=opts.body&&JSON.parse(opts.body);
    calls.push({path,body,query:u.searchParams,auth:opts.headers.Authorization,signal:opts.signal});
    let value;
    if(path.endsWith('/nonce'))value=await create();
    else if(path.endsWith('/poll'))value=await poll();
    else if(path.endsWith('/confirm'))value=await confirm();
    else if(path.endsWith('/cancel'))value=response({ok:true});
    else if(path==='/me')value=await me();
    else throw Error('Unexpected request '+path);
    if(path.endsWith(pauseAt))return new Promise(resolve=>{release=()=>resolve(value);});
    return value;
  };
  const dispose=mountTelegramConnect(root,{signal:ctl.signal,onLinked:()=>{done++;}});
  const button=key=>[...root.querySelectorAll('button')].find(n=>n.textContent===copy['app.'+key]);
  return {root,calls,dispose,button,release:()=>release(),get done(){return done;},get timers(){return pending.size;},
    async start(){button('notify.link_telegram').click();await flush();},
    async tick(ms=5000){now+=ms;for(const [id,t] of [...pending])if(t.at<=now){pending.delete(id);t.fn();}await flush();},
    close(){ctl.abort();dispose();root.remove();globalThis.setTimeout=realSet;globalThis.clearTimeout=realClear;Date.now=realNow;}
  };
}

test('a bot-confirmed identity requires a separate browser confirmation and retains the current account',async()=>{
  let polls=0;
  const f=fixture({poll:()=>++polls===1?response({status:'pending',retry_after:5},202):response(confirmed)});
  try {
    assert.equal(f.calls.length,0);await f.start();
    assert.match(f.root.textContent,/AB2345/);assert.equal(f.button('notify.link_confirm'),undefined);
    await f.tick();assert.equal(f.button('notify.link_confirm'),undefined);await f.tick();
    assert.match(f.root.textContent,/@test_person/);assert.equal(f.timers,0);assert.equal(f.done,0);
    assert.equal(f.calls.some(c=>c.path.endsWith('/confirm')),false);
    const confirm=f.button('notify.link_confirm');confirm.click();confirm.click();await flush();
    assert.equal(f.done,1);assert.equal(f.calls.filter(c=>c.path.endsWith('/confirm')).length,1);
    assert.ok(f.calls.every(c=>c.auth==='Bearer owner-token'));assert.equal(store.get('token'),'owner-token');assert.equal(store.get('me').user_id,-21);
    f.dispose();assert.equal(f.calls.some(c=>c.path.endsWith('/cancel')),false);
  }finally{f.close();}
});

test('cancel and leaving stop polling and revoke only the original account request',async()=>{
  for(const leave of [f=>f.button('notify.cancel_link').click(),f=>f.dispose(),()=>store.set('token','another-token')]){
    const f=fixture();
    try{await f.start();leave(f);await flush();await f.tick();assert.equal(f.timers,0);
      assert.equal(f.calls.some(c=>c.path.endsWith('/poll')),false);
      assert.ok(f.calls.filter(c=>c.path.endsWith('/cancel')).every(c=>c.auth==='Bearer owner-token'));
      if(store.get('token')==='owner-token')assert.equal(f.calls.filter(c=>c.path.endsWith('/cancel')).length,1);
      else assert.equal(f.calls.some(c=>c.path.endsWith('/cancel')),false);
    }finally{f.close();}
  }
});

test('late confirmation and creation responses cannot mutate a new account or departed page',async()=>{
  for(const stage of ['nonce','poll','confirm'])for(const change of [()=>store.set('token','another-token'),()=>history.replaceState(null,'','/app/#/watchlist')]){
    const f=fixture({pauseAt:'/'+stage});
    try{await f.start();if(stage!=='nonce')await f.tick();if(stage==='confirm'){f.button('notify.link_confirm').click();await flush();}
      const before=f.root.textContent;change();f.release();await flush();assert.equal(f.root.textContent,before);assert.equal(f.done,0);
      assert.equal(f.calls.some(c=>c.path==='/me'),false);
    }finally{f.close();}
  }
});

test('malformed URLs, nonces and codes never become QR codes or bot links',async()=>{
  for(const change of [{url:'https://evil.test/?start=link_'+issued.nonce},{url:issued.url+'&extra=1'},
    {url:'https://t.me/AnotherBot?start=link_'+issued.nonce},{code:'ABC123'},{code:'12345'},
    {ttl:0},{nonce:'short'},{url:issued.url+'#fragment'}]){
    const f=fixture({create:()=>response({...issued,...change})});
    try{await f.start();assert.equal(f.root.querySelector('a'),null);assert.equal(f.timers,0);assert.ok(f.button('notify.link_telegram'));assert.equal(f.done,0);}finally{f.close();}
  }
});

test('unconfirmed and malformed identities cannot offer a final confirmation',async()=>{
  for(const value of [{status:'pending'}, {status:'confirmed',telegram:{id:'456789',first_name:'Test'}},
    {status:'confirmed',telegram:{id:0,first_name:'Test'}},{status:'confirmed',telegram:{id:456789}},
    {status:'confirmed',telegram:{id:456789,username:'<script>'}}]){
    const f=fixture({poll:()=>response(value)});
    try{await f.start();await f.tick();assert.equal(f.button('notify.link_confirm'),undefined);assert.equal(f.done,0);assert.equal(f.timers,0);}finally{f.close();}
  }
});

test('conflicts, expiry, mismatched linked identity and a changed profile never announce success',async()=>{
  for(const option of [{confirm:()=>response({error:'telegram_linked_elsewhere'},409)},
    {confirm:()=>response({error:'expired'},410)},
    {confirm:()=>response({...linked,identities:[]})},
    {confirm:()=>response({...linked,identities:[{provider:'telegram',provider_uid:'111'}]})},
    {me:()=>response({user_id:-22})}]){
    const f=fixture(option);
    try{await f.start();await f.tick();f.button('notify.link_confirm').click();await flush();assert.equal(f.done,0);
      assert.equal(f.root.textContent.includes(copy['app.notify.link_result.linked']),false);assert.equal(store.get('token'),'owner-token');assert.equal(store.get('me').user_id,-21);
    }finally{f.close();}
  }
});

test('pending confirmation and a lost response retry the same nonce without creating another account request',async()=>{
  let attempts=0;const f=fixture({confirm:()=>++attempts===1?response({status:'pending'},202):attempts===2?Promise.reject(Error('lost response')):response(linked)});
  try{await f.start();await f.tick();
    for(let i=0;i<3;i++){f.button('notify.link_confirm').click();await flush();assert.equal(f.done,i===2?1:0);}
    assert.equal(f.calls.filter(c=>c.path.endsWith('/nonce')).length,1);
    assert.ok(f.calls.filter(c=>c.path.endsWith('/confirm')).every(c=>c.body.nonce===issued.nonce));
  }finally{f.close();}
});

test('transient polling errors retry within the server TTL and expiry stops the flow',async()=>{
  for(const error of [()=>response({retry_after:2},429),()=>response({},503),()=>Promise.reject(Error('network'))]){
    let count=0;const f=fixture({poll:()=>++count===1?error():response(confirmed)});
    try{await f.start();await f.tick();assert.equal(f.timers,1);await f.tick();assert.ok(f.button('notify.link_confirm'));assert.equal(f.timers,0);}finally{f.close();}
  }
  const f=fixture({create:()=>response({...issued,ttl:6}),poll:()=>response({status:'pending'},202)});
  try{await f.start();await f.tick();await f.tick(1000);assert.equal(f.timers,0);assert.match(f.root.textContent,/expired/);assert.equal(f.done,0);}finally{f.close();}
});
