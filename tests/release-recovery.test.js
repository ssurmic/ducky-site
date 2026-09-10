import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const copy = JSON.parse(readFileSync('i18n/en.json', 'utf8'));
const strings = Object.fromEntries(Object.entries(copy).filter(([k]) => k.startsWith('app.')).map(([k,v]) => [k.slice(4),v]));
const dom = new JSDOM('<html lang="en"><body><script id="ducky-strings" type="application/json"></script></body></html>', {url:'https://duckybot.app/app/#/profile?next=billing'});
dom.window.document.querySelector('#ducky-strings').textContent = JSON.stringify(strings);
Object.assign(globalThis, {window:dom.window, document:dom.window.document, Node:dom.window.Node, location:dom.window.location});
const { moduleVersion, showModuleRecovery } = await import('../public/js/app/release-recovery.js');

test('module recovery checks current release and refreshes only on a deliberate click', async () => {
  const root = document.createElement('div');
  const route = location.href;
  let refreshes = 0, requests = 0;
  window.localStorage.setItem('ducky-token', 'local-fixture');
  window.sessionStorage.setItem('test-draft', 'unsaved fixture');
  const recovery = showModuleRecovery(root, {
    currentVersion:'a'.repeat(20),
    fetchRelease:async (url, opts) => { requests++; assert.equal(url,'/app-release.json'); assert.equal(opts.cache,'no-store'); return Response.json({version:'b'.repeat(20)}); },
    refresh:() => {refreshes++; assert.equal(location.href, route);},
  });
  await recovery.ready;
  assert.equal(requests, 1); assert.equal(refreshes, 0);
  assert.ok(root.textContent.includes(copy['app.release.updated']));
  assert.equal(root.textContent.includes('app-assets'), false);
  root.querySelector('button').click(); root.querySelector('button').click();
  assert.equal(refreshes, 1);
  assert.equal(window.localStorage.getItem('ducky-token'), 'local-fixture');
  assert.equal(window.sessionStorage.getItem('test-draft'), 'unsaved fixture');
});

test('same release or network failure does not offer an endless retry-import loop', async () => {
  for (const fetchRelease of [async()=>Response.json({version:'a'.repeat(20)}),async()=>{throw Error('network');}]) {
    const root = document.createElement('div'); let refreshes = 0;
    const recovery = showModuleRecovery(root,{currentVersion:'a'.repeat(20),fetchRelease,refresh:()=>refreshes++});
    await recovery.ready;
    assert.ok(root.textContent.includes(copy['app.release.failed']));
    assert.equal(refreshes,0); assert.equal(root.querySelector('button').disabled,false);
    recovery.dispose();
  }
});

test('obsolete recovery cannot mutate a later route or refresh after navigation', async () => {
  const root = document.createElement('div'); const controller = new AbortController();
  let resolve, refreshes = 0;
  const recovery = showModuleRecovery(root,{currentVersion:'a'.repeat(20),signal:controller.signal,
    fetchRelease:()=>new Promise(r=>{resolve=r;}),refresh:()=>refreshes++});
  controller.abort(); resolve(Response.json({version:'b'.repeat(20)})); await recovery.ready;
  assert.ok(!root.textContent.includes(copy['app.release.updated']));
  root.querySelector('button').click(); assert.equal(refreshes,0);
});

test('release identity reads only a content hash from the immutable graph path', () => {
  assert.equal(moduleVersion('https://duckybot.app/app-assets/77db404861dc58974d8a/router.js'),'77db404861dc58974d8a');
  assert.equal(moduleVersion('https://duckybot.app/js/app/router.js?v=old'),null);
});

test('healthy old page checks on return and offers one update without losing a draft or session',async()=>{
 const {watchRelease}=await import('../public/js/app/release-recovery.js');
 const host=document.createElement('main');host.innerHTML='<input value="unfinished">';document.body.append(host);
 let at=0,version='a'.repeat(20),calls=0,reloads=0;
 const watch=watchRelease(host,{currentVersion:version,now:()=>at,fetchRelease:async()=>{calls++;return Response.json({version});},refresh:()=>reloads++});
 await watch.ready;assert.equal(calls,1);assert.equal(host.querySelector('aside').hidden,true);
 version='b'.repeat(20);await watch.check();assert.equal(calls,1);
 at=61000;window.dispatchEvent(new window.Event('pageshow'));await new Promise(r=>setTimeout(r,0));
 assert.equal(calls,2);assert.equal(host.querySelector('aside').hidden,false);assert.equal(reloads,0);
 assert.equal(host.querySelector('input').value,'unfinished');
 host.querySelector('button').click();host.querySelector('button').click();assert.equal(reloads,1);
 at+=60000;await watch.check();assert.equal(calls,2);watch.stop();host.remove();
});

test('release checker survives invalid/network responses and cannot render after disposal',async()=>{
 const {watchRelease}=await import('../public/js/app/release-recovery.js');
 for(const fetchRelease of [async()=>{throw Error('offline');},async()=>Response.json({version:'<script>'})]){
  const host=document.createElement('main');const watch=watchRelease(host,{currentVersion:'a'.repeat(20),fetchRelease});
  await watch.ready;assert.equal(host.querySelector('aside').hidden,true);watch.stop();
 }
 let resolve;const host=document.createElement('main');
 const watch=watchRelease(host,{currentVersion:'a'.repeat(20),fetchRelease:()=>new Promise(r=>resolve=r)});
 watch.stop();resolve(Response.json({version:'b'.repeat(20)}));await watch.ready;assert.equal(host.children.length,0);
});
