// Browser acceptance for persistent research navigation and paired theme semantics.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:8953',output=process.env.QA_OUTPUT||'/tmp/ducky-professional-acceptance';
await mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
for(const width of [320,390,820,1440,1920])for(const lang of ['zh','en'])for(const theme of ['dark','light']){
 const context=await browser.newContext({viewport:{width,height:width===320?600:width===390?700:900},hasTouch:width<500,isMobile:width<500,colorScheme:theme,reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const label=`${width}-${lang}-${theme}`;
 try{
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=watchlist&case=watchlist-management`);
  await page.locator('.watch-compact-table tbody tr').nth(49).waitFor();await page.evaluate(()=>document.fonts.ready);
  const titleClear=await page.locator('h1').evaluate(e=>{const b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2));});
  assert.ok(titleClear,'initial page title must not be painted over by the sticky bar');
  const palette=await page.evaluate(()=>{
   const css=getComputedStyle(document.body),values={};
   // Resolve semantic colors through a normal DOM element, including var()/color-mix().
   const probe=document.createElement('span');document.body.append(probe);
   for(const key of ['text','muted','green','red','blue','accent-text','bg','surface','surface-2','control-border']){probe.style.color=`var(--${key})`;values[key]=getComputedStyle(probe).color;}
   probe.remove();return {values,font:css.fontFamily,ticker:getComputedStyle(document.querySelector('.ticker-symbol')).fontFamily};
  });
  const lum=s=>{const a=s.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
  const contrasts=[];for(const fg of ['text','muted','green','red','blue','accent-text'])for(const bg of ['bg','surface','surface-2']){const a=lum(palette.values[fg]),b=lum(palette.values[bg]),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);contrasts.push({fg,bg,ratio});assert.ok(ratio>=4.5,`${fg} on ${bg}: ${ratio}`);}
  for(const bg of ['surface','surface-2']){const a=lum(palette.values['control-border']),b=lum(palette.values[bg]);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=3,'control boundary contrast');}
  assert.equal(palette.font,palette.ticker,'stock identities share the reading typeface');
  const scroll=()=>page.evaluate(()=>document.querySelector('.app-main').scrollTop);
  await page.evaluate(()=>{document.querySelector('.app-main').scrollTop=950;document.querySelector('.watch-table-scroll').scrollLeft=120;});
  await page.waitForTimeout(100);
  const pinned=await page.locator('.watch-modes').evaluate(n=>{const b=n.getBoundingClientRect(),main=n.closest('.app-main').getBoundingClientRect();return {top:b.top,main:main.top,height:b.height,hit:n.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)),targets:[...n.querySelectorAll('button')].map(e=>e.getBoundingClientRect().height)};});
  assert.ok(pinned.top>=pinned.main&&pinned.top<=pinned.main+24,'switcher stays at scrollport top');assert.ok(pinned.hit,'switcher has clear pointer access');assert.ok(pinned.targets.every(h=>h>=44),'touch choices remain at least 44px');
  const top=await scroll(),left=await page.locator('.watch-table-scroll').evaluate(e=>e.scrollLeft);
  await page.screenshot({path:`${output}/watch-scroll-${label}.png`});
  // Use the visible pointer target: Locator.click scrolls sticky descendants toward their original flow position.
  const clickMode=async mode=>{const b=await page.locator(`[data-mode=${mode}]`).boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);};
  let indicatorRows;
  for(const mode of ['reading','metrics','heatmap']){
   await clickMode(mode);assert.equal(await page.locator(`[data-mode=${mode}]`).getAttribute('aria-pressed'),'true');
   if(mode==='metrics'){
    assert.equal(await page.locator('.watch-indicators-table thead th').count(),14);
    assert.equal(await page.locator('.watch-indicators-table .watch-overview-cell,.watch-indicators-table .watch-view-cell').count(),0);
    indicatorRows=await page.locator('.watch-indicators-table tbody tr').evaluateAll(rows=>rows.slice(0,10).map(row=>row.getBoundingClientRect().height));
    assert.ok(Math.max(...indicatorRows)<=150,'comparison rows stay compact without repeated analysis');
    if(width>=1920)assert.ok(await page.locator('.watch-table-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'wide desktop fits all indicator columns');
    assert.deepEqual(await page.locator('.watch-indicators-table .watch-sort-label').evaluateAll(nodes=>nodes.filter(e=>e.scrollWidth>e.getBoundingClientRect().width+1).map(e=>e.textContent)),[],'indicator column headings remain readable');
    assert.deepEqual(await page.locator('.watch-indicators-table .watch-signal-net').evaluateAll(nodes=>nodes.filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(e=>e.textContent)),[],'primary amounts and counts must not be clipped');
    await page.screenshot({path:`${output}/indicators-${label}.png`});
   }
  }
  await clickMode('list');assert.ok(Math.abs((await scroll())-top)<2,'list reading position restored');assert.equal(await page.locator('.watch-table-scroll').evaluate(e=>e.scrollLeft),left,'horizontal reading position restored');
  // Tab out of the pinned nav and down into the content: focus must stay uncovered.
  await page.locator('[data-mode=heatmap]').focus();
  for(let i=0;i<10;i++){await page.keyboard.press('Tab');const focus=await page.evaluate(()=>{const el=document.activeElement,b=el.getBoundingClientRect(),n=document.querySelector('.watch-modes').getBoundingClientRect(),m=document.querySelector('.app-main').getBoundingClientRect();return {tag:el.tagName,top:b.top,bottom:b.bottom,nav:n.bottom,main:m.bottom,inContent:document.querySelector('.watchlist-view').contains(el)&&!el.closest('.watch-modes')};});if(focus.inContent)assert.ok(focus.bottom>focus.nav&&focus.top<focus.main,`focus covered: ${JSON.stringify(focus)}`);}
  // Ready wall facts exercise prices and distances; the long-list fixture has missing walls.
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=watchlist&case=wall-consistency`);
  await page.locator('[data-mode=metrics]').click();
  await page.locator('.watch-indicators-table .watch-wall').first().waitFor();
  assert.deepEqual(await page.locator('.watch-indicators-table .watch-wall-kind,.watch-indicators-table .watch-wall .watch-metric-value,.watch-indicators-table .watch-wall-gap').evaluateAll(nodes=>nodes.filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(e=>e.textContent)),[],'wall labels, prices and distances stay complete');
  assert.ok(await page.locator('.watch-indicators-table tbody tr').evaluateAll(rows=>rows.every(row=>row.getBoundingClientRect().height<=150)),'ready wall facts retain compact rows');
  await page.evaluate(()=>document.querySelector('.watch-table-scroll').scrollLeft=2000);
  await page.screenshot({path:`${output}/indicator-walls-${label}.png`});
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=boards&case=ux-review`);await page.locator('.radar-activity-record').first().waitFor();
  assert.ok(await page.locator('h1').evaluate(e=>{const b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2));}),'activity title is unobscured before scrolling');
  await page.evaluate(()=>document.querySelector('.app-main').scrollTop=450);await page.waitForTimeout(100);
  const category=await page.locator('.radar-sidebar').evaluate(e=>{const b=e.getBoundingClientRect(),m=e.closest('.app-main').getBoundingClientRect();return {top:b.top,main:m.top,bottom:b.bottom,hit:e.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2))};});
  assert.ok(category.top>=category.main&&category.top<=category.main+24&&category.hit,'four source categories stay usable');
  await page.screenshot({path:`${output}/activity-scroll-${label}.png`});
  assert.deepEqual(errors,[]);results.push({label,pinned,category,indicatorRows,minContrast:Math.min(...contrasts.map(v=>v.ratio)),palette:palette.values});
 }catch(error){results.push({label,error:String(error),errors});await page.screenshot({path:`${output}/failure-${label}.png`});}
 await context.close();
}
await browser.close();await writeFile(output+'/results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({total:results.length,failed:results.filter(r=>r.error),output},null,2));if(results.some(r=>r.error))process.exitCode=1;
