// Loopback fixture acceptance: pointer routing, empty membership and source-owned market values.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:8954',output=process.env.QA_OUTPUT||'/tmp/ducky-explore-today';
await mkdir(output,{recursive:true});const browser=await chromium.launch(),results=[];
for(const width of [320,390,820,1440])for(const lang of ['zh','en'])for(const theme of ['dark','light']){
 const context=await browser.newContext({viewport:{width,height:width===320?600:width===390?700:900},hasTouch:width<500,isMobile:width<500,colorScheme:theme,reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[],label=`${width}-${lang}-${theme}`;page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
 const checkNav=async key=>{
  await page.locator(`[data-explore-destination=${key}][aria-current=page]`).waitFor();
  assert.equal(await page.locator('.explore-primary-tools [aria-current=page]').count(),1);
  const controls=await page.locator('.explore-primary-tools>a').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {height:r.height,x:r.x,right:r.right,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};}));
  assert.ok(controls.every(r=>r.height>=44&&r.x>=0&&r.right<=innerWidthForTest+1&&r.hit));
 };
 const innerWidthForTest=width;
 try{
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=explore&case=ux-review`);
  await page.locator('.insider-record').first().waitFor();await checkNav('activity');
  assert.equal(await page.locator('.explore-stock-list').count(),0);
  assert.equal(await page.locator('.radar-categories button').count(),4);
  const first=await page.locator('.insider-record').first().boundingBox();
  await page.screenshot({path:`${output}/activity-${label}.png`});
  await page.locator('[data-explore-destination=research]').click();await page.locator('.explore-stock-list').waitFor();await checkNav('research');
  assert.ok(page.url().includes('tab=research'));
  await page.locator('.explore-stock-open').first().click();await page.locator('.stock-workspace-tabs').waitFor();
  assert.ok(await page.locator('.stock-disclosure-links').evaluate(e=>e.getBoundingClientRect().bottom<=document.querySelector('.stock-workspace-tabs').getBoundingClientRect().top+1));
  await page.locator('[data-stock-disclosure=funds]').click();await page.locator('[data-board=funds][aria-pressed=true]').waitFor();await checkNav('activity');
  assert.ok(page.url().includes('ticker='));
  await page.locator('[data-explore-destination=creators]').click();await page.locator('.creators-content').waitFor();await checkNav('creators');
  await page.locator('[data-explore-destination=research]').click();await page.locator('.explore-stock-list').waitFor();await checkNav('research');
  await page.locator('[data-explore-destination=activity]').click();await page.locator('.radar-categories').waitFor();await checkNav('activity');
  for(const board of ['funds','political','company','insider']){await page.locator(`[data-board=${board}]`).click();await page.locator(`[data-board=${board}][aria-pressed=true]`).waitFor();}
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=explore&case=first-use`);await checkNav('activity');
  await page.locator('[data-explore-destination=research]').click();await page.locator('.explore-stock-open').first().waitFor();await checkNav('research');
  await page.locator('[data-explore-destination=creators]').click();await page.locator('.creator-discovery-preview').first().waitFor();await checkNav('creators');
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=today&case=today-dashboard&empty=1`);
  await page.locator('[data-tile=kindex] .today-macro-value').waitFor();
  assert.equal(await page.locator('.today-dashboard-metric').count(),6);
  assert.equal(await page.locator('[data-tile=kindex] .today-macro-value').innerText(),'2.04');
  const metrics=await page.locator('.today-dashboard-metric').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {tile:e.dataset.tile,x:r.x,y:r.y,bottom:r.bottom,width:r.width};}));
  const k=await page.locator('[data-tile=kindex] .today-macro-value').boundingBox();assert.ok(k.y+k.height<(width===320?548:width===390?648:900),'K value is visible before scrolling');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:`${output}/today-${label}.png`});
  await page.locator('.today-session-details>summary').click();assert.ok(await page.locator('[data-source-metric=kindex]').isVisible());
  assert.deepEqual(errors,[]);results.push({label,firstActivityY:first.y,metrics,status:'passed'});
 }catch(error){results.push({label,status:'failed',error:String(error),url:page.url(),errors});await page.screenshot({path:`${output}/failure-${label}.png`});}
 await context.close();
}
await browser.close();await writeFile(output+'/results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({total:results.length,failed:results.filter(r=>r.status!=='passed'),output},null,2));if(results.some(r=>r.status!=='passed'))process.exitCode=1;
