import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function worker(clients = []) {
  const handlers = {}, shown = [], opened = [], messages = [];
  const self = {
    location: {origin: 'https://duckybot.app'},
    addEventListener: (type, fn) => {handlers[type] = fn;},
    registration: {showNotification: async (...args) => {shown.push(args);}},
    clients: {matchAll: async () => clients.map(c => ({postMessage: msg => messages.push(msg), ...c})),
      openWindow: async url => {opened.push(url);}},
  };
  vm.runInNewContext(script, {self, URL, Promise});
  return {shown, opened, messages, async dispatch(type, fields) {
    let done;
    handlers[type]({...fields, waitUntil: promise => {done = promise;}});
    await done;
  }};
}

test('push keeps a stable visible tag, exact owned-origin link and no cross-account payload broadcast', async () => {
  const w = worker([{url:'https://duckybot.app/app/'}]);
  await w.dispatch('push', {data:{json:()=>({title:'Creator',body:'INTC relevant content',
    url:'/app/#/updates?item=24',tag:'creator:stable-id'})}});
  assert.equal(w.shown[0][1].data.url, 'https://duckybot.app/app/#/updates?item=24');
  assert.equal(w.shown[0][1].tag, 'creator:stable-id');
  assert.equal(w.shown[0][1].renotify, false);
  assert.equal(JSON.stringify(w.messages), JSON.stringify([{type:'ducky-creator-update'}]));
});

test('external, script, encoded-path and credentialed destinations fall back to the app', async () => {
  for (const url of ['https://evil.test/app/', '//evil.test/app/', 'javascript:alert(1)',
    '/api/private', '/app/%2f../private', 'https://name@duckybot.app/app/']) {
    const w = worker();
    await w.dispatch('push', {data:{json:()=>({url})}});
    assert.equal(w.shown[0][1].data.url, 'https://duckybot.app/app/');
  }
});

test('notification click focuses exact item or navigates an existing app to its precise item', async () => {
  let focused = 0, navigated;
  const client = {url:'https://duckybot.app/app/#/watchlist',
    navigate:async url => {navigated=url; return {focus:()=>{focused++;}};}};
  const w = worker([client]);
  await w.dispatch('notificationclick', {notification:{close(){},data:{url:'/app/#/updates?item=42'}}});
  assert.equal(navigated, 'https://duckybot.app/app/#/updates?item=42');
  assert.equal(focused, 1);
  assert.equal(w.opened.length, 0);
});

test('notification click never focuses a foreign URL containing our deep link', async () => {
  let focused = 0;
  const w = worker([{url:'https://evil.test/?next=https://duckybot.app/app/#/updates?item=42',focus(){focused++;}}]);
  await w.dispatch('notificationclick', {notification:{close(){},data:{url:'/app/#/updates?item=42'}}});
  assert.equal(focused, 0);
  assert.equal(w.opened[0], 'https://duckybot.app/app/#/updates?item=42');
});

test('a disappearing app tab still opens the selected notification', async () => {
  const w = worker([{url:'https://duckybot.app/app/#/watchlist', navigate:async () => {throw new Error('closed');}}]);
  await w.dispatch('notificationclick', {notification:{close(){},data:{url:'/app/#/updates?item=42'}}});
  assert.equal(w.opened[0], 'https://duckybot.app/app/#/updates?item=42');
});

test('malformed push still shows a bounded fallback notification', async () => {
  const w = worker();
  await w.dispatch('push', {data:{json:()=>null}});
  assert.equal(w.shown[0][0], 'Ducky TradeBot');
  await w.dispatch('push', {data:{json:()=>({title:'a'.repeat(500),body:'b'.repeat(900),tag:[]})}});
  assert.equal(w.shown[1][0].length, 100);
  assert.equal(w.shown[1][1].body.length, 400);
  assert.equal(w.shown[1][1].tag, undefined);
});
