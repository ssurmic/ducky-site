import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';

const source = () => readFileSync(new URL('../public/js/language-preference.js', import.meta.url), 'utf8');

function browser({url = 'https://duckybot.app/', cookie = '', languages = ['en-US'], language = 'en-US', blocked = false, html = ''} = {}) {
  const dom = new JSDOM(html, {url});
  const current = new URL(url), redirects = [], writes = [];
  const location = {
    href: current.href, origin: current.origin, protocol: current.protocol,
    pathname: current.pathname, search: current.search, hash: current.hash,
    replace: target => redirects.push(new URL(target, current).href),
  };
  Object.defineProperty(dom.window.document, 'cookie', {
    configurable: true,
    get() { if (blocked) throw new Error('Cookies unavailable'); return cookie; },
    set(value) { if (blocked) throw new Error('Cookies unavailable'); writes.push(value); cookie = value.split(';')[0]; },
  });
  const context = {document: dom.window.document, location, navigator: {languages, language}, URL};
  context.window = context;
  vm.runInNewContext(source(), context);
  return {
    document: dom.window.document, redirects, writes,
    click(selector) {
      const event = new dom.window.MouseEvent('click', {bubbles: true, cancelable: true});
      // Keep JSDOM from trying to follow a real link after the preference listener.
      dom.window.document.addEventListener('click', event => event.preventDefault(), {once: true});
      dom.window.document.querySelector(selector).dispatchEvent(event);
      return event;
    },
    close: () => dom.window.close(),
  };
}

test('saved language takes precedence over the browser profile without another cookie write', () => {
  for (const [cookie, languages, expected] of [
    ['session=opaque; ducky_lang=zh', ['en-US'], 'zh'],
    ['other_ducky_lang=zh; ducky_lang=en', ['zh-CN'], 'en'],
  ]) {
    const page = browser({cookie, languages});
    assert.deepEqual(page.redirects, expected === 'en' ? [] : ['https://duckybot.app/zh/']);
    assert.deepEqual(page.writes, []);
    page.close();
  }
});

test('first visit uses the first supported browser language, including regional Chinese', () => {
  for (const [languages, language, expected] of [
    [['fr-FR', 'zh-Hant-TW', 'en-US'], 'en-US', 'zh'],
    [['en-GB', 'zh-CN'], 'zh-CN', 'en'],
    [['zh-TW'], 'en-US', 'zh'],
    [['de-DE'], 'zh-CN', 'zh'],
    [[], 'zh-CN', 'zh'],
    [undefined, 'en-US', 'en'],
    [['fr-FR'], 'fr-FR', 'en'],
  ]) {
    const page = browser({languages, language});
    assert.deepEqual(page.redirects, expected === 'en' ? [] : ['https://duckybot.app/zh/']);
    assert.deepEqual(page.writes, []);
    page.close();
  }
});

test('invalid or unrelated saved values fall back to browser preference', () => {
  for (const cookie of ['ducky_lang=fr', 'ducky_lang=', 'ducky_lang=%E0%A4%A', 'other_ducky_lang=en']) {
    const page = browser({cookie, languages: ['zh-CN']});
    assert.deepEqual(page.redirects, ['https://duckybot.app/zh/']);
    assert.deepEqual(page.writes, []);
    page.close();
  }
});

test('default routes retain the exact path, query and fragment when choosing a language', () => {
  for (const path of [
    '/app/?notice=one%20two#/creators?id=42&source=video',
    '/app/preview/?mode=sample#/watchlist',
    '/ideas/example-smh-kindex-2026-08/?ref=archive#idea-thesis',
    '/privacy/?from=footer#retention',
    '/index.html?ref=old#pricing',
  ]) {
    const page = browser({url: 'https://duckybot.app' + path, languages: ['zh-CN']});
    assert.deepEqual(page.redirects, ['https://duckybot.app/zh' + path]);
    page.close();
  }
});

test('explicit language links stay authoritative and do not change the saved choice', () => {
  for (const path of ['/en/', '/zh/', '/en/app/#/watchlist', '/zh/ideas/example/#idea-thesis']) {
    const page = browser({url: 'https://duckybot.app' + path, cookie: 'ducky_lang=zh', languages: ['en-US']});
    assert.deepEqual(page.redirects, []);
    assert.deepEqual(page.writes, []);
    page.close();
  }
});

test('legacy callback and reset links remain under the existing auth locale owner', () => {
  for (const path of ['/app', '/app/', '/app/index.html']) {
    for (const hash of ['#/oauth', '#/oauth?code=opaque%2Bvalue', '#/reset?token=opaque-token']) {
      const page = browser({url: 'https://duckybot.app' + path + '?notice=kept' + hash, cookie: 'ducky_lang=en'});
      assert.deepEqual(page.redirects, []);
      assert.deepEqual(page.writes, []);
      page.close();
    }
  }
  for (const hash of ['#/login', '#/forgot', '#/resetting', '#/oauth-malformed']) {
    const page = browser({url: 'https://duckybot.app/app/' + hash, languages: ['zh-CN']});
    assert.deepEqual(page.redirects, ['https://duckybot.app/zh/app/' + hash]);
    page.close();
  }
});

