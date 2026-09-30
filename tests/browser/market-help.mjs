import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:8954',output=process.env.QA_OUTPUT||'/tmp/ducky-market-help';
await mkdir(output,{recursive:true});const browser=await chromium.launch(),results=[];
for(const [width,height] of [[320,600],[390,700],[820,900],[1440,900],[700,390]])for(const lang of ['zh','en'])for(const theme of ['dark','light']){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<800,isMobile:width<800,colorScheme:theme,reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[],label=`${width}-${lang}-${theme}`;page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=today&case=today-dashboard&empty=1`);
  await page.locator('.today-metric-heading button').first().waitFor();
  assert.equal(await page.locator('.today-metric-heading button').count(),6);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const buttons=await page.locator('.today-metric-heading button').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height};}));assert.ok(buttons.every(r=>r.width>=44&&r.height>=44));
  const k=await page.locator('[data-tile=kindex] .today-macro-value').boundingBox();
  if(width===320||width===390)assert.ok(k.y+k.height<height-52,'K value remains above bottom navigation');
  await page.screenshot({path:`${output}/cards-${label}.png`});
  for(const key of ['liquidity','yield','vix','fng','kindex','term']){
   const button=page.locator(`[data-reading-key="macro-help:${key}"]`);
   await button.click();const dialog=page.getByRole('dialog');await dialog.waitFor();
   const title=await page.locator('#modal-title').innerText();assert.ok(title.includes(lang==='zh'?'是什么':'About')||key==='liquidity');
   assert.ok((await dialog.innerText()).length>100);
   assert.ok(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;}));
   if(key==='kindex')await page.screenshot({path:`${output}/help-${label}.png`});
   await page.keyboard.press('Shift+Tab');assert.ok(await dialog.evaluate(e=>e.contains(document.activeElement)));
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.ok(await button.evaluate(e=>e===document.activeElement));
   await button.press('Enter');await dialog.waitFor();await dialog.locator('.modal-close').click();await dialog.waitFor({state:'hidden'});
   assert.ok(await button.evaluate(e=>e===document.activeElement));
  }
  assert.deepEqual(errors,[]);results.push({label,status:'passed',buttons,kValueBottom:k.y+k.height});
 }catch(error){results.push({label,status:'failed',error:String(error),errors});await page.screenshot({path:`${output}/failure-${label}.png`});}
 await context.close();
}
await browser.close();await writeFile(output+'/results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({total:results.length,failed:results.filter(r=>r.status!=='passed'),output},null,2));if(results.some(r=>r.status!=='passed'))process.exitCode=1;
