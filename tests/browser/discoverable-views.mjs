// Local synthetic data only. Run serve-product-focus.py before this acceptance check.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.QA_BASE||'http://127.0.0.1:8953';
const output=process.env.QA_OUTPUT||'/tmp/ducky-discoverable-views';
await mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
for(const [width,height] of [[320,600],[390,700],[820,900],[1440,900]]){
 for(const lang of ['zh','en'])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height},colorScheme:theme,hasTouch:width<500,isMobile:width<500,reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(8000);
  for(const route of ['watchlist','explore','boards']){
   const errors=[],label=[route,width,lang,theme].join('-');
   const onError=error=>errors.push(error.message);page.on('pageerror',onError);
   try{
    const fixture=route==='watchlist'?'watchlist-management':route==='explore'?'explore-grid':'ux-review';
    await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=${route}&case=${fixture}`);
    const selector=route==='watchlist'?'.watch-modes button':route==='explore'?'.explore-primary-tools>a':'.radar-categories button';
    await page.locator(selector).last().waitFor();
    await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
    const measurement=await page.evaluate(({selector,route})=>{
     const box=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
     const nodes=[...document.querySelectorAll(selector)];
     const first=document.querySelector(route==='watchlist'?'tbody tr':route==='explore'?'.explore-stock-row':'.radar-record');
     const nav=document.querySelector('.app-nav'),navBox=box(nav);
     const contentEnd=navBox.y>innerHeight/2?navBox.y:innerHeight;
     return {overflow:document.documentElement.scrollWidth>innerWidth+1,
      controls:nodes.map(node=>({text:node.textContent,...box(node),titleSize:parseFloat(getComputedStyle(node.querySelector('strong,.watch-mode-title')||node).fontSize)})),
      firstContent:first?box(first):null,contentHeight:contentEnd-document.querySelector('.app-top').getBoundingClientRect().bottom,
      visibleContentHeight:first?Math.max(0,contentEnd-box(first).y):0,
      visibleRows:[...document.querySelectorAll(route==='watchlist'?'tbody tr':route==='explore'?'.explore-stock-row':'.radar-record')].filter(node=>{const r=box(node);return r.y<contentEnd&&r.bottom>0;}).length};
    },{selector,route});
    assert.equal(measurement.overflow,false,label+' page overflow');
    assert.equal(measurement.controls.length,route==='explore'?3:4);
    for(const control of measurement.controls){
     assert.ok(control.height>=44&&control.width>=44,label+' touch target');
     assert.ok(control.x>=0&&control.x+control.width<=width+1,label+' hidden entry');
     assert.ok(control.bottom<height-50,label+' entry below fold');
     assert.ok(control.titleSize>=15,label+' small title');
    }
    assert.ok(measurement.visibleRows>=1&&measurement.visibleContentHeight>=48,label+' no readable record in first screen');
    await page.screenshot({path:`${output}/${label}.png`});
    if(route==='watchlist'){
     const reads=await page.evaluate(()=>JSON.parse(document.querySelector('#qa-status').textContent).requests.length);
     for(const mode of ['reading','metrics','heatmap','list']){
      const button=page.locator(`[data-mode=${mode}]`);await button.focus();await page.keyboard.press('Enter');
      assert.equal(await button.getAttribute('aria-pressed'),'true');
      assert.equal(await button.evaluate(node=>node===document.activeElement),true);
     }
     await page.waitForTimeout(220);
     const after=await page.evaluate(()=>JSON.parse(document.querySelector('#qa-status').textContent).requests.length);
     assert.equal(after,reads,'switching views adds no API requests');
     const input=page.locator('.watch-filter');await input.fill('NVDA');
     await page.locator('[data-mode=metrics]').click();assert.equal(await input.inputValue(),'NVDA');
     assert.equal(await page.locator('tbody tr').count(),1);
    }else if(route==='boards'){
     assert.equal(await page.locator('button[data-board=insider]').getAttribute('aria-pressed'),'true');
     for(const key of ['funds','political','company','all']){
      const button=page.locator(`button[data-board=${key}]`);await button.focus();await page.keyboard.press('Enter');
      await page.waitForTimeout(230);
      assert.equal(await button.getAttribute('aria-pressed'),'true');
      assert.equal(await button.evaluate(node=>node===document.activeElement),true);
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('board'),key);
     }
    }else{
     await page.locator('.explore-activity-entry').click();await page.locator('.radar-categories').waitFor();
     assert.equal(await page.locator('button[data-board=insider]').getAttribute('aria-pressed'),'true');
    }
    assert.deepEqual(errors,[]);results.push({label,status:'passed',...measurement});
   }catch(error){results.push({label,status:'failed',error:String(error),errors});await page.screenshot({path:`${output}/${label}-failure.png`});}
   page.off('pageerror',onError);
  }
  await context.close();
 }
}
await browser.close();await writeFile(`${output}/results.json`,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed'),output},null,2));
if(results.some(r=>r.status==='failed'))process.exitCode=1;
