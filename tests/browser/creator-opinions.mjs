// Read-only loopback QA: synthetic reviewed records, no credentials or production calls.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:8947',output=process.env.QA_OUTPUT||'/tmp/ducky-native-opinions-browser';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));await mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
async function align(page,selector){await page.locator(selector).first().evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));}
try{for(const width of [320,390,1440])for(const lang of ['zh','en'])for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:width<700?700:900},hasTouch:width<700,colorScheme:theme});
 const page=await context.newPage(),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():(external.push(route.request().url()),route.abort()));
 for(const route of ['today','explore','stock/NVDA']){
  const tag=route.replace('/','-');await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&case=native-opinions#/${route}`);
  await page.locator('.creator-opinion').first().waitFor();
  await page.waitForFunction(()=>{let node=document.querySelector('.creator-opinions');while(node){if(Number(getComputedStyle(node).opacity)!==1)return false;node=node.parentElement;}return true;});
  if(route==='explore')await page.screenshot({path:`${output}/${lang}-${theme}-${width}-${tag}-initial.png`,animations:'disabled'});
  await align(page,'.creator-opinions');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const initial=await page.locator('.creator-opinion').count();assert.equal(initial,route==='today'?3:route==='explore'?4:2);
  if(route==='stock/NVDA'){
   assert.equal(await page.locator('.creator-opinion.is-bull').count(),1);assert.equal(await page.locator('.creator-opinion.is-bear').count(),1);
   assert.deepEqual(await page.locator('.opinion-subject a').allTextContents(),['NVDA','NVDA']);
  }
  if(route==='today'){
   assert.equal(await page.locator('.today-creators [data-post="90"]').count(),0);
   assert.equal(await page.locator('.today-creators [data-post="1"]').count(),1);
   assert.equal(await page.locator('.today-creators [data-post="2"]').count(),1);
   assert.equal(await page.locator('.creator-opinions .opinion-subject a').count(),0);
  }
  assert.match(await page.locator('.opinion-original').first().getAttribute('href'),/&t=32s$/);
  assert.match(await page.locator('.opinion-original').first().textContent(),/0:32/);
  await page.screenshot({path:`${output}/${lang}-${theme}-${width}-${tag}.png`,animations:'disabled'});
  const details=page.locator('.opinion-records').first();await details.locator(':scope > summary').click();
  const records=await details.locator('li').count();assert.equal(records,route.startsWith('stock')?1:2);
  await page.locator('.creator-opinions-heading button').click();await page.waitForFunction(()=>!document.querySelector('.creator-opinions-heading button').disabled);
  assert.equal(await page.locator('.opinion-records').first().getAttribute('open'),'');
  await align(page,'.creator-opinions');await page.screenshot({path:`${output}/${lang}-${theme}-${width}-${tag}-sources.png`,animations:'disabled'});
  const measure=await page.locator('.creator-opinions').evaluate(section=>({
   overflow:document.documentElement.scrollWidth>innerWidth,
   claimFont:getComputedStyle(section.querySelector('.opinion-claim')).fontSize,
   rows:[...section.querySelectorAll('.creator-opinion')].map(n=>Math.round(n.getBoundingClientRect().height)),
   targets:[...section.querySelectorAll('button,a,summary')].filter(n=>n.getBoundingClientRect().height>0).map(n=>({text:n.textContent,height:n.getBoundingClientRect().height})),
   opacity:getComputedStyle(document.querySelector('#view')).opacity
  }));assert.equal(measure.overflow,false);assert.equal(measure.opacity,'1');assert.ok(measure.targets.every(target=>target.height>=44),JSON.stringify(measure.targets));
  if(route==='explore'){
   await page.locator('.creator-opinions [data-reading-key="opinions:more"]').click();assert.equal(await page.locator('.creator-opinion').count(),6);
   assert.equal(await page.locator('.creator-opinions [data-reading-key="opinions:fewer"]').isVisible(),true);
   const company=page.locator('.creator-opinions .opinion-subject a').first();assert.equal(await company.getAttribute('href'),'#/stock/NVDA?from=explore');
  }
  if(route==='today'){
   await details.locator(':scope > summary').click();await align(page,'.creator-opinion:last-child');
   await page.screenshot({path:`${output}/${lang}-${theme}-${width}-today-mixed.png`,animations:'disabled'});
  }
  const log=await page.locator('#qa-status').textContent();if(log){const audit=JSON.parse(log);assert.ok(audit.requests.every(r=>r.method==='GET'));}
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);results.push({width,lang,theme,route,initial,records,measure});
 }
 await context.close();
}
 for(const state of ['unavailable','empty']){
  const page=await browser.newPage({viewport:{width:390,height:700}});
  await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  await page.goto(`${base}/qa-frame?lang=en&theme=dark&case=native-opinions&opinions=${state}#/today`);
  await page.locator('.today-creators').waitFor();await page.waitForFunction(()=>!document.querySelector('.creator-opinions-heading button').disabled);
  assert.equal(await page.locator('.creator-opinion').count(),0);assert.equal(await page.locator('.today-creators li').count(),2);
  assert.equal(await page.locator('.opinions-empty').count(),state==='empty'?1:0);
  const height=await page.locator('.creator-opinions').evaluate(n=>n.getBoundingClientRect().height);assert.ok(height<180,height);
  await align(page,'.creator-opinions');await page.screenshot({path:`${output}/en-dark-390-today-${state}.png`,animations:'disabled'});
  results.push({width:390,lang:'en',theme:'dark',route:'today',state,height});await page.close();
 }
}finally{await browser.close();await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify({passed:results.length,output}));
