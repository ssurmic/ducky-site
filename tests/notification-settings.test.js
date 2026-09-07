import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom = new JSDOM('<html><body></body></html>', {url:'https://ducky.test/app/#/profile'});
for (const key of ['window','document','Node','location','history']) globalThis[key] = dom.window[key];
const copy = JSON.parse(readFileSync('i18n/en.json'));
const strings = document.createElement('script'); strings.id = 'ducky-strings';
strings.textContent = JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const store = await import('../public/js/app/store.js');
const {mountNotificationSettings} = await import('../public/js/app/notification-settings.js');
const flush = async () => {for (let i=0;i<12;i++) await new Promise(resolve=>setImmediate(resolve));};
const response = (body,status=200) => new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const ready = {email_enabled:true,telegram_enabled:true,email_available:true,telegram_available:true,email_status:'ready',telegram_status:'ready'};
const receipt = (channels, extra={}) => ({message_id:41,status:'sent',completed:channels.every(row=>['accepted','failed','cancelled','unknown'].includes(row.status)),channels,...extra});

function fixture({initial=ready, delivery, mutate, pauseAt, loseFirstSubmission=false}={}) {
  history.replaceState(null,'','/app/#/profile'); store.bumpEpoch(); store.set('token','test-a'); store.set('me',{user_id:21});
  let prefs={...initial}, release, deliveryCount=0;
  const calls=[], pending=new Map(), realSet=globalThis.setTimeout, realClear=globalThis.clearTimeout;
  globalThis.setTimeout=(fn,ms,...args)=>{
    if (ms!==2000) return realSet(fn,ms,...args);
    const id={}; pending.set(id,()=>fn(...args)); return id;
  };
  globalThis.clearTimeout=id=>{if(!pending.delete(id))realClear(id);};
  const root=document.createElement('main');document.body.append(root);const ctl=new AbortController();
  globalThis.fetch=async(url,opts={})=>{
    const path=new URL(String(url),'https://ducky.test').pathname, method=opts.method||'GET',body=opts.body&&JSON.parse(opts.body);
    calls.push({path,method,body,signal:opts.signal,key:opts.headers?.['Idempotency-Key']}); let result;
    if(path==='/me/notifications'&&method==='GET') result=response(prefs);
    else if(path==='/me/notifications'&&method==='PATCH') {prefs=mutate?mutate(body):{...prefs,...body};result=response({ok:true});}
    else if(path==='/me/notifications/test') {
      if(loseFirstSubmission && calls.filter(row=>row.path===path).length===1) throw new Error('response lost after enqueue');
      result=response({message_id:41,status:'queued'},202);
    }
    else if(path==='/me/notifications/deliveries/41') result=response(delivery?delivery(deliveryCount++):receipt([{channel:'email',status:'accepted'},{channel:'telegram',status:'accepted'}]));
    else throw Error('Unexpected '+method+' '+path);
    if(path===pauseAt) return new Promise(resolve=>{release=()=>resolve(result);});
    return result;
  };
  const dispose=mountNotificationSettings(root,{signal:ctl.signal});
  const button=key=>[...root.querySelectorAll('button')].find(node=>node.textContent===copy['app.'+key]);
  return {root,calls,button,release:()=>release(),
    async tick(){const callbacks=[...pending.values()];pending.clear();callbacks.forEach(fn=>fn());await flush();},
    get timers(){return pending.size;},
    dispose,
    close(){ctl.abort();dispose();root.remove();globalThis.setTimeout=realSet;globalThis.clearTimeout=realClear;}
  };
}

test('preferences require an explicit save, do not send implicitly and cannot enable an unverified email',async()=>{
  const f=fixture({initial:{...ready,email_enabled:false,email_available:false,email_status:'unverified',telegram_enabled:false,telegram_status:'disabled'}});
  try {
    await flush(); const email=f.root.querySelector('[name=email_enabled]'),tg=f.root.querySelector('[name=telegram_enabled]');
    assert.equal(email.disabled,true);assert.equal(email.checked,false);assert.equal(tg.disabled,false);
    tg.click();assert.equal(f.calls.length,1);
    f.button('notify.save').click();await flush();
    const writes=f.calls.filter(row=>row.method==='PATCH');assert.equal(writes.length,1);
    assert.deepEqual(writes[0].body,{email_enabled:false,telegram_enabled:true});
    assert.equal(f.calls.some(row=>row.path.endsWith('/test')),false);
    assert.ok(f.root.textContent.includes(copy['app.notify.saved']));
  } finally {f.close();}
});

test('invalid settings are retryable and a server-disagreed preference never announces saved',async()=>{
  for(const options of [{initial:{...ready,email_enabled:1}},{initial:{...ready,email_status:'unlinked'}},{mutate:()=>ready}]){
    const f=fixture(options);
    try {
      await flush();
      if(options.initial){assert.equal(f.root.querySelector('form'),null);assert.ok(f.button('common.retry'));}
      else {f.root.querySelector('[name=email_enabled]').click();f.button('notify.save').click();await flush();assert.equal(f.root.querySelector('[name=email_enabled]').checked,true);}
      assert.equal(f.root.textContent.includes(copy['app.notify.saved']),false);
    } finally {f.close();}
  }
});

