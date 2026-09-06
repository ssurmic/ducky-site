import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>');
for(const k of ['window','document','Node'])globalThis[k]=dom.window[k];
const copy=JSON.parse(readFileSync('i18n/en.json'));const text=document.createElement('script');text.id='ducky-strings';text.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(text);
const {observations,stats,renderSeasonality,mountSeasonality}=await import('../public/js/app/seasonality.js');
const {localizedPrice,railForCurrency}=await import('../public/js/app/views/billing.js');
const data=JSON.parse(readFileSync('public/seasonality.json'));
test('snapshot month returns reconcile to dated adjusted closes and omit unfinished months',()=>{
 assert.equal(data.rows.length,320);assert.equal(data.as_of,'2026-08-31');
 for(const row of data.rows)for(const ticker of ['SPY','QQQ']) {
  const p=row[ticker];assert.equal(p.date.slice(0,7),`${row.year}-${String(row.month).padStart(2,'0')}`);
  assert.ok(p.date>p.previous_date);assert.ok(p.date<=data.as_of);
  assert.ok(Math.abs((p.adjusted_close/p.previous_adjusted_close-1)*100-p.return_pct)<0.000001);
 }
 assert.equal(observations(data,9).length,26);
 assert.equal(observations(data,8).length,27);
 const midterm=observations(data,9,true);
 assert.deepEqual(midterm.map(r=>r.year),[2002,2006,2010,2014,2018,2022]);
 assert.ok(midterm.some(r=>r.SPY<0)&&midterm.some(r=>r.QQQ<0));
});
test('year-end windows compound returns and require every remaining month',()=>{
 const rows=observations(data,9,true,true);assert.equal(rows.length,6);
 const selected=rows.find(r=>r.year===2022);
 for(const ticker of ['SPY','QQQ']) {
  const period=data.rows.filter(r=>r.year===2022&&r.month>9);
  const direct=(period.at(-1)[ticker].adjusted_close/period[0][ticker].previous_adjusted_close-1)*100;
  assert.ok(Math.abs(selected[ticker]-direct)<0.00001);
 }
 assert.equal(observations(data,12,false,true).length,0);
 assert.equal(observations({...data,rows:data.rows.filter(r=>!(r.year===2022&&r.month===11))},9,true,true).length,5);
 assert.deepEqual(stats([-10,0,5,20]),{n:4,mean:3.75,median:2.5,positive:2,worst:-10,best:20});
});
test('month slider, cycle filter and return window update the same loss-inclusive chart',()=>{
 const root=document.createElement('section');renderSeasonality(root,data,9);
 const slider=root.querySelector('input');assert.equal(slider.getAttribute('aria-valuetext'),'September');
 assert.equal(root.querySelectorAll('.season-year').length,26);
 root.querySelector('.season-controls button').click();assert.equal(root.querySelectorAll('.season-year').length,6);
 const select=root.querySelector('select');select.value='after';select.dispatchEvent(new window.Event('change'));
 assert.equal(root.querySelectorAll('.season-year').length,6);
 slider.value='12';slider.dispatchEvent(new window.Event('input'));
 assert.equal(root.querySelectorAll('.season-year').length,0);assert.ok(root.querySelector('.data-notice'));
 slider.value='1';slider.dispatchEvent(new window.Event('input'));
 assert.equal(root.querySelectorAll('.season-year').length,6);
 assert.ok(root.querySelector('a[href^="https://www.fec.gov/"]'));
});
test('disposed history panel ignores delayed data',async()=>{
 let resolve;globalThis.fetch=()=>new Promise(r=>resolve=r);
 const root=document.createElement('section'),cleanup=mountSeasonality(root);cleanup();
 resolve(new Response(JSON.stringify(data)));await new Promise(r=>setTimeout(r,0));
 assert.equal(root.querySelectorAll('.season-year').length,0);
});
test('billing prices follow locale while payment amounts keep their actual denomination',()=>{
 const p={annual_usd:90,monthly_usd:9,annual_cny:499};
 assert.ok(localizedPrice(p,12,'USD').startsWith('$90'));
 assert.ok(localizedPrice(p,12,'CNY').startsWith('¥499'));
 assert.equal(railForCurrency('manual_alipay','USD'),false);assert.equal(railForCurrency('manual_wechat','CNY'),true);
 assert.equal(railForCurrency('stars','USD'),true);assert.equal(railForCurrency('stripe','USD'),true);
});
