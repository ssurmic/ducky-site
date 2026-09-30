// A real long reading must not turn a phone table row into a full-page paragraph.
import assert from 'node:assert/strict';
import {chromium,webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:8954',out=process.env.QA_OUTPUT||'/tmp/ducky-mobile-table-scroll';
await mkdir(out,{recursive:true});const results=[];
for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch();
 for(const [width,height] of [[320,600],[390,700],[430,700],[700,390],[1440,900]])for(const lang of ['zh','en'])for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<800,isMobile:width<800,colorScheme:theme,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const label=`${engine}-${width}-${lang}-${theme}`;
  try{
   await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=watchlist&case=watchlist-scroll`);
   await page.locator('[data-reading-anchor=ORCL] .watch-view-text').first().waitFor();await page.evaluate(()=>document.fonts.ready);
   const row=page.locator('[data-reading-anchor=ORCL]'),table=page.locator('.watch-table-scroll');
   const geometry=await page.evaluate(()=>{const row=document.querySelector('[data-reading-anchor=ORCL]'),box=document.querySelector('.watch-table-scroll');return {height:row.getBoundingClientRect().height,frozen:row.firstElementChild.getBoundingClientRect().width,viewport:box.clientWidth,columns:[...row.children].slice(2).map(e=>e.getBoundingClientRect().width),pageOverflow:document.documentElement.scrollWidth>innerWidth+1,verticalTableOverflow:box.scrollHeight>box.clientHeight+1};});
   assert.equal(geometry.pageOverflow,false);assert.equal(geometry.verticalTableOverflow,false,'page owns vertical scrolling');
   if(width<800){
    assert.ok(geometry.height<=260,`long row height ${geometry.height}`);
    assert.ok(geometry.columns.every(w=>w<=geometry.viewport-geometry.frozen+1),'one whole reading column fits beside stock');
    // The native table owns the horizontal gesture, the stock stays pinned.
    await page.evaluate(()=>{const main=document.querySelector('.app-main'),row=document.querySelector('[data-reading-anchor=ORCL]');main.scrollTop+=row.getBoundingClientRect().top-main.getBoundingClientRect().top-50;document.querySelector('.watch-table-scroll').scrollLeft=10000;});
    await page.waitForTimeout(80);
    const sticky=await row.locator('th').evaluate(e=>{const b=e.getBoundingClientRect(),s=e.closest('.watch-table-scroll').getBoundingClientRect();return {left:b.left,scrollLeft:s.left,hit:e.contains(document.elementFromPoint(b.left+b.width/2,b.top+20))};});
    assert.ok(Math.abs(sticky.left-sticky.scrollLeft)<=2&&sticky.hit,'stock identity stays fixed and unobscured');
    const native=await table.evaluate(e=>({touch:getComputedStyle(e).touchAction,left:e.scrollLeft}));assert.equal(native.touch,'auto');assert.ok(native.left>0);
    const targets=await row.locator('th .watch-stock-actions>a').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return {w:b.width,h:b.height};}));assert.ok(targets.every(b=>b.w>=44&&b.h>=44),'research actions keep full touch targets');
    const spillingLabels=await row.locator('th .watch-stock-actions>a').evaluateAll(es=>es.filter(a=>[...a.querySelectorAll('span')].some(s=>s.getBoundingClientRect().width>a.getBoundingClientRect().width+1)).map(a=>a.textContent));assert.deepEqual(spillingLabels,[],'action labels fit their own touch target');
    await page.screenshot({path:`${out}/${label}-table.png`});
    const opener=row.locator('.is-right .watch-view-open');const full=await row.locator('.is-right .watch-view-text').textContent();
    const at=await page.evaluate(()=>({top:document.querySelector('.app-main').scrollTop,left:document.querySelector('.watch-table-scroll').scrollLeft}));
    await opener.click();const dialog=page.getByRole('dialog');await dialog.waitFor();
    assert.match(await dialog.locator('h2').textContent(),/ORCL/);assert.equal(await dialog.locator('.watch-view-text').textContent(),full);
    const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1);
    assert.ok(await dialog.locator('.modal-close').isVisible());
    // The full reader can scroll independently while its ticker heading stays visible.
    await dialog.locator('.modal-body').evaluate(e=>e.scrollTop=e.scrollHeight);
    const titleVisible=await dialog.locator('h2').evaluate(e=>{const b=e.getBoundingClientRect();return b.top>=0&&b.bottom<innerHeight;});assert.ok(titleVisible);
    await page.screenshot({path:`${out}/${label}-reader.png`});
    await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
    const back=await page.evaluate(()=>({top:document.querySelector('.app-main').scrollTop,left:document.querySelector('.watch-table-scroll').scrollLeft,focus:document.activeElement.dataset.readingKey}));
    assert.equal(back.focus,'ORCL:view:right');assert.ok(Math.abs(at.top-back.top)<2);assert.ok(Math.abs(at.left-back.left)<2);
    // Chromium exposes native wheel input in mobile emulation; mobile WebKit
    // does not. Do not substitute a scripted scroll and call it a gesture test.
    if(engine==='chromium'){
     const r=await row.locator('td.is-right').boundingBox();await page.mouse.move(Math.min(width-25,r.x+r.width/2),Math.max(140,r.y+40));await page.mouse.wheel(0,160);await page.waitForTimeout(100);
     assert.ok(await page.locator('.app-main').evaluate((e,top)=>e.scrollTop>top,back.top),'vertical scrolling is not trapped');
    }
   }else{
    assert.equal(await row.locator('.watch-view-open:visible').count(),0,'desktop keeps its full inline reading');
    assert.ok(await row.locator('.watch-view-text').first().evaluate(e=>e.scrollHeight<=e.clientHeight+1));
   }
   assert.deepEqual(errors,[]);results.push({label,geometry,verticalGesture:width<800&&engine==='chromium'?'wheel passed':'not emulated'});
  }catch(error){results.push({label,error:String(error),errors});await page.screenshot({path:`${out}/${label}-failure.png`});}
  await context.close();
 }
 await browser.close();
}
await writeFile(out+'/results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({total:results.length,failures:results.filter(r=>r.error),out},null,2));if(results.some(r=>r.error))process.exitCode=1;