test('header and footer language choices persist a root-scoped one-year cookie', () => {
  for (const [attribute, destination, language] of [
    ['data-lang-toggle', '/zh/app/#/watchlist', 'zh'],
    ['data-lang-toggle-footer', '/en/ideas/example/#idea-thesis', 'en'],
  ]) {
    const page = browser({url: 'https://duckybot.app/en/', html: `<a ${attribute} href="${destination}"><span>Switch</span></a>`});
    assert.deepEqual(page.writes, []);
    page.click('span');
    assert.equal(page.writes.length, 1);
    const parts = page.writes[0].split(';').map(part => part.trim().toLowerCase());
    assert.ok(parts.includes('ducky_lang=' + language));
    assert.ok(parts.includes('path=/'));
    assert.ok(parts.includes('max-age=31536000'));
    assert.ok(parts.includes('samesite=lax'));
    assert.ok(parts.includes('secure'));
    assert.deepEqual(page.redirects, []);
    page.close();
  }
});

test('delegated persistence supports later controls and reset handlers that prevent navigation', () => {
  const page = browser({url: 'https://duckybot.app/en/app/#/reset'});
  page.document.body.innerHTML = '<a data-lang-toggle href="/zh/app/#/reset"><span>中文</span></a>';
  const link = page.document.querySelector('a');
  let cookieAtRecoveryHandler = null;
  link.addEventListener('click', event => {
    cookieAtRecoveryHandler = page.writes.at(-1);
    event.preventDefault();
    event.stopPropagation();
  });
  const event = page.click('span');
  assert.equal(event.defaultPrevented, true);
  assert.match(cookieAtRecoveryHandler, /^ducky_lang=zh;/);
  assert.deepEqual(page.redirects, []);
  assert.equal(link.getAttribute('href'), '/zh/app/#/reset');
  page.close();
});

test('ordinary links and external language-looking links cannot change preference', () => {
  for (const markup of [
    '<a href="/zh/">Chinese article</a>',
    '<a data-lang-toggle href="https://other.test/zh/">Other site</a>',
    '<a data-lang-toggle href="/fr/">Unsupported</a>',
    '<a data-lang-toggle href="javascript:void(0)">Invalid</a>',
  ]) {
    const page = browser({url: 'https://duckybot.app/en/', html: markup});
    page.click('a');
    assert.deepEqual(page.writes, []);
    page.close();
  }
});

test('blocked cookies do not interrupt browser routing or explicit language switching', () => {
  const initial = browser({blocked: true, languages: ['zh-CN']});
  assert.deepEqual(initial.redirects, ['https://duckybot.app/zh/']);
  initial.close();
  const page = browser({url: 'https://duckybot.app/en/', blocked: true, html: '<a data-lang-toggle href="/zh/">中文</a>'});
  assert.doesNotThrow(() => page.click('a'));
  assert.equal(page.document.querySelector('a').getAttribute('href'), '/zh/');
  assert.deepEqual(page.redirects, []);
  page.close();
});

test('local HTTP language choices omit Secure so local browser verification works', () => {
  const page = browser({url: 'http://localhost:8080/en/', html: '<a data-lang-toggle href="/zh/">中文</a>'});
  page.click('a');
  assert.equal(page.writes.length, 1);
  assert.doesNotMatch(page.writes[0], /(?:^|;)\s*Secure(?:;|$)/i);
  page.close();
});

test('locale selection loads synchronously before the public and app scripts', () => {
  for (const file of ['templates/_base.html', 'templates/app.html']) {
    const template = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    const scripts = [...template.matchAll(/<script\b([^>]*)\bsrc="([^"]+)"[^>]*>/g)];
    const selection = scripts.findIndex(match => match[2] === '/js/language-preference.js');
    assert.ok(selection >= 0, `${file} includes locale selection`);
    assert.equal(selection, 0, `${file} chooses locale before other external scripts`);
    assert.doesNotMatch(scripts[selection][0], /\b(?:defer|async)\b|type="module"/);
    assert.ok(template.indexOf(scripts[selection][0]) < template.indexOf('</head>'));
  }
});


test('a signed-in reader\'s toggle is saved on the account with a keepalive request; without a session nothing is sent', () => {
  for (const [token, expectedCalls] of [['tok.en', 1], [null, 0]]) {
    const dom = new JSDOM('<a data-lang-toggle href="/zh/app/#/today">中文</a>', {url: 'https://duckybot.app/app/#/today'});
    const current = new URL('https://duckybot.app/app/#/today'), writes = [], requests = [];
    const location = {href: current.href, origin: current.origin, protocol: current.protocol, pathname: current.pathname,
      search: current.search, hash: current.hash, replace: () => {}};
    Object.defineProperty(dom.window.document, 'cookie', {configurable: true, get() { return ''; }, set(value) { writes.push(value); }});
    const context = {document: dom.window.document, location, navigator: {languages: ['en-US'], language: 'en-US'}, URL,
      localStorage: {getItem: key => (key === 'ducky.token' ? token : null)}, DUCKY: {API_BASE: 'https://api.duckybot.app/'},
      fetch: (url, init) => { requests.push({url, init}); return Promise.resolve({ok: true}); }, JSON};
    context.window = context;
    vm.runInNewContext(source(), context);
    const event = new dom.window.MouseEvent('click', {bubbles: true, cancelable: true});
    dom.window.document.addEventListener('click', e => e.preventDefault(), {once: true});
    dom.window.document.querySelector('a').dispatchEvent(event);
    assert.equal(requests.length, expectedCalls, `token ${token}`);
    if (expectedCalls) {
      assert.equal(requests[0].url, 'https://api.duckybot.app/me/profile');
      assert.equal(requests[0].init.method, 'POST');
      assert.equal(requests[0].init.keepalive, true);
      assert.equal(requests[0].init.headers.Authorization, 'Bearer tok.en');
      assert.deepEqual(JSON.parse(requests[0].init.body), {lang: 'zh'});
    }
    assert.match(writes[0], /^ducky_lang=zh;/);
    dom.window.close();
  }
});
