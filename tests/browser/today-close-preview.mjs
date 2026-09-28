// Read-only, loopback synthetic acceptance; no account or provider requests.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:8931',output=process.env.QA_OUTPUT||'/tmp/ducky-close-preview-browser';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));await mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const width of [320,390,1440])for(const lang of ['zh','en'])for(const theme of ['light','dark']){
  const height=width<700?650:900,context=await browser.newContext({viewport:{width,height},hasTouch:width<700,colorScheme:theme});
  const page=await context.newPage(),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(base).origin){external.push(route.request().url());return route.abort();}return route.continue();});
  // Freeze the date to the synthetic source session; this is not a claim about a live market.
  await page.clock.setFixedTime(new Date('2026-09-28T20:04:00Z'));
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=today&case=today-close-preview`);
  await page.locator('.today-preview-event').first().waitFor();
  await page.waitForFunction(()=>{let node=document.querySelector('.today-digest');while(node){if(Number(getComputedStyle(node).opacity)!==1)return false;node=node.parentElement;}return true;});
  assert.equal(await page.locator('.today-preview-event').count(),8);
  assert.equal(await page.locator('.today-digest-archive').count(),0);
  const initial=await page.evaluate(()=>{
    const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {y:r.y,bottom:r.bottom,height:r.height};};
    const ancestorOpacity=[];let node=document.querySelector('.today-digest');while(node){ancestorOpacity.push(Number(getComputedStyle(node).opacity));node=node.parentElement;}
    return {overflow:document.documentElement.scrollWidth>innerWidth,ancestorOpacity,digest:box('.today-digest'),preview:box('.today-preview'),
      firstEvent:box('.today-preview-event'),main:box('.app-main'),font:getComputedStyle(document.querySelector('.today-preview-event')).fontSize};
  });assert.equal(initial.overflow,false);assert.ok(initial.ancestorOpacity.every(value=>value===1));
  await page.screenshot({path:`${output}/${lang}-${theme}-${width}-initial.png`,animations:'disabled'});
  const more=page.locator('.today-preview-more');await more.locator(':scope > summary').click();assert.equal(await more.getAttribute('open'),'');
  const basis=more.locator('.today-preview-basis').last();await basis.locator('summary').click();
  assert.equal(await basis.getAttribute('open'),'');assert.equal(await basis.locator('a').count(),2);
  assert.equal(await page.locator('.today-preview-calendar').getAttribute('href'),'#/calendar?date=2026-09-29');
  await page.locator('.today-preview').scrollIntoViewIfNeeded();
  const targets=await page.locator('.today-preview summary,.today-preview a').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height>0).map(n=>({height:n.getBoundingClientRect().height,text:n.textContent})));
  assert.ok(targets.every(t=>t.height>=44),JSON.stringify(targets));
  await page.screenshot({path:`${output}/${lang}-${theme}-${width}-expanded.png`,animations:'disabled'});
  await page.locator('.today-macro-refresh button').click();assert.equal(await more.getAttribute('open'),'');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  results.push({width,height,lang,theme,initial,events:8,tapTargets:targets.length,errors,external});await context.close();
}}finally{await browser.close();await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify({passed:results.length,output}));
