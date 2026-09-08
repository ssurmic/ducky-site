import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const json=path=>JSON.parse(readFileSync(path,'utf8'));
test('readable records retain every closed, open and losing position and compose filters',()=>{
 const dom=new JSDOM(readFileSync('dist/research-records/index.html','utf8'),{runScripts:'outside-only'});
 const d=dom.window.document,source=json('public/oversold-research.json').evaluation;
 const rows=[...d.querySelectorAll('[data-records-row]')];
 assert.equal(rows.length,source.trades.length+source.open.length);
 assert.equal(d.querySelectorAll('[data-records-row] td.neg').length,source.trades.filter(r=>r.price_return_net_pct<0).length);
 dom.window.eval(readFileSync('public/js/research-records.js','utf8'));
 const ticker=d.querySelector('[data-records-ticker]'),status=d.querySelector('[data-records-status]');
 status.value='open';status.dispatchEvent(new dom.window.Event('change'));
 assert.equal(rows.filter(r=>!r.hidden).length,source.open.length);
 ticker.value=source.open[0].ticker;ticker.dispatchEvent(new dom.window.Event('change'));
 assert.ok(rows.filter(r=>!r.hidden).every(r=>r.dataset.ticker===ticker.value&&r.dataset.status==='open'));
 ticker.value=json('public/oversold-research.json').universe.find(t=>!source.open.some(r=>r.ticker===t));ticker.dispatchEvent(new dom.window.Event('change'));
 assert.equal(d.querySelector('[data-records-empty]').hidden,false);
 status.value='';ticker.value='';ticker.dispatchEvent(new dom.window.Event('change'));
 assert.equal(rows.filter(r=>!r.hidden).length,rows.length);
});
test('homepage previews all tools without private research and keeps sourced examples',()=>{
 for(const prefix of ['', 'en/']) {
  const d=new JSDOM(readFileSync(`dist/${prefix}index.html`,'utf8')).window.document;
  assert.equal(d.querySelectorAll('.desk-feature').length,14);
  assert.equal(d.querySelectorAll('.member-preview-card script,.member-preview-card template,.member-preview-card [data-ticker]').length,0);
  assert.equal(d.querySelectorAll('.proof-case').length,0);
  assert.ok(d.querySelector(`.oversold-study a[href^="/${prefix}research-records/#positions"]`));
  assert.equal(d.querySelectorAll('.oversold-study a[href^="/oversold-research.json"]').length,0);
  assert.ok(d.querySelector(`.home-hero a[href="/${prefix}app/#/register"]`));
  const links=[...d.querySelectorAll('.video-source-points a')];
  assert.equal(links.length,3);
  assert.deepEqual(links.map(a=>new URL(a.href).searchParams.get('t')),['3s','349s','700s']);
 }
});
test('storefront keeps core benefits and checkout visible with optional comparison details',()=>{
 const prices=json('site.config.json').prices.pro;
 for(const prefix of ['', 'en/']) {
  const d=new JSDOM(readFileSync(`dist/${prefix}index.html`,'utf8')).window.document,p=d.querySelector('#pricing');
  assert.equal(p.querySelectorAll('.desk-plan').length,2);
  assert.equal(p.closest('details'),null);
  assert.equal(p.querySelector('.desk-plan-pro').closest('details'),null);
  assert.equal(p.querySelector('.desk-plan-benefits').children.length,3);
  assert.equal(p.querySelector('details').open,false);
  assert.ok(p.textContent.includes('$'+prices.monthly_usd));
  assert.ok(p.textContent.includes('$'+prices.annual_usd));
  assert.equal(p.textContent.includes('¥'+prices.annual_cny),prefix==='');
  assert.equal(p.querySelector(".desk-plan-actions a").getAttribute("href"), `/${prefix}app/#/billing?currency=${prefix?'USD':'CNY'}&months=${prefix?'1':'12'}`);
  assert.ok(p.querySelector(`a[href="/${prefix}app/#/register"]`));
 }
});
