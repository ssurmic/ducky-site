import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

test('signed-out entry point mounts a password reset link and can request a new link', async () => {
  const secret = 'x'.repeat(43);
  const dom = new JSDOM('<a data-lang-toggle href="/app/#/reset?token='+secret+'">中文</a><main class="app-main"><div id="view"></div></main>', {
    url: 'https://ducky.test/app/#/reset?token=' + secret
  });
  for (const k of ['window','document','Node','MutationObserver','location','history']) globalThis[k] = dom.window[k];
  globalThis.requestAnimationFrame = f => setTimeout(f, 0);
  const copy = JSON.parse(readFileSync('i18n/en.json'));
  const strings = document.createElement('script'); strings.id = 'ducky-strings';
  strings.textContent = JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k]) => k.startsWith('app.')).map(([k,v]) => [k.slice(4),v])));
  document.body.append(strings);
  let submitted;
  globalThis.fetch = async (url, opts) => {
    assert.ok(String(url).endsWith('/auth/password-reset/confirm'));
    submitted = JSON.parse(opts.body);
    return new Response(JSON.stringify({ok:true}), {headers:{'content-type':'application/json'}});
  };
  await import('../public/js/app/main.js');
  for (let i=0; i<100 && !document.body.classList.contains('ready'); i++) await new Promise(r=>setTimeout(r,5));
  assert.equal(document.body.dataset.route, 'reset');
  assert.equal(location.hash, '#/reset');
  assert.equal(document.querySelector('[data-lang-toggle]').getAttribute('href'), '/app/#/reset');
  assert.equal(document.querySelector('h1').textContent, copy['app.recovery.reset_title']);
  document.querySelector('[name="password"]').value = 'new-password';
  document.querySelector('[name="confirm"]').value = 'new-password';
  document.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  for (let i=0; i<10 && !submitted; i++) await new Promise(r=>setTimeout(r,1));
  assert.deepEqual(submitted, {token:secret,password:'new-password'});
  const router = await import('../public/js/app/router.js');
  history.replaceState(null,'','#/forgot'); await router.render();
  assert.equal(document.body.dataset.route,'forgot');
  assert.ok(document.querySelector('input[type="email"]'));
  dom.window.close();
});
