// Synthetic fixture only: serve a build with `scripts/research_brief_qa.py --product-focus` (port 8920),
// then add a stock found by the search box and record what the list shows afterwards. No production
// account, API or network. QA_OUTPUT=<dir> chooses the evidence directory; QA_RECORD_ONLY=1 records
// without asserting (used for the before-fix run of 2026-09-12).
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
const base=process.env.QA_BASE||'http://127.0.0.1:8920',output=process.env.QA_OUTPUT||'reports/watchlist-add-filter-20260912/after';
const recordOnly=process.env.QA_RECORD_ONLY==='1';
await mkdir(output,{recursive:true});
const browser=await chromium.launch();const results=[];
for(const [width,lang,theme] of [[1440,'en','dark'],[390,'zh','light']]){
 const copy=JSON.parse(readFileSync('i18n/'+lang+'.json')),txt=key=>copy['app.'+key];
 const context=await browser.newContext({viewport:{width,height:width<700?760:900},colorScheme:theme});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 const label=lang+'-'+width,result={label,width,lang,theme,data:'synthetic fixture, in-memory membership'};
 const state=async()=>({count:await page.locator('#watch-count').innerText(),rows:await page.locator('tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.readingAnchor)),
  search:await page.getByRole('combobox',{name:txt('watch.filter')}).inputValue(),offer_hidden:await page.locator('.watch-search-offer').isHidden(),
  focused:await page.evaluate(()=>document.activeElement?.dataset?.readingKey||document.activeElement?.tagName)});
 try{
  await page.goto(base+'/qa-frame?lang='+lang+'&theme='+theme+'&route=watchlist&case=watchlist-add');
  await page.locator('tbody tr').nth(2).waitFor();
  result.before=await state();
  await page.getByRole('combobox',{name:txt('watch.filter')}).fill('COIN');
  await page.getByRole('option').filter({hasText:'COIN'}).click();
  await page.getByRole('button',{name:txt('watch.add_to_watchlist'),exact:true}).click();
  await page.locator('tbody tr[data-reading-anchor="COIN"]').waitFor();
  await page.waitForTimeout(500);
  result.after=await state();
  await page.screenshot({path:output+'/'+label+'-after-add.png'});
  if(!recordOnly){
   assert.deepEqual([...result.after.rows].sort(),['AMD','AVGO','COIN','NVDA']);
   assert.equal(result.after.search,'');assert.equal(result.after.offer_hidden,true);
   assert.match(result.after.count,/4/);assert.equal(result.after.focused,'COIN:name');
  }
  assert.deepEqual(errors,[]);result.status='passed';
 }catch(error){result.status='failed';result.error=String(error);result.pageErrors=errors;await page.screenshot({path:output+'/'+label+'-failure.png'}).catch(()=>{});}
 console.log(JSON.stringify(result));results.push(result);await context.close();
}
await browser.close();
await writeFile(output+'/browser-results.json',JSON.stringify(results,null,2)+'\n');
if(results.some(r=>r.status!=='passed'))process.exitCode=1;
