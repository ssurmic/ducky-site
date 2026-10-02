// Loopback fixture acceptance for 「我的提醒」: six navigation destinations, day groups, direction rails, note
// details, filters, paging and the inbox fallback. Screenshots land in QA_OUTPUT for the acceptance report.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:8961',output=process.env.QA_OUTPUT||'/tmp/ducky-alert-feed';
await mkdir(output,{recursive:true});const browser=await chromium.launch(),results=[];
for(const width of [390,1440])for(const lang of ['zh','en'])for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:width===390?760:900},hasTouch:width<500,isMobile:width<500,colorScheme:theme,reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[],label=`${width}-${lang}-${theme}`;page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=alerts&case=data`);
  await page.locator('.alert-item').first().waitFor();
  assert.equal(await page.locator('.focus-nav a[data-route]').count(),6);
  assert.equal(await page.locator('.focus-nav a[data-route=alerts][aria-current=page]').count(),1);
  const nav=await page.locator('.focus-nav>a').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {h:r.height,w:r.width,x:r.x,right:r.right};}));
  assert.ok(nav.every(r=>r.h>=(width<500?44:36)&&r.x>=0&&r.right<=width+1),'navigation items stay on screen and tappable');
  assert.equal(await page.locator('.alert-item').count(),30);
  assert.ok((await page.locator('.alert-day').count())>=3);
  assert.equal(await page.locator('.alert-item.is-buy').count()>0,true);assert.equal(await page.locator('.alert-item.is-sell').count()>0,true);
  assert.ok(await page.locator('.focus-nav a[data-route=alerts] .nav-badge').count()<=1);
  const first=page.locator('.alert-item').first();
  assert.match(await first.locator('.alert-headline').innerText(),lang==='en'?/director buys \$3\.48M/:/董事买入 348 万美元/);
  await first.locator('.alert-note>summary').click();await first.locator('.alert-note-facts').waitFor();
  assert.ok((await first.locator('.alert-note-facts dd').count())>=4);
  const overflow=await page.locator('.alert-feed *').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width&&(r.left<-1||r.right>innerWidth+1);}).length);
  assert.equal(overflow,0,'no horizontal overflow');
  await page.screenshot({path:`${output}/feed-${label}.png`,fullPage:false});
  await page.locator('[data-alert-filter=insider]').click();await page.locator('[data-alert-filter=insider][aria-pressed=true]').waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('.alert-item')].every(n=>n.dataset.kind==='insider'));
  assert.ok(page.url().includes('kind=insider'));
  await page.locator('[data-alert-filter=all]').click();await page.waitForFunction(()=>document.querySelectorAll('.alert-item').length===30);
  await page.locator('[data-alert-more]').click();await page.waitForFunction(()=>document.querySelectorAll('.alert-item').length>30);
  await page.locator('[data-alert-tab=custom]').click();await page.locator('.alert-custom-panel h1').waitFor();
  assert.ok(page.url().includes('view=custom'));
  await page.screenshot({path:`${output}/custom-${label}.png`});
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=alerts&case=data&alerts=unavailable`);
  await page.locator('.alert-rollout, .alert-empty').first().waitFor();
  await page.screenshot({path:`${output}/fallback-${label}.png`});
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=today&case=data`);
  await page.locator('.focus-nav a[data-route=today][aria-current=page]').waitFor();
  assert.equal(await page.locator('.focus-nav a[data-route=alerts]').count(),1);
  assert.equal(errors.length,0,errors.join('\n'));
  results.push({label,ok:true});
 }catch(error){results.push({label,ok:false,error:String(error).slice(0,300)});await page.screenshot({path:`${output}/failure-${label}.png`}).catch(()=>{});}
 await context.close();
}
await browser.close();
console.log(JSON.stringify(results,null,1));
if(results.some(r=>!r.ok))process.exit(1);
