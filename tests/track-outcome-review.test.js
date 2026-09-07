import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const script=readFileSync('public/js/track.js','utf8');

for (const lang of ['zh','en'])test('specific disputed horizons retain old/current evidence and all rows: '+lang,async()=>{
 const dom=new JSDOM(`<html lang="${lang}"><body><main id="track" data-l10n="{}"><table id="ledger"><tbody></tbody></table><table id="rates"><tbody></tbody></table><p id="backtest-line"></p></main></body></html>`,{runScripts:'outside-only',url:'https://ducky.test/track-record/'});
 const review={checked_at:'2026-09-07T07:29:46Z',affected_fields:['r1'],differences:{r1:{recorded:.3564,recomputed:.5903}}};
 const data={rows:[{ticker:'SGI',kind:'insider',ts:'2026-08-27T22:15:03Z',mode:'LIVE',direction:1,r1:.3564,r5:-5,r20:null,outcome_review:review},
                  {ticker:'MU',kind:'insider',ts:'2026-08-26T22:00:00Z',mode:'LIVE',direction:1,r1:0,r5:-10,r20:-20}],
   by_source:[{kind:'insider',mode:'LIVE',n:2,hit5:50,hit20:null,avg20:null,review_horizons:['20d'],reported_metrics:{hit20:50,avg20:-10}}],
   reconciliation:{rows_needing_review:1,checked_at:review.checked_at},backtest:{}};
 dom.window.fetch=async()=>({ok:true,json:async()=>data});dom.window.eval(script);
 await new Promise(resolve=>setTimeout(resolve,0));
 const doc=dom.window.document,rows=doc.querySelectorAll('#ledger tbody tr');
 assert.equal(rows.length,2);const cell=rows[0].children[3];
 assert.match(cell.textContent,/0.3564%/);assert.match(cell.textContent,/0.5903%/);
 assert.match(cell.textContent,lang==='zh'?/待核对/:/Needs review/);
 assert.match(rows[0].children[4].textContent,/-5.0%/);assert.match(rows[1].children[3].textContent,/0.0%/);
 assert.equal(doc.querySelectorAll('#rates .outcome-review').length,2);
 assert.ok(doc.querySelector('#outcome-review-note'));assert.equal(data.rows[0].r1,.3564);
 dom.window.close();
});
