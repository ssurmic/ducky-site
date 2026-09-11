import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {JSDOM} from 'jsdom';

const config=name=>{const context={window:{}};runInNewContext(readFileSync('dist/'+name,'utf8'),context);return context.window.DUCKY;};
test('the bilingual same-origin trial shares the release graph while default navigation follows its own flag',()=>{
 const normal=config('config.js'),trial=config('focus-config.js');
 assert.equal(trial.PRODUCT_FOCUS_ENABLED,true);
 assert.equal(normal.SHARED_STOCK_BRIEFS_ENABLED,true);
 assert.equal(normal.API_BASE,trial.API_BASE);
 for(const prefix of ['zh/', 'en/']){
  const read=path=>new JSDOM(readFileSync('dist/'+path,'utf8')).window.document;
  const current=read(prefix+'app/index.html'),preview=read(prefix+'app/preview/index.html');
  assert.equal(Boolean(current.querySelector('.focus-nav')),normal.PRODUCT_FOCUS_ENABLED);
  assert.deepEqual([...preview.querySelectorAll('.focus-nav [data-route]')].map(n=>n.dataset.route),['today','watchlist','explore','calendar','creators']);
  assert.match(preview.querySelector('[data-lang-toggle]').getAttribute('href'),/\/app\/preview\/$/);
  assert.ok(preview.querySelector('script[src^="/focus-config.js?v="]'));
  assert.equal(preview.querySelector('script[type="module"]').src,current.querySelector('script[type="module"]').src);
 }
});
