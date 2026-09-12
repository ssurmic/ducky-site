import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {renderBrandNavigation} from '../public/js/app/navigation.js';

test('brand link stays in the app before boot and returns signed-in users to watchlist in both languages',()=>{
 for(const lang of ['en','zh']){
  const dom=new JSDOM(readFileSync(`dist/${lang}/app/index.html`,'utf8'),{url:`https://ducky.test/${lang}/app/#/today`});
  globalThis.document=dom.window.document;
  const brand=document.querySelector('.app-top .brand');
  assert.equal(brand.getAttribute('href'),'#/watchlist');
  renderBrandNavigation(null);
  assert.equal(brand.getAttribute('href'),`/${lang}/`);
  renderBrandNavigation({user_id:1});
  assert.equal(brand.getAttribute('href'),'#/watchlist');
  assert.equal(brand.getAttribute('aria-label'),brand.dataset.watchlistLabel);
  assert.notEqual(brand.id,'logout');
  assert.ok(brand.querySelector('img[src="/duck-head-cutout-v1.png"]'));
  dom.window.close();
 }
});