test('a linked but unreachable Telegram account cannot be enabled until the bot is restarted',async()=>{
  const f=fixture({initial:{...ready,telegram_enabled:false,telegram_available:true,telegram_status:'unreachable'}});
  try {await flush();assert.equal(f.root.querySelector('[name=telegram_enabled]').disabled,true);
    assert.ok(f.root.textContent.includes(copy['app.notify.state.unreachable']));
  } finally {f.close();}
});

test('one test request survives double click and partial acceptance remains pending until both results are terminal',async()=>{
  const f=fixture({pauseAt:'/me/notifications/test',delivery:n=>receipt([{channel:'telegram',status:'accepted'},{channel:'email',status:n?'failed':'retry'}])});
  try {
    await flush();const both=f.button('notify.test_both');both.click();both.click();await flush();
    assert.equal(f.calls.filter(row=>row.path.endsWith('/test')).length,1);
    f.release();await flush();assert.equal(f.timers,1);assert.equal(f.button('notify.test_both').disabled,true);
    assert.ok(f.root.textContent.includes(copy['app.notify.delivery.retry']));
    assert.ok(f.root.textContent.includes(copy['app.notify.acceptance_note']));
    await f.tick();assert.equal(f.timers,0);assert.ok(f.root.textContent.includes(copy['app.notify.delivery.failed']));
    assert.equal(f.button('notify.test_both').disabled,false);
  } finally {f.close();}
});

test('unknown results allow only a status refresh until the original result is confirmed',async()=>{
  const f=fixture({delivery:n=>receipt([{channel:'email',status:n?'accepted':'unknown'},{channel:'telegram',status:'accepted'}])});
  try {
    await flush();f.button('notify.test_both').click();await flush();assert.equal(f.timers,0);
    assert.equal(f.button('notify.test_both').disabled,true);assert.ok(f.root.textContent.includes(copy['app.notify.delivery.unknown']));
    f.button('notify.refresh_delivery').click();await flush();
    assert.equal(f.calls.filter(row=>row.path.endsWith('/test')).length,1);assert.equal(f.button('notify.test_both').disabled,false);
  } finally {f.close();}
});

test('a lost submission response reuses the same key and channels; a later explicit test gets a new key',async()=>{
  const f=fixture({loseFirstSubmission:true});
  try {
    await flush();f.button('notify.test_both').click();await flush();
    assert.equal(f.button('notify.test_both').disabled,true);assert.ok(f.button('notify.retry_test'));
    f.button('notify.retry_test').click();await flush();
    let sends=f.calls.filter(row=>row.path.endsWith('/test'));assert.equal(sends.length,2);
    assert.match(sends[0].key,/^[0-9a-f]{8}-[0-9a-f-]{27}$/);assert.equal(sends[0].key,sends[1].key);assert.deepEqual(sends[0].body,sends[1].body);
    assert.equal(f.button('notify.retry_test'),undefined);f.button('notify.test_both').click();await flush();
    sends=f.calls.filter(row=>row.path.endsWith('/test'));assert.equal(sends.length,3);assert.notEqual(sends[2].key,sends[0].key);
  } finally {f.close();}
});

test('malformed, cross-message and incomplete receipts never appear as successful tests',async()=>{
  const pair=[{channel:'email',status:'accepted'},{channel:'telegram',status:'accepted'}];
  for(const value of [receipt(pair,{message_id:42}),receipt(pair.slice(0,1)),receipt([pair[0],pair[0]]),receipt([{channel:'email',status:'pending'},pair[1]],{completed:true})]){
    const f=fixture({delivery:()=>value});
    try {await flush();f.button('notify.test_both').click();await flush();
      assert.equal(f.root.textContent.includes(copy['app.notify.delivery.accepted']),false);
      assert.equal(f.button('notify.test_both').disabled,true);assert.ok(f.button('notify.refresh_delivery'));
    } finally {f.close();}
  }
});

test('a pending receipt at the polling limit requires refresh instead of another send',async()=>{
  const f=fixture({delivery:()=>receipt([{channel:'email',status:'claimed'},{channel:'telegram',status:'pending'}])});
  try {
    await flush();f.button('notify.test_both').click();await flush();
    for(let i=0;i<12;i++)await f.tick();
    assert.equal(f.timers,0);assert.equal(f.button('notify.test_both').disabled,true);assert.ok(f.button('notify.refresh_delivery'));
    assert.equal(f.calls.filter(row=>row.path.endsWith('/test')).length,1);
  } finally {f.close();}
});

test('late receipt responses and scheduled polls stop when the account or view changes',async()=>{
  for(const leave of [f=>f.dispose(),()=>store.set('token','test-b'),()=>{history.replaceState(null,'','/app/#/watchlist');}]){
    const f=fixture({pauseAt:'/me/notifications/deliveries/41'});
    try {
      await flush();f.button('notify.test_both').click();await flush();const before=f.root.textContent;
      leave(f);f.release();await flush();assert.equal(f.root.textContent,before);assert.equal(f.timers,0);
    } finally {f.close();}
  }
  const f=fixture({delivery:()=>receipt([{channel:'email',status:'retry'},{channel:'telegram',status:'pending'}])});
  try {await flush();f.button('notify.test_both').click();await flush();assert.equal(f.timers,1);f.dispose();assert.equal(f.timers,0);}finally{f.close();}
});
