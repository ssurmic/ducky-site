import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const source = readFileSync('public/js/analytics.js', 'utf8');
const id = 'G-TEST12345';
const key = 'ducky.analytics-consent.v1';
function setup({url = 'https://duckybot.app/en/', page = 'index', consent, at = Date.now(), referrer = '', route} = {}) {
  const dom = new JSDOM(`<html data-lang="${url.includes('/zh/') ? 'zh' : 'en'}"><body class="page-${page}">
    <h1>Private research and personal display name must not be read</h1>
    <section id="analytics-choice" hidden><button data-analytics-choice="denied">No thanks</button><button data-analytics-choice="granted">Allow</button></section>
    <button data-analytics-manage>Choices</button></body></html>`, {url, ...(referrer ? {referrer} : {}), runScripts: 'outside-only'});
  const w = dom.window;
  w.DUCKY = {GA4_MEASUREMENT_ID: id, GA4_ORIGIN: 'https://duckybot.app'};
  if (consent) w.localStorage.setItem(key, JSON.stringify({value: consent, at}));
  if (route) w.document.body.dataset.route = route;
  w.eval(source);
  return {dom, w, d: w.document, events: () => Array.from(w.dataLayer || []).filter(row => row[0] === 'event'),
    choose: value => w.document.querySelector(`[data-analytics-choice="${value}"]`).click(),
    navigate: (hash, route) => { w.history.replaceState(null, '', hash); w.dispatchEvent(new w.CustomEvent('ducky:page', {detail: {route}})); },
  };
}

test('no Google script or analytics queue before opt-in, on denial, or with expired consent', () => {
  for (const options of [{}, {consent: 'denied'}, {consent: 'granted', at: Date.now() - 181 * 86400000}]) {
    const {dom, w, d, choose, events} = setup(options);
    assert.equal(d.querySelector('script[src]'), null);
    assert.equal(w.dataLayer, undefined);
    choose('denied'); assert.equal(events().length, 0); assert.equal(d.querySelector('script[src]'), null);
    assert.equal(JSON.parse(w.localStorage.getItem(key)).value, 'denied'); dom.window.close();
  }
});

test('root, English and Chinese pages send one sanitized view after consent, with safe context and no Ads', () => {
  for (const path of ['/', '/en/', '/zh/']) {
    const {dom, w, d, choose, events} = setup({url: 'https://duckybot.app' + path + '?custom=private-value#private-fragment', referrer: 'https://www.google.com/search?q=private-query'});
    choose('granted'); choose('granted'); w.eval(source);
    assert.equal(d.querySelectorAll('script[src^="https://www.googletagmanager.com/gtag/js?"]').length, 1);
    assert.equal(events().length, 1);
    assert.equal(events()[0][2].page_location, 'https://duckybot.app' + path);
    assert.equal(events()[0][2].page_referrer, 'https://www.google.com/');
    assert.equal(events()[0][2].send_to, id);
    const config = w.dataLayer.find(row => row[0] === 'config')[2];
    assert.equal(config.send_page_view, false); assert.equal(config.allow_google_signals, false);
    assert.equal(config.allow_ad_personalization_signals, false);
    const consent = w.dataLayer.find(row => row[0] === 'consent')[2];
    assert.equal(consent.ad_storage, 'denied'); assert.equal(consent.ad_user_data, 'denied');
    assert.doesNotMatch(JSON.stringify(w.dataLayer), /private-|Private research/);
    dom.window.close();
  }
});

test('app waits for effective route; counts navigation once, including different stocks, and excludes refreshes/filters', () => {
  const {dom, w, events, navigate} = setup({url: 'https://duckybot.app/en/app/#/stock/PRIVATE', page: 'app', consent: 'granted'});
  assert.equal(events().length, 0);
  navigate('#/stock/PRIVATE', 'stock'); navigate('#/stock/PRIVATE', 'stock');
  navigate('#/stock/PRIVATE?filter=private-filter', 'stock');
  assert.equal(events().length, 1);
  navigate('#/stock/SECRET', 'stock'); navigate('#/calendar', 'calendar');
  assert.deepEqual(events().map(e => e[2].page_location), [
    'https://duckybot.app/en/app/stock/', 'https://duckybot.app/en/app/stock/', 'https://duckybot.app/en/app/calendar/',
  ]);
  const update = w.dataLayer.filter(row => row[0] === 'config').at(-1)[2];
  assert.equal(update.update, true); assert.equal(update.send_page_view, false);
  assert.equal(update.page_location, events().at(-1)[2].page_location);
  assert.equal(events().at(-1)[2].page_referrer, 'https://duckybot.app/en/app/stock/');
  assert.doesNotMatch(JSON.stringify(w.dataLayer), /PRIVATE|SECRET|private-filter/); dom.window.close();
});

