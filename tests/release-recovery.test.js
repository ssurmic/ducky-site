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
