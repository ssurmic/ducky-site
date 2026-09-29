// Isolated synthetic route acceptance; no production browser/account or outbound API.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:8951',output=process.env.QA_OUTPUT||'/tmp/ducky-creator-native-page-browser';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));await mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 for(const width of [320,390,1440])for(const lang of ['zh','en'])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:width<700?700:900},hasTouch:width<700,colorScheme:theme});
  const page=await context.newPage(),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():(external.push(route.request().url()),route.abort()));
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&case=native-creator#/explore`);
  await page.locator('.creator-opinion').first().waitFor();const claim=await page.locator('.opinion-claim').first().textContent();
  await page.locator('.opinion-author').first().click();
  await page.locator('.creator-selected-heading').waitFor();await page.locator('.creator-native-opinions .creator-opinion').first().waitFor();
  await page.waitForFunction(()=>{let n=document.querySelector('.creator-native-opinions');while(n){if(Number(getComputedStyle(n).opacity)!==1)return false;n=n.parentElement;}return true;});
  assert.equal(await page.locator('.creator-native-opinions .opinion-claim').first().textContent(),claim);
  assert.equal(await page.locator('.creator-native-opinions').evaluate(n=>!!n.closest('details')),false);
  assert.equal(await page.locator('.creator-native-opinions .creator-opinion').count(),3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${output}/${lang}-${theme}-${width}-creator.png`,animations:'disabled'});
  const measure=await page.locator('.creator-native-opinions').evaluate(n=>({viewport:innerWidth,top:n.getBoundingClientRect().top,
   first:n.querySelector('.creator-opinion').getBoundingClientRect().toJSON(),claimFont:getComputedStyle(n.querySelector('.opinion-claim')).fontSize,
   batchBelow:!!(n.compareDocumentPosition(document.querySelector('.creator-delivery-progress'))&Node.DOCUMENT_POSITION_FOLLOWING),
   targets:[...n.querySelectorAll('a,button,summary')].filter(e=>e.getBoundingClientRect().height).map(e=>e.getBoundingClientRect().height)}));
  assert.ok(measure.batchBelow);assert.ok(measure.targets.every(h=>h>=44));
  const details=page.locator('.creator-native-opinions .opinion-records').first();await details.locator(':scope > summary').click();
  await page.locator('.creator-native-opinions .creator-opinions-heading button').click();
  await page.waitForFunction(()=>!document.querySelector('.creator-native-opinions .creator-opinions-heading button').disabled);
  assert.equal(await details.getAttribute('open'),'');
  assert.match(await page.locator('.creator-native-opinions .opinion-original').first().getAttribute('href'),/&t=32s$/);
  await page.locator('.creator-delivery-progress').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${output}/${lang}-${theme}-${width}-historical-batch.png`,animations:'disabled'});
  assert.match(await page.locator('.creator-delivery-progress').textContent(),lang==='en'?/Historical summary batch/:/历史摘要批次/);
  assert.match(await page.locator('.creator-delivery-progress').textContent(),/2026-09-23.*2026-09-29/);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  results.push({width,lang,theme,measure});await context.close();
 }
}finally{await browser.close();await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify({passed:results.length,output}));