test('credential arrivals never load Google even after a cleaned URL; later auth routes are disabled', () => {
  for (const suffix of ['?code=credential#/oauth', '#/reset?token=credential', '?email=private-user#/login', '#tgWebAppData=credential']) {
    const {dom, d, w, events, navigate} = setup({url: 'https://duckybot.app/en/app/' + suffix, page: 'app', consent: 'granted'});
    navigate('/en/app/#/today', 'today'); assert.equal(events().length, 0);
    assert.equal(d.querySelector('script[src]'), null); assert.equal(w.dataLayer, undefined); dom.window.close();
  }
  const {dom, w, events, navigate} = setup({url: 'https://duckybot.app/en/app/#/today', page: 'app', route: 'today', consent: 'granted'});
  navigate('#/reset?token=credential', 'reset'); assert.equal(w['ga-disable-' + id], true);
  assert.equal(events().length, 1); assert.doesNotMatch(JSON.stringify(w.dataLayer), /credential/); dom.window.close();
});

test('revocation clears Google cookies, leaves app state intact, stops later views and restores focus', () => {
  const {dom, w, d, events, choose, navigate} = setup({url: 'https://duckybot.app/en/app/#/today', page: 'app', route: 'today', consent: 'granted'});
  w.document.cookie = '_ga=test;Path=/;Domain=duckybot.app;Secure';
  w.document.cookie = '_ga_TEST12345=test;Path=/;Secure';
  w.document.cookie = 'ducky_session=keep;Path=/;Secure';
  w.localStorage.setItem('ducky.session', 'keep');
  const manage = d.querySelector('[data-analytics-manage]'); manage.click(); choose('denied');
  assert.equal(d.activeElement, manage); assert.equal(w['ga-disable-' + id], true);
  assert.doesNotMatch(w.document.cookie, /_ga/); assert.match(w.document.cookie, /ducky_session=keep/);
  assert.equal(w.localStorage.getItem('ducky.session'), 'keep');
  navigate('#/calendar', 'calendar'); assert.equal(events().length, 1);
  choose('granted'); assert.equal(events().length, 2); assert.equal(d.querySelectorAll('script[src]').length, 1);
  w.localStorage.setItem(key, JSON.stringify({value: 'denied', at: Date.now()}));
  w.dispatchEvent(new w.StorageEvent('storage', {key})); navigate('#/creators', 'creators');
  assert.equal(events().length, 2); assert.equal(w['ga-disable-' + id], true); dom.window.close();
});

test('preview origins, invalid routes and unavailable storage cannot silently enable tracking', () => {
  const preview = setup({url: 'https://preview.ducky-site.pages.dev/en/', consent: 'granted'});
  assert.equal(preview.w.dataLayer, undefined); preview.dom.window.close();
  const app = setup({url: 'https://duckybot.app/en/app/#/private', page: 'app', consent: 'granted'});
  app.navigate('#/private', 'private'); assert.equal(app.events().length, 0); app.dom.window.close();
  const blocked = setup();
  Object.defineProperty(blocked.w, 'localStorage', {get() { throw new Error('blocked'); }});
  assert.doesNotThrow(() => blocked.choose('granted'));
  assert.equal(blocked.events().length, 1); blocked.dom.window.close();
});

test('build exposes the same public GA4 ID in all language shells; disabling it removes tag bootstrap and CSP exceptions', () => {
  const config = JSON.parse(readFileSync('site.config.json'));
  const active = Boolean(config.ga4_measurement_id);
  for (const page of ['index.html', 'en/index.html', 'zh/index.html', 'app/index.html', 'en/app/index.html', 'zh/app/index.html']) {
    const html = readFileSync('dist/' + page, 'utf8');
    assert.equal(/src="\/js\/analytics\.js/.test(html), active);
    assert.equal(html.includes('id="analytics-choice"'), active);
    assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//);
  }
  const headers = readFileSync('dist/_headers', 'utf8');
  assert.equal(headers.includes('https://www.googletagmanager.com'), active);
  assert.doesNotMatch(headers, /unsafe-eval|doubleclick|googlesyndication/);
  assert.doesNotMatch(headers.match(/script-src[^;]+/)[0], /unsafe-inline/);
  if (active) assert.match(readFileSync('dist/config.js', 'utf8'), new RegExp(config.ga4_measurement_id));
});
