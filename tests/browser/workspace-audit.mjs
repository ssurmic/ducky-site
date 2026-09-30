// Read-only synthetic route inventory. Real writes are never sent by the fixture.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const output=process.env.QA_OUTPUT||'/tmp/ducky-workspace-audit';
const base=process.env.QA_BASE||'http://127.0.0.1:8953';
await mkdir(output,{recursive:true});
const routes=process.env.QA_ROUTES?.split(',')||['today','watchlist','explore','calendar','creators','boards','stock/NVDA','evidence/NVDA','chart/NVDA','briefing','research','reports','alerts','profile','billing','login','register','forgot','opportunities','vibe','macro','screens','updates','record/sec%3Aux%3Abuy'];
const browser=await chromium.launch(),results=[];
const widths=process.env.QA_WIDTHS?.split(',').map(Number)||[320,390,820,1440];
for(const width of widths)for(const lang of ['zh','en'])for(const theme of ['dark','light']){
 const context=await browser.newContext({viewport:{width,height:Number(process.env.QA_HEIGHT)||(width===320?600:width===390?700:900)},hasTouch:width<500||process.env.QA_TOUCH==='1',isMobile:width<500||process.env.QA_TOUCH==='1',reducedMotion:'reduce'});
 const page=await context.newPage();
 for(const route of routes){
  const errors=[];const onError=error=>errors.push(error.message);page.on('pageerror',onError);
  const auth=['login','register','forgot'].includes(route)?'out':'in';
  const fixture=route==='today'?'today-dashboard':route==='explore'?'explore-grid':'ux-review';
  const label=[route.replaceAll('/','-'),width,lang,theme].join('-');
  try{
   await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=${route}&case=${fixture}&auth=${auth}`);
   await page.locator('.route-page h1').first().waitFor({timeout:5000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
   const state=await page.evaluate(()=>{
    const visible=e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length),box=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};};
    return {actual:location.hash,overflow:document.documentElement.scrollWidth>innerWidth+1,
     headings:[...document.querySelectorAll('.route-page h1,.route-page h2')].filter(visible).slice(0,12).map(e=>({text:e.textContent,tag:e.tagName,font:getComputedStyle(e).fontSize,line:getComputedStyle(e).lineHeight,...box(e)})),
     subtitles:[...document.querySelectorAll('h1+p,.focus-heading p,.calendar-intro,.view-intro')].filter(visible).map(e=>({text:e.textContent,font:getComputedStyle(e).fontSize,...box(e)})),
     buttons:[...document.querySelectorAll('.route-page button,.route-page summary')].filter(visible).slice(0,35).map(e=>({text:e.textContent.slice(0,70),...box(e)})),
     fontFamilies:[...new Set([...document.querySelectorAll('.route-page *')].filter(e=>visible(e)&&!e.children.length&&e.textContent.trim()&&!e.closest('pre,code,kbd')).map(e=>getComputedStyle(e).fontFamily))],
     charts:[...document.querySelectorAll('.tv-lightweight-charts canvas')].filter(visible).length,
     body:document.querySelector('.route-page').innerText.slice(0,2500)};
   });
   await page.screenshot({path:`${output}/${label}.png`});
   if(route==='calendar'){
    await page.locator('.cal-history-link').click();await page.waitForTimeout(100);
    await page.screenshot({path:`${output}/calendar-history-${width}-${lang}-${theme}.png`});
   }
   const problems=[];if(state.overflow)problems.push('page overflow');if(state.headings.some(h=>h.tag==='H1'&&h.font!==((width<=760?18:24)+'px')))problems.push('inconsistent page title');if(state.subtitles.some(p=>p.font!==((width<=760?12:13)+'px')))problems.push('inconsistent subtitle');if(route==='chart/NVDA'&&!state.charts)problems.push('missing chart canvas');
   results.push({label,...state,errors,...(problems.length?{error:problems.join('; ')}:{})});
  }catch(error){results.push({label,error:String(error),errors});await page.screenshot({path:`${output}/${label}-error.png`});}
  page.off('pageerror',onError);
 }
 await context.close();
}
await browser.close();await writeFile(output+'/results.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({total:results.length,failed:results.filter(r=>r.error||r.errors.length),output},null,2));
if(results.some(r=>r.error||r.errors.length))process.exitCode=1;
