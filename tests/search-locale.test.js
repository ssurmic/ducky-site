import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {legacyAuthLocaleTarget} from '../public/js/app/locale-route.js';

const site='https://duckybot.app';
const read=path=>new JSDOM(readFileSync(`dist/${path}`,'utf8')).window.document;

test('every default HTML route serves English; locale links and canonical URLs agree',()=>{
  for(const route of ['', 'app/', 'app/preview/', 'track-record/', 'research-records/', 'ideas/', 'privacy/', 'disclaimer/']) {
    const root=read(route+'index.html'),en=read('en/'+route+'index.html'),zh=read('zh/'+route+'index.html');
    assert.equal(root.documentElement.lang,'en');
    assert.equal(root.documentElement.dataset.lang,'en');
    assert.equal(zh.documentElement.lang,'zh-CN');
    assert.equal(root.documentElement.outerHTML,en.documentElement.outerHTML);
    assert.equal(root.querySelector('[data-lang-toggle]').getAttribute('href'),'/zh/'+route);
    assert.equal(zh.querySelector('[data-lang-toggle]').getAttribute('href'),'/en/'+route);
    if(route!=='app/preview/') {
      assert.equal(en.querySelector('[rel=canonical]').href,site+'/en/'+route);
      assert.equal(zh.querySelector('[rel=canonical]').href,site+'/zh/'+route);
      for(const doc of [root,en,zh]) {
        assert.equal(doc.querySelector('[hreflang=en]').href,site+'/en/'+route);
        assert.equal(doc.querySelector('[hreflang="zh-CN"]').href,site+'/zh/'+route);
      }
    }
  }
  for(const prefix of ['', 'en/', 'zh/']) {
    const lang=prefix==='zh/'?'zh':'en';
    const manifest=JSON.parse(readFileSync('dist/'+prefix+'manifest.webmanifest'));
    assert.equal(manifest.start_url,'/'+lang+'/');
    const app=read(prefix+'app/index.html');
    const strings=JSON.parse(app.querySelector('#ducky-strings').textContent);
    assert.equal(strings.title,JSON.parse(readFileSync('i18n/'+lang+'.json'))['app.title']);
    assert.match(app.querySelector('[name=robots]').content,/noindex/);
  }
});

test('sitemap lists only canonical indexable public pages with reciprocal language alternatives',()=>{
  const sitemap=new JSDOM(readFileSync('dist/sitemap.xml','utf8'),{contentType:'text/xml'}).window.document;
  const locations=[...sitemap.getElementsByTagName('loc')].map(n=>n.textContent);
  assert.equal(new Set(locations).size,locations.length);
  assert.ok(locations.includes(site+'/en/')&&locations.includes(site+'/zh/'));
  assert.equal(sitemap.getElementsByTagName('lastmod').length,0,'build date is not a content modification date');
  for(const url of locations) {
    assert.match(url,/^https:\/\/duckybot\.app\/(en|zh)\//);
    assert.doesNotMatch(url,/\/(app|idea|404)(\/|\.|$)/);
    const path=new URL(url).pathname.slice(1),doc=read(path+'index.html');
    assert.equal(doc.querySelector('[rel=canonical]').href,url);
    assert.equal(doc.querySelector('[name=robots]'),null);
    for(const alternate of doc.querySelectorAll('link[rel=alternate]')) assert.ok(locations.includes(alternate.href));
  }
  const robots=readFileSync('dist/robots.txt','utf8');
  assert.ok(robots.includes('Sitemap: '+site+'/sitemap.xml'));
  assert.doesNotMatch(robots,/Disallow:.*(?:app|en|zh)/);
  for(const prefix of ['', 'en/', 'zh/'])for(const path of ['404.html','idea/index.html']) {
    assert.match(read(prefix+path).querySelector('[name=robots]').content,/noindex/);
  }
});

test('Google verification and brand structured data survive at every homepage',()=>{
  const cfg=JSON.parse(readFileSync('site.config.json'));
  for(const prefix of ['', 'en/', 'zh/']) {
    const home=read(prefix+'index.html');
    assert.equal(home.querySelector('[name=google-site-verification]').content,cfg.google_site_verification);
    const graph=JSON.parse(home.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
    assert.equal(graph.find(x=>x['@type']==='WebSite').name,'Ducky Bot');
    assert.equal(graph.find(x=>x['@type']==='Organization').logo,site+'/duck-head-cutout-v1.png');
  }
});

test('legacy Chinese recovery keeps the exact fragment without touching normal English routes',()=>{
  for(const route of ['oauth','oauth?error=provider_unavailable','oauth?linked=1','reset?token=test-only']) {
    const loc=new URL(site+'/app/#/'+route);
    assert.equal(legacyAuthLocaleTarget(loc),'/zh/app/#/'+route);
    for(const lang of ['en','zh'])assert.equal(legacyAuthLocaleTarget(new URL(site+'/'+lang+'/app/#/'+route)),null);
  }
  for(const route of ['login','watchlist','forgot','oauth-malformed','resetting']) {
    assert.equal(legacyAuthLocaleTarget(new URL(site+'/app/#/'+route)),null);
  }
});
