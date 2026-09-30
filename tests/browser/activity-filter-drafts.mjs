// Regression for clearing a committed keyword and submitting another filter before debounce.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:8953',output=process.env.QA_OUTPUT||'/tmp/ducky-activity-filter-drafts';
await mkdir(output,{recursive:true});const browser=await chromium.launch(),results=[];
for(const width of [390,1440])for(const lang of ['zh','en'])for(const theme of ['dark','light']){
 const context=await browser.newContext({viewport:{width,height:width===390?700:900},hasTouch:width===390,isMobile:width===390,colorScheme:theme});
 const page=await context.newPage(),label=[width,lang,theme].join('-'),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const visit=async()=>{await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=boards&case=ux-review#/boards?mode=archive&board=insider&q=BABA&content=all&direction=-1&days=7&purchases=all`);await page.locator('.radar-filters [name=q]').waitFor();};
 const query=()=>new URLSearchParams(new URL(page.url()).hash.split('?')[1]);
 try{
  await visit();await page.locator('.radar-filter-toggle').click();
  await page.locator('.radar-filters [name=q]').fill('');
  await page.locator('.radar-filters [name=ticker]').fill('TEM');await page.locator('.radar-filters [name=ticker]').press('Enter');
  await page.waitForTimeout(650);
  assert.equal(query().has('q'),false,'cleared keyword must not be restored');assert.equal(query().get('ticker'),'TEM');assert.equal(await page.locator('[name=q]').inputValue(),'');
  await visit();await page.locator('[name=q]').fill('');await page.locator('[name=q]').press('Enter');await page.waitForTimeout(650);
  assert.equal(query().has('q'),false);assert.equal(await page.locator('[name=q]').inputValue(),'');
  await page.locator('[name=q]').fill('NVDA');await page.locator('[data-insider-direction="1"]').click();await page.locator('[data-insider-cap=mega]').click();await page.waitForTimeout(650);
  assert.equal(query().get('q'),'NVDA');assert.equal(query().get('direction'),'1');assert.equal(query().get('cap'),'mega');
  assert.deepEqual(errors,[]);results.push({label,status:'passed'});
 }catch(error){results.push({label,status:'failed',error:String(error),errors,url:page.url()});await page.screenshot({path:output+'/'+label+'.png'});}
 await context.close();
}
await browser.close();await writeFile(output+'/results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status==='failed'))process.exitCode=1;
