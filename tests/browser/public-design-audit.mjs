import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:8953',output=process.env.QA_OUTPUT||'/tmp/ducky-public-design';
await mkdir(output,{recursive:true});const browser=await chromium.launch(),results=[];
const routes=['','track-record/','trending/','ideas/','research-records/','disclaimer/','privacy/','idea/','404.html','research-map-preview/','creator-analysis-preview/','market-context-preview/','screener-preview/'];
for(const width of [320,390,1440])for(const lang of ['zh','en'])for(const theme of ['dark','light']){
 const context=await browser.newContext({viewport:{width,height:width===320?600:width===390?700:900},colorScheme:theme,hasTouch:width<500,isMobile:width<500,reducedMotion:'reduce'});
 await context.route('https://**/*',r=>r.abort());const page=await context.newPage();
 for(const route of routes){const label=[route.replace('/','')||'home',width,lang,theme].join('-');const errors=[];const handler=e=>errors.push(e.message);page.on('pageerror',handler);
  try{await page.goto(`${base}/${lang}/${route}`);await page.locator('h1').first().waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
   const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,heading:document.querySelector('h1').textContent,font:getComputedStyle(document.querySelector('h1')).fontFamily,bodyFont:getComputedStyle(document.body).fontFamily}));
   await page.screenshot({path:`${output}/${label}.png`});
   results.push({label,...state,errors,...(state.overflow?{error:'page overflow'}:{})});
  }catch(e){results.push({label,error:String(e),errors});}page.off('pageerror',handler);
 }await context.close();
}await browser.close();await writeFile(output+'/results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({total:results.length,failed:results.filter(r=>r.error||r.errors.length),output},null,2));if(results.some(r=>r.error||r.errors.length))process.exitCode=1;
